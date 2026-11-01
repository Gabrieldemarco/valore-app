import { Router } from 'express';
import { body, param } from 'express-validator';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { validate, authenticateStaff, authenticateSuperAdmin } from '../middleware';
import { getOrCreateSubscriptionInvoice, activateTenantFromPaidInvoice, getPaidInvoiceCount, getEffectivePlanPrice } from '../services/billing';
import { normalizePlan, isPaidPlan, STRIPE_CURRENCY } from '../services/payment-config';
import { constructWebhookEvent, retrieveSession, isConfigured as isStripeConfigured } from '../services/stripe-client';

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
  const paidAmount = session.amount_total != null
    ? Number(session.amount_total) / 100
    : Number(invoice.amount);
  const paidCurrency = (session.currency || STRIPE_CURRENCY).toUpperCase();
  const fullInvoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);

  let upgraded = false;
  if (fullInvoice) {
    upgraded = await activateTenantFromPaidInvoice(query, { ...fullInvoice, amount: paidAmount }, {
      provider: 'stripe',
      providerReference: session.id,
      currency: paidCurrency,
    });
  }

  await query(
    `UPDATE payments SET status = 'paid', mp_payment_id = $1, amount = $2, currency = $3, raw_payload = COALESCE(raw_payload::jsonb, '{}'::jsonb) || $4::jsonb WHERE invoice_id = $5 AND method = 'stripe'`,
    [sessionId, paidAmount, paidCurrency, JSON.stringify(session), invoiceId]
  );
  await query(
    `UPDATE invoices SET amount = $1, status = 'paid', paid_date = NOW(), payment_method = 'stripe' WHERE id = $2`,
    [paidAmount, invoiceId]
  );

  if (upgraded && fullInvoice) {
    logger.info('Plan activado tras pago Stripe', { tenantId: fullInvoice.tenant_id, invoiceId, sessionId });
  }
}

function parseSubscriptionPlan(description?: string | null) {
  if (!description || !description.startsWith(SUBSCRIPTION_PREFIX)) return null;
  const plan = normalizePlan(description.slice(SUBSCRIPTION_PREFIX.length).trim().split(/[|\s]/)[0]);
  return isPaidPlan(plan) ? plan : null;
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
      [invoice.id, tenant.id, invoice.amount, STRIPE_CURRENCY.toUpperCase(), JSON.stringify({ provider: 'stripe' })]
    );
  }

  async function getStripeInvoicePlanAmount(invoice, tenant) {
    let plan = parseSubscriptionPlan(invoice.description);
    if (!plan && /^suscripción mensual - plan /i.test(invoice.description || '')) {
      plan = normalizePlan(tenant.plan);
    }
    if (!plan || !isPaidPlan(plan) || !PLANS[plan]) return null;

    const paidCycles = await getPaidInvoiceCount(query, tenant.id);
    const amount = getEffectivePlanPrice(PLANS[plan], paidCycles).price_usd;
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  router.post('/payments/stripe/subscribe', authenticateStaff, [
    body('plan').isIn(['basico', 'estandar', 'premium', 'pro', 'enterprise']).withMessage('Plan no válido'),
  ], validate, async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ error: 'Stripe no está configurado correctamente. El administrador debe usar una clave secreta sk_live_ o sk_test_.' });
      }
      const plan = normalizePlan(req.body.plan);
      if (!PLANS[plan] || plan === 'free') return res.status(400).json({ error: 'Plan no válido' });

      const tenant = await queryOne('SELECT id, plan, status, business_name, slug FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
      if (tenant.plan === plan && tenant.status === 'active') {
        return res.status(400).json({ error: 'Ya tenés este plan activo' });
      }

      const paidCycles = await getPaidInvoiceCount(query, req.user.tenant_id);
      const effective = getEffectivePlanPrice(PLANS[plan], paidCycles);

      const stripeCurrency = STRIPE_CURRENCY.toUpperCase();
      const invoiceAmount = stripeCurrency === 'USD' ? (effective.price_usd ?? effective.price) : effective.price;
      const invoice = await getOrCreateSubscriptionInvoice(query, queryOne, req.user.tenant_id, plan, invoiceAmount);
      const session = await createStripeCheckout(invoice, tenant, req, { plan, returnPath: '/staff/dashboard' });
      await insertStripePayment(invoice, tenant);

      res.json({
        checkout_url: session.url,
        sessionId: session.id,
        invoiceId: invoice.id,
        plan,
        planName: PLANS[plan].name,
        amount: invoiceAmount || PLANS[plan].price,
        currency: stripeCurrency,
      });
    } catch (err: any) {
      logger.error('Error al crear pago Stripe suscripción', { error: err.message });
      res.status(500).json({ error: 'Error al iniciar el pago con Stripe' });
    }
  });

  router.post('/payments/stripe/invoices/:id', authenticateStaff, [
    param('id').isInt().withMessage('invoiceId inválido'),
  ], validate, async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ error: 'Stripe no está configurado correctamente. El administrador debe usar una clave secreta sk_live_ o sk_test_.' });
      }
      const invoiceId = parseInt(req.params.id, 10);
      const invoice = await queryOne('SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2', [invoiceId, req.user.tenant_id]);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
      if (invoice.status === 'paid') return res.status(400).json({ error: 'Factura ya pagada' });

      const tenant = await queryOne('SELECT id, business_name, slug, plan FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

      const invoiceAmount = await getStripeInvoicePlanAmount(invoice, tenant);
      if (invoiceAmount === null) {
        return res.status(400).json({ error: 'Stripe solo puede pagar facturas de planes con precio USD configurado' });
      }

      const session = await createStripeCheckout({ ...invoice, amount: invoiceAmount }, tenant, req, {
        plan: parseSubscriptionPlan(invoice.description) || normalizePlan(tenant.plan),
      });
      await insertStripePayment({ ...invoice, amount: invoiceAmount }, tenant);

      res.json({ checkout_url: session.url, sessionId: session.id, amount: invoiceAmount, currency: STRIPE_CURRENCY.toUpperCase() });
    } catch (err: any) {
      logger.error('Error creando pago Stripe factura', { error: err.message });
      res.status(500).json({ error: 'Error al iniciar el pago con Stripe' });
    }
  });

  router.post('/payments/stripe/create', authenticateSuperAdmin, async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ error: 'Stripe no está configurado correctamente. El administrador debe usar una clave secreta sk_live_ o sk_test_.' });
      }
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ error: 'invoiceId es requerido' });

      const invoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
      if (invoice.status === 'paid') return res.status(400).json({ error: 'Factura ya pagada' });

      const tenant = await queryOne('SELECT id, business_name, slug, plan FROM tenants WHERE id = $1', [invoice.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

      const invoiceAmount = await getStripeInvoicePlanAmount(invoice, tenant);
      if (invoiceAmount === null) {
        return res.status(400).json({ error: 'Stripe solo puede pagar facturas de planes con precio USD configurado' });
      }

      const session = await createStripeCheckout({ ...invoice, amount: invoiceAmount }, tenant, req, {
        returnPath: '/admin/dashboard',
        plan: parseSubscriptionPlan(invoice.description) || normalizePlan(tenant.plan),
      });
      await insertStripePayment({ ...invoice, amount: invoiceAmount }, tenant);

      res.json({ checkout_url: session.url, sessionId: session.id, amount: invoiceAmount, currency: STRIPE_CURRENCY.toUpperCase() });
    } catch (err: any) {
      logger.error('Error creando pago Stripe superadmin', { error: err.message });
      res.status(500).json({ error: 'Error al crear el pago con Stripe' });
    }
  });

  router.get('/payments/stripe/test', (req, res) => {
    res.json({
      status: 'ok',
      configured: isStripeConfigured(),
      environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live'
        : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'invalid',
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
