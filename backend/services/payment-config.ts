// Configuración de pagos (Mercado Pago Uruguay por defecto)
require('dotenv').config();
import logger from './logger';

const MP_CURRENCY = /** @type {string} */(process.env.MP_CURRENCY || 'UYU').toUpperCase();
const MP_LOCALE = /** @type {string} */(process.env.MP_LOCALE || 'es-UY');
const MP_COUNTRY = /** @type {string} */(process.env.MP_COUNTRY || 'UY').toUpperCase();

// Stripe (internacional) se factura en USD
const STRIPE_CURRENCY = /** @type {string} */(process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

const LEGACY_PLAN_MAP = { pro: 'estandar', enterprise: 'premium' };

/** @type {{ [key: string]: { price: number, price_usd: number, name: string, currency: string, currency_usd: string, promo_price: number, promo_price_usd: number, promo_months: number, limits?: { staff: number|null, services: number|null, products: number|null, appointmentsPerDay: number|null }, features?: string[] } }} */
const PLANS = {
  free: {
    price: 0,
    price_usd: 0,
    name: 'Gratuito',
    currency: MP_CURRENCY,
    currency_usd: STRIPE_CURRENCY,
    promo_price: 0,
    promo_price_usd: 0,
    promo_months: 0,
    limits: { staff: 1, services: 5, products: 5, appointmentsPerDay: 10 },
    features: [],
  },
  basico: {
    price: parseFloat(process.env.PLAN_BASICO_PRICE || '400'),
    price_usd: parseFloat(process.env.PLAN_BASICO_PRICE_USD || '10'),
    name: 'Básico',
    currency: MP_CURRENCY,
    currency_usd: STRIPE_CURRENCY,
    promo_price: parseFloat(process.env.PLAN_BASICO_PROMO_PRICE || '280'),
    promo_price_usd: parseFloat(process.env.PLAN_BASICO_PROMO_PRICE_USD || '7'),
    promo_months: parseInt(process.env.PLAN_PROMO_MONTHS || '3', 10),
    limits: { staff: 1, services: 10, products: 10, appointmentsPerDay: null },
    features: ['appointments', 'basic_reminders', 'landing_basic', 'service_categories'],
  },
  estandar: {
    price: parseFloat(process.env.PLAN_ESTANDAR_PRICE || '760'),
    price_usd: parseFloat(process.env.PLAN_ESTANDAR_PRICE_USD || '19'),
    name: 'Estándar',
    currency: MP_CURRENCY,
    currency_usd: STRIPE_CURRENCY,
    promo_price: parseFloat(process.env.PLAN_ESTANDAR_PROMO_PRICE || '560'),
    promo_price_usd: parseFloat(process.env.PLAN_ESTANDAR_PROMO_PRICE_USD || '14'),
    promo_months: parseInt(process.env.PLAN_PROMO_MONTHS || '3', 10),
    limits: { staff: 3, services: 30, products: 30, appointmentsPerDay: null },
    features: ['appointments', 'whatsapp_reminders', 'email_reminders', 'landing_custom_css', 'analytics_basic', 'pos_basic', 'calendar_sync', 'service_featured'],
  },
  premium: {
    price: parseFloat(process.env.PLAN_PREMIUM_PRICE || '1160'),
    price_usd: parseFloat(process.env.PLAN_PREMIUM_PRICE_USD || '29'),
    name: 'Premium',
    currency: MP_CURRENCY,
    currency_usd: STRIPE_CURRENCY,
    promo_price: parseFloat(process.env.PLAN_PREMIUM_PROMO_PRICE || '840'),
    promo_price_usd: parseFloat(process.env.PLAN_PREMIUM_PROMO_PRICE_USD || '21'),
    promo_months: parseInt(process.env.PLAN_PROMO_MONTHS || '3', 10),
    limits: { staff: null, services: null, products: null, appointmentsPerDay: null },
    features: ['appointments', 'whatsapp_reminders', 'email_reminders', 'sms_reminders', 'landing_custom_css', 'landing_custom_html', 'analytics_advanced', 'pos_full', 'calendar_sync', 'service_featured', 'custom_domain', 'priority_support', 'google_analytics', 'waitlist', 'coupons', 'products', 'financial_reports'],
  },
};

const PAID_PLANS = ['basico', 'estandar', 'premium'];

/**
 * Normaliza el nombre de un plan (incluye mapeo de planes legacy).
 * @param {string} [plan]
 * @returns {string}
 */
function normalizePlan(plan) {
  if (!plan) return plan;
  const p = String(plan).toLowerCase();
  return LEGACY_PLAN_MAP[p] || p;
}

/**
 * @param {string} [plan]
 * @returns {boolean}
 */
function isPaidPlan(plan) {
  return PAID_PLANS.includes(normalizePlan(plan));
}

/**
 * Calcula el precio efectivo (normal o promocional) según los ciclos pagados.
 * @param {{ price: number|string, price_usd: number|string, promo_price: number|string|null, promo_price_usd: number|string|null, promo_months: number|string|null }} planInfo
 * @param {number} [paidCycles]
 * @returns {{ price: number, price_usd: number, isPromo: boolean }}
 */
function getEffectivePlanPrice(planInfo, paidCycles = 0) {
  const months = parseInt(planInfo.promo_months, 10) || 0;
  const cycles = Number(paidCycles) || 0;
  const isPromo = months > 0 && cycles < months && planInfo.promo_price != null;
  return {
    price: isPromo ? parseFloat(planInfo.promo_price) : parseFloat(planInfo.price),
    price_usd: isPromo && planInfo.promo_price_usd != null ? parseFloat(planInfo.promo_price_usd) : parseFloat(planInfo.price_usd),
    isPromo,
  };
}

/**
 * Carga precios de planes desde la base de datos.
 * @param {(text: string, params?: any[]) => Promise<{rows: Array<{plan_name: string, price: string, price_usd: string, currency: string, promo_price: string, promo_price_usd: string, promo_months: string}>}>} query
 */
async function loadPlanPricesFromDB(query) {
  try {
    const result = await query(
      'SELECT plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months FROM plan_prices ORDER BY plan_name'
    );
    const prices = result.rows;

    for (const price of prices) {
      const plan = PLANS[price.plan_name];
      if (!plan) continue;
      plan.price = parseFloat(price.price);
      plan.price_usd = price.price_usd !== null && price.price_usd !== undefined ? parseFloat(price.price_usd) : plan.price_usd;
      plan.currency = price.currency || plan.currency;
      if (price.promo_price !== null && price.promo_price !== undefined) {
        plan.promo_price = parseFloat(price.promo_price);
      }
      if (price.promo_price_usd !== null && price.promo_price_usd !== undefined) {
        plan.promo_price_usd = parseFloat(price.promo_price_usd);
      }
      if (price.promo_months !== null && price.promo_months !== undefined) {
        plan.promo_months = parseInt(price.promo_months, 10) || 0;
      }
    }

    logger.info('Precios cargados desde DB', {
      basico: PLANS.basico.price,
      basico_usd: PLANS.basico.price_usd,
      estandar: PLANS.estandar.price,
      estandar_usd: PLANS.estandar.price_usd,
      premium: PLANS.premium.price,
      premium_usd: PLANS.premium.price_usd,
      promo_months: PLANS.basico.promo_months,
    });
  } catch (err) {
    logger.error('Error cargando precios desde DB, usando valores por defecto', err);
  }
}

async function reloadPlanPrices(query) {
  await loadPlanPricesFromDB(query);
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

/**
 * Verifica si un plan tiene una característica específica.
 * @param {string} [plan]
 * @param {string} feature
 * @returns {boolean}
 */
function hasFeature(plan, feature) {
  const normalized = normalizePlan(plan);
  const planInfo = PLANS[normalized];
  if (!planInfo) return false;
  const features = planInfo.features || [];
  return features.includes(feature);
}

/**
 * Verifica si un plan tiene una característica específica (alias).
 * @param {string} [plan]
 * @param {string} feature
 * @returns {boolean}
 */
function hasFeatureAccess(plan, feature) {
  return hasFeature(plan, feature);
}

export {
  MP_CURRENCY,
  MP_LOCALE,
  MP_COUNTRY,
  STRIPE_CURRENCY,
  PLANS,
  PAID_PLANS,
  normalizePlan,
  isPaidPlan,
  getEffectivePlanPrice,
  hasFeature,
  hasFeatureAccess,
  formatMoney,
  loadPlanPricesFromDB,
  reloadPlanPrices,
};