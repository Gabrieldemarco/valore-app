
// Configuración de pagos (Mercado Pago Uruguay por defecto)
require('dotenv').config();
import logger from './logger';

const MP_CURRENCY = /** @type {string} */(process.env.MP_CURRENCY || 'UYU').toUpperCase();
const MP_LOCALE = /** @type {string} */(process.env.MP_LOCALE || 'es-UY');
const MP_COUNTRY = /** @type {string} */(process.env.MP_COUNTRY || 'UY').toUpperCase();

/** @type {{ [key: string]: { price: number, name: string, currency: string } }} */
const PLANS = {
  free: { price: 0, name: 'Gratuito', currency: MP_CURRENCY },
  pro: {
    price: parseFloat(process.env.PLAN_PRO_PRICE || '990'),
    name: 'Profesional',
    currency: MP_CURRENCY,
  },
  enterprise: {
    price: parseFloat(process.env.PLAN_ENTERPRISE_PRICE || '2490'),
    name: 'Empresarial',
    currency: MP_CURRENCY,
  },
};

/**
 * Carga precios de planes desde la base de datos.
 * @param {(text: string, params?: any[]) => Promise<{rows: Array<{plan_name: string, price: string, currency: string}>}>} query
 */
async function loadPlanPricesFromDB(query) {
  try {
    const result = await query('SELECT plan_name, price, currency FROM plan_prices ORDER BY plan_name');
    const prices = result.rows;

    for (const price of prices) {
      if (price.plan_name === 'pro') {
        PLANS.pro.price = parseFloat(price.price);
        PLANS.pro.currency = price.currency;
      } else if (price.plan_name === 'enterprise') {
        PLANS.enterprise.price = parseFloat(price.price);
        PLANS.enterprise.currency = price.currency;
      }
    }

    logger.info('✅ Precios de planes cargados desde DB:', {
      pro: PLANS.pro.price,
      enterprise: PLANS.enterprise.price
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
