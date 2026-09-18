// Cliente Stripe (Checkout Session + Webhook)
import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

const STRIPE_API_VERSION = '2024-06-20' as Stripe.LatestApiVersion;

/** @returns {boolean} */
function isConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** @returns {boolean} */
function initStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return false;
  stripeClient = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  return true;
}

/** @returns {Stripe} */
function getStripeClient(): Stripe {
  if (!stripeClient && !initStripe()) {
    throw new Error('Stripe no configurado (STRIPE_SECRET_KEY)');
  }
  return stripeClient!;
}

/**
 * @param {Object} params - Params de Checkout Session (mode payment)
 * @returns {Promise<Stripe.Checkout.Session>}
 */
async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
  const client = getStripeClient();
  return client.checkout.sessions.create(params);
}

/**
 * @param {string} sessionId
 * @returns {Promise<Stripe.Checkout.Session>}
 */
async function retrieveSession(sessionId: string) {
  const client = getStripeClient();
  return client.checkout.sessions.retrieve(sessionId);
}

/**
 * Verifica firma del webhook con STRIPE_WEBHOOK_SECRET.
 * @param {string|Buffer} rawBody
 * @param {string|string[]} signature
 * @returns {Stripe.Event}
 */
function constructWebhookEvent(rawBody: string | Buffer, signature: string | string[]) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET no configurado');
  return getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
}

if (isConfigured()) {
  initStripe();
}

export {
  isConfigured,
  initStripe,
  createCheckoutSession,
  retrieveSession,
  constructWebhookEvent,
};