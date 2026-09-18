
// Configuración de pagos (Mercado Pago Uruguay por defecto)
require('dotenv').config();
import logger from './logger';

const MP_CURRENCY = /** @type {string} */(process.env.MP_CURRENCY || 'UYU').toUpperCase();
const MP_LOCALE = /** @type {string} */(process.env.MP_LOCALE || 'es-UY');
const MP_COUNTRY = /** @type {string} */(process.env.MP_COUNTRY || 'UY').toUpperCase();

// Stripe (internacional) se factura en USD
const STRIPE_CURRENCY = /** @type {string} */(process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

/** @type {{ [key: string]: { price: number, price_usd: number, name: string, currency: string, currency_usd: string } }} */
const PLANS = {
  free: { price: 0, price_usd: 0, name: 'Gratuito', currency: MP_CURRENCY, currency_usd: STRIPE_CURRENCY },
  pro: {
    price: parseFloat(process.env.PLAN_PRO_PRICE || '990'),
    price_usd: parseFloat(process.env.PLAN_PRO_PRICE_USD || '9.90'),
    name: 'Profesional',
    currency: MP_CURRENCY,
    currency_usd: STRIPE_CURRENCY,
  },
  enterprise: {
    price: parseFloat(process.env.PLAN_ENTERPRISE_PRICE || '2490'),
    price_usd: parseFloat(process.env.PLAN_ENTERPRISE_PRICE_USD || '24.90'),
    name: 'Empresarial',
    currency: MP_CURRENCY,
    currency_usd: STRIPE_CURRENCY,
  },
};

/**
 * Carga precios de planes desde la base de datos.
 * @param {(text: string, params?: any[]) => Promise<{rows: Array<{plan_name: string, price: string, price_usd: string, currency: string}>}>} query
 */
async function loadPlanPricesFromDB(query) {
  try {
    const result = await query('SELECT plan_name, price, price_usd, currency FROM plan_prices ORDER BY plan_name');
    const prices = result.rows;

    for (const price of prices) {
      if (price.plan_name === 'pro') {
        PLANS.pro.price = parseFloat(price.price);
        PLANS.pro.currency = price.currency;
        if (price.price_usd !== null && price.price_usd !== undefined) {
          PLANS.pro.price_usd = parseFloat(price.price_usd);
        }
      } else if (price.plan_name === 'enterprise') {
        PLANS.enterprise.price = parseFloat(price.price);
        PLANS.enterprise.currency = price.currency;
        if (price.price_usd !== null && price.price_usd !== undefined) {
          PLANS.enterprise.price_usd = parseFloat(price.price_usd);
        }
      }
    }

    logger.info('✅ Precios de planes cargados desde DB:', {
      pro: PLANS.pro.price,
      pro_usd: PLANS.pro.price_usd,
      enterprise: PLANS.enterprise.price,
      enterprise_usd: PLANS.enterprise.price_usd
    });
  } catch (err: any) {
    logger.error('❌ Error cargando precios desde DB, usando valores por defecto:', err.message);
  }
}

/**
 * @param {number} amount
 * @param {string} [locale]
 * @param {string} [currency]
 * @returns {string}
 */
function formatMoney(amount, locale = MP_LOCALE, currency = MP_CURRENCY) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export {
  MP_CURRENCY,
  MP_LOCALE,
  MP_COUNTRY,
  PLANS,
  formatMoney,
  loadPlanPricesFromDB,
};
