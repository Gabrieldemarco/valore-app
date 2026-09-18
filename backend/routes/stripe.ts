import { Router } from 'express';
import { body } from 'express-validator';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { validate, authenticateStaff, authenticateSuperAdmin } from '../middleware';
import { getOrCreateSubscriptionInvoice, activateTenantFromPaidInvoice } from '../services/billing';
import { constructWebhookEvent, retrieveSession } from '../services/stripe-client';

const SUBSCRIPTION_PREFIX = 'subscription:';

async function handleCheckoutCompleted(session: any) {
  if (!session || (session.payment_status && session.payment_status !== 'paid')) return;
  const metadata = session.metadata || {};
  const invoiceId = parseInt(metadata.invoice_id, 10);
  if (!invoiceId) {
    logger.warn('Webhook Stripe: sesión sin invoice_id', { sessionId: session.id });
    return;
  }

  const invoice = await queryOne('SELECT id, amount, status, description FROM invoices WHERE id = $1', [invoiceId]);
  if (!invoice) return;
  if (invoice.status === 'paid') return;

  const sessionId = session.id || '';
  const fullInvoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);

  let upgraded = false;
  if (fullInvoice) {
    upgraded = await activateTenantFromPaidInvoice(query, fullInvoice);
  }

  await query(
    `UPDATE payments SET status = 'paid', mp_payment_id = $1, raw_payload = COALESCE(raw_payload::jsonb, '{}'::jsonb) || $2::jsonb WHERE invoice_id = $3 AND method = 'stripe'`,
    [sessionId, JSON.stringify(session), invoiceId]
  );
  await query(
    `UPDATE invoices SET status = 'paid', paid_date = NOW(), payment_method = 'stripe' WHERE id = $1`,
    [invoiceId]
  );

  if (upgraded && fullInvoice) {
    logger.info('Plan activado tras pago Stripe', { tenantId: fullInvoice.tenant_id, invoiceId, sessionId });
  }
}

function parseSubscriptionPlan(description?: string | null) {
  if (!description || !description.startsWith(SUBSCRIPTION_PREFIX)) return null;
  const plan = description.slice(SUBSCRIPTION_PREFIX.length).trim().split(/[|\s]/)[0];
  if (plan === 'pro' || plan === 'enterprise') return plan;
  return null;
}

/**
 * @param {(invoice: any, tenant: any, req: import('express').Request, opts?: any) => Promise<any>} createStripeCheckout
 * @param {Object<string, any>} PLANS
 * @returns {import('express').Router}
 */
export default function createStripeRouter(createStripeCheckout, PLANS) {
  const router = Router();

  async function insertStripePayment(invoice, tenant) {
    await query(
      `INSERT INTO payments (invoice_id, tenant_id, amount, currency, method, status, raw_payload)
       VALUES ($1, $2, $3, $4, 'stripe', 'pending', $5)`,
      [invoice.id, tenant.id, invoice.amount, (process.env.STRIPE_CURRENCY || 'usd').toUpperCase(), JSON.stringify({ provider: 'stripe' })]
    );
  }

  router.post('/payments/stripe/subscribe', authenticateStaff, [
    body('plan').optional().isIn(['pro', 'enterprise']).withMessage('Plan no válido'),
  ], validate, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ error: 'Stripe no está configurado. Contactá al administrador.' });
      }
      const plan = (req.body.plan || 'pro').toLowerCase();
      if (!PLANS[plan] || plan === 'free') return res.status(400).json({ error: 'Plan no válido' });

      const tenant = await queryOne('SELECT id, plan, status, business_name, slug FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
      if (tenant.plan === plan && tenant.status === 'active') {
        return res.status(400).json({ error: 'Ya tenés este plan activo' });
      }

      const invoice = await getOrCreateSubscriptionInvoice(query, queryOne, req.user.tenant_id, plan, PLANS[plan].price_usd);
      const session = await createStripeCheckout(invoice, tenant, req, { plan, returnPath: '/staff/dashboard' });
      await insertStripePayment(invoice, tenant);

      res.json({
        checkout_url: session.url,
        sessionId: session.id,
        invoiceId: invoice.id,
        plan,
        planName: PLANS[plan].name,
        amount: PLANS[plan].price_usd || PLANS[plan].price,
        currency: (process.env.STRIPE_CURRENCY || 'usd').toUpperCase(),
      });
    } catch (err: any) {
      logger.error('Error al crear pago Stripe suscripción', { error: err.message });
      res.status(500).json({ error: 'Error al iniciar el pago con Stripe' });
    }
  });

  router.post('/payments/stripe/invoices/:id', authenticateStaff, [
    body('id').isInt().withMessage('invoiceId inválido'),
  ], validate, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ error: 'Stripe no está configurado. Contactá al administrador.' });
      }
      const invoiceId = parseInt(req.params.id, 10);
      const invoice = await queryOne('SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2', [invoiceId, req.user.tenant_id]);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
      if (invoice.status === 'paid') return res.status(400).json({ error: 'Factura ya pagada' });

      const tenant = await queryOne('SELECT id, business_name, slug FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

      const session = await createStripeCheckout(invoice, tenant, req, {});
      await insertStripePayment(invoice, tenant);

      res.json({ checkout_url: session.url, sessionId: session.id });
    } catch (err: any) {
      logger.error('Error creando pago Stripe factura', { error: err.message });
      res.status(500).json({ error: 'Error al iniciar el pago con Stripe' });
    }
  });

  router.post('/payments/stripe/create', authenticateSuperAdmin, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ error: 'Stripe no está configurado. Contactá al administrador.' });
      }
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ error: 'invoiceId es requerido' });

      const invoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
      if (invoice.status === 'paid') return res.status(400).json({ error: 'Factura ya pagada' });

      const tenant = await queryOne('SELECT id, business_name, slug FROM tenants WHERE id = $1', [invoice.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

      const session = await createStripeCheckout(invoice, tenant, req, { returnPath: '/admin/dashboard' });
      await insertStripePayment(invoice, tenant);

      res.json({ checkout_url: session.url, sessionId: session.id });
    } catch (err: any) {
      logger.error('Error creando pago Stripe superadmin', { error: err.message });
      res.status(500).json({ error: 'Error al crear el pago con Stripe' });
    }
  });

  router.get('/payments/stripe/test', (req, res) => {
    res.json({
      status: 'ok',
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      environment: process.env.STRIPE_SECRET_KEY ? 'live' : 'none',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

/**
 * Handler RAW del webhook de Stripe (express.raw). Exportado para montarse ANTES del json parser global.
 */
export async function handleStripeWebhook(req: any, res: any) {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).send('Sin firma');
    const event = constructWebhookEvent(req.body, sig);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data?.object);
        break;
      default:
        logger.info('Webhook Stripe: evento no manejado', { type: event.type });
    }
    return res.status(200).send('OK');
  } catch (err: any) {
    logger.error('Error en webhook Stripe', { error: err.message });
    return res.status(400).send('ERROR');
  }
}

export { parseSubscriptionPlan, retrieveSession };