
// Suscripciones: factura subscription:{plan} → al pagar, activar tenant

import { normalizePlan, isPaidPlan, getEffectivePlanPrice } from './payment-config';
import { enqueueNotification } from './notificationQueue';
import logger from './logger';
import { getClient } from '../database';

const SUBSCRIPTION_PREFIX = 'subscription:';

/**
 * @param {string} plan
 * @returns {string}
 */
function subscriptionDescription(plan) {
  return `${SUBSCRIPTION_PREFIX}${normalizePlan(plan)}`;
}

/**
 * @param {string} description
 * @returns {string | null}
 */
function parseSubscriptionPlan(description) {
  if (!description || !description.startsWith(SUBSCRIPTION_PREFIX)) return null;
  const plan = normalizePlan(description.slice(SUBSCRIPTION_PREFIX.length).trim().split(/[|\s]/)[0]);
  return isPaidPlan(plan) ? plan : null;
}

/**
 * Cuenta los ciclos de suscripción pagados del tenant (para la promoción de lanzamiento).
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {number} tenantId
 * @returns {Promise<number>}
 */
async function getPaidInvoiceCount(query, tenantId) {
  const result = await query(
    `SELECT COUNT(*) AS total
     FROM invoices
     WHERE tenant_id = $1 AND status = 'paid'
       AND (description LIKE $2 OR description LIKE 'Suscripción mensual - Plan %')`,
    [tenantId, `${SUBSCRIPTION_PREFIX}%`]
  );
  return parseInt(result.rows[0].total, 10) || 0;
}

/**
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {{ description: string, tenant_id: number }} invoice
 * @returns {Promise<boolean>}
 */
async function notifySubscriptionActivated(query: any, tenantId: number, plan: string) {
  try {
    const tenantResult = await query(
      `SELECT business_name, notification_email, billing_email, smtp_email, smtp_password
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    const tenant = tenantResult.rows[0];
    const recipient = tenant?.billing_email || tenant?.notification_email;
    if (!tenant || !recipient) return;

    await enqueueNotification({
      type: 'email',
      to: recipient,
      subject: `✅ Plan ${plan} activado - ${tenant.business_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#10b981">✅ Suscripción activada</h2>
          <p>El pago fue confirmado y el plan <strong>${plan}</strong> ya está activo para <strong>${tenant.business_name}</strong>.</p>
          <p>Los módulos y límites incluidos en tu tarjeta de precios fueron habilitados automáticamente.</p>
          <p style="color:#6b7280;font-size:13px">Si necesitás ayuda, respondé este correo o contactá al soporte.</p>
        </div>`,
      tenantId,
      smtpEmail: tenant.smtp_email || process.env.SMTP_USER,
      smtpPass: tenant.smtp_password || process.env.SMTP_PASS,
      priority: 'high',
      data: { business_name: tenant.business_name },
    });
  } catch (err: any) {
    // La activación no debe revertirse por un fallo de email.
    logger.error('Error enviando confirmación de suscripción', { tenantId, plan, error: err.message });
  }
}

/**
 * Activa el plan y materializa sus permisos al confirmarse una factura pagada.
 * La operación es idempotente para reintentos de MercadoPago, Stripe o pago manual.
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {{ id: number, tenant_id: number, description: string, amount?: number|string, payment_method?: string }} invoice
 * @param {{ provider?: string, providerReference?: string }} [payment]
 * @returns {Promise<boolean>}
 */
async function activateTenantFromPaidInvoice(query: any, invoice: any, payment: any = {}) {
  const plan = parseSubscriptionPlan(invoice.description);
  if (!plan) return false;

  const provider = payment.provider || invoice.payment_method || 'unknown';
  const providerReference = payment.providerReference || null;
  const client = await getClient();
  let createdSubscription = false;
  try {
    await client.query('BEGIN');
    const subscriptionResult = await client.query(
      `INSERT INTO subscriptions
         (tenant_id, invoice_id, plan_name, status, provider, provider_reference, amount, currency, starts_at, updated_at)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (invoice_id) DO UPDATE SET
         plan_name = EXCLUDED.plan_name,
         status = 'active',
         provider = EXCLUDED.provider,
         provider_reference = COALESCE(EXCLUDED.provider_reference, subscriptions.provider_reference),
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, (xmax = 0) AS inserted`,
      [invoice.tenant_id, invoice.id, plan, provider, providerReference, invoice.amount || null, payment.currency || 'UYU']
    );
    const subscriptionId = subscriptionResult.rows[0]?.id;
    createdSubscription = subscriptionResult.rows[0]?.inserted === true;

    await client.query(
      `UPDATE tenants
       SET plan = $1, status = 'active', subscription_status = 'active', trial_end_date = NULL,
           last_payment_date = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [plan, invoice.tenant_id]
    );

    await client.query('DELETE FROM tenant_permissions WHERE tenant_id = $1', [invoice.tenant_id]);
    await client.query(
      `INSERT INTO tenant_permissions (tenant_id, feature_code, enabled, limit_value, subscription_id)
       SELECT $1, feature_code, enabled, limit_value, $3
       FROM plan_feature_permissions
       WHERE plan_name = $2`,
      [invoice.tenant_id, plan, subscriptionId || null]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (createdSubscription) {
    await notifySubscriptionActivated(query, invoice.tenant_id, plan);
  }
  return true;
}

/**
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @returns {Promise<string>}
 */
async function nextInvoiceNumber(query) {
  const count = await query('SELECT COUNT(*) FROM invoices');
  const n = parseInt(count.rows[0].count, 10) + 1;
  return `INV-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`;
}

/**
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {(text: string, params?: any[]) => Promise<any>} queryOne
 * @param {number} tenantId
 * @param {string} plan
 * @param {number|string} planPrice
 * @returns {Promise<Object>}
 */
async function getOrCreateSubscriptionInvoice(query, queryOne, tenantId, plan, planPrice) {
  let invoice = await queryOne(
    `SELECT * FROM invoices
     WHERE tenant_id = $1 AND status = 'pending' AND description LIKE $2
     ORDER BY issue_date DESC LIMIT 1`,
    [tenantId, `${SUBSCRIPTION_PREFIX}%`]
  );

  if (!invoice) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const invoiceNumber = await nextInvoiceNumber(query);
    const result = await query(
      `INSERT INTO invoices (tenant_id, invoice_number, amount, description, due_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [tenantId, invoiceNumber, planPrice, subscriptionDescription(plan), dueDate]
    );
    return result.rows[0];
  }

  const currentPlan = parseSubscriptionPlan(invoice.description);
  if (currentPlan !== plan || parseFloat(invoice.amount) !== parseFloat(planPrice)) {
    await query(
      `UPDATE invoices SET amount = $1, description = $2 WHERE id = $3`,
      [planPrice, subscriptionDescription(plan), invoice.id]
    );
    invoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoice.id]);
  }

  return invoice;
}

export {
  SUBSCRIPTION_PREFIX,
  subscriptionDescription,
  parseSubscriptionPlan,
  activateTenantFromPaidInvoice,
  getOrCreateSubscriptionInvoice,
  getPaidInvoiceCount,
  getEffectivePlanPrice,
};
