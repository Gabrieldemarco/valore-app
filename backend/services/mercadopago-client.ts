
// Cliente Mercado Pago SDK v2 (Uruguay / Checkout Pro)
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/** @type {import('mercadopago').Preference | null} */
let preferenceClient = null;
/** @type {import('mercadopago').Payment | null} */
let paymentClient = null;

/** @returns {boolean} */
function isConfigured() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/** @returns {boolean} */
function initMercadoPago() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return false;

  const config = new MercadoPagoConfig({ accessToken });
  preferenceClient = new Preference(config);
  paymentClient = new Payment(config);
  return true;
}

/** @returns {import('mercadopago').Preference} */
function getPreferenceClient() {
  if (!preferenceClient && !initMercadoPago()) {
    throw new Error('Mercado Pago no configurado (MP_ACCESS_TOKEN)');
  }
  return preferenceClient;
}

/** @returns {import('mercadopago').Payment} */
function getPaymentClient() {
  if (!paymentClient && !initMercadoPago()) {
    throw new Error('Mercado Pago no configurado (MP_ACCESS_TOKEN)');
  }
  return paymentClient;
}

/**
 * @param {Object} body
 * @returns {Promise<any>}
 */
async function createPreference(body) {
  const client = getPreferenceClient();
  return client.create({ body });
}

/**
 * @param {string} paymentId
 * @returns {Promise<any>}
 */
async function getPayment(paymentId) {
  const client = getPaymentClient();
  return client.get({ id: paymentId });
}

if (isConfigured()) {
  initMercadoPago();
}

export {
  isConfigured,
  initMercadoPago,
  createPreference,
  getPayment,
};
