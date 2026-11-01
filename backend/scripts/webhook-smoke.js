#!/usr/bin/env node

// Prueba segura de disponibilidad y firma de webhooks.
// Lee las claves únicamente desde backend/.env y nunca imprime sus valores.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const crypto = require('crypto');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const value = process.argv[i];
  if (value.startsWith('--')) {
    const [key, inlineValue] = value.slice(2).split('=', 2);
    args.set(key, inlineValue ?? process.argv[i + 1] ?? true);
    if (inlineValue === undefined && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) i += 1;
  }
}

const baseUrl = String(args.get('url') || process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
const provider = String(args.get('provider') || 'both').toLowerCase();
const paymentId = args.get('payment-id');

function requireSecret(name) {
  if (!process.env[name]) throw new Error(`${name} no está configurado en backend/.env`);
  return process.env[name];
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.text();
  return { status: response.status, body };
}

async function testMercadoPago() {
  const health = await request('/api/test-webhook');
  if (health.status !== 200) throw new Error(`Mercado Pago endpoint respondió ${health.status}`);

  if (!paymentId) {
    console.log('Mercado Pago: endpoint disponible (prueba de firma omitida; falta --payment-id).');
    return;
  }

  const secret = requireSecret('MP_WEBHOOK_SECRET');
  const requestId = `smoke-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const normalizedId = String(paymentId).toLowerCase();
  const manifest = `id:${normalizedId};request-id:${requestId};ts:${timestamp};`;
  const signature = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const result = await request(`/api/payments/mercadopago/webhook?type=payment&data.id=${encodeURIComponent(paymentId)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-signature': `ts=${timestamp},v1=${signature}`,
    },
    body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) } }),
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`Mercado Pago webhook respondió ${result.status}: ${result.body.slice(0, 200)}`);
  console.log('Mercado Pago: firma aceptada y webhook respondió correctamente.');
}

async function testStripe() {
  const secret = requireSecret('STRIPE_WEBHOOK_SECRET');
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_smoke_${Date.now()}`,
    object: 'event',
    type: 'payment_intent.processing',
    data: { object: {} },
  });
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const result = await request('/api/payments/stripe/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
  if (result.status !== 200) throw new Error(`Stripe webhook respondió ${result.status}: ${result.body.slice(0, 200)}`);
  console.log('Stripe: firma aceptada y evento de prueba respondido correctamente.');
}

(async () => {
  if (!['both', 'mercadopago', 'stripe'].includes(provider)) throw new Error('--provider debe ser both, mercadopago o stripe');
  if (provider === 'both' || provider === 'mercadopago') await testMercadoPago();
  if (provider === 'both' || provider === 'stripe') await testStripe();
  console.log(`Smoke test completado contra ${baseUrl}.`);
})().catch((error) => {
  console.error(`Smoke test falló: ${error.message}`);
  process.exitCode = 1;
});
