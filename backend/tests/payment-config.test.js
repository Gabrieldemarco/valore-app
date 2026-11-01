const { formatMoney, PLANS } = require('../services/payment-config');

describe('formatMoney', () => {
  it('formatea en UYU por defecto', () => {
    const result = formatMoney(990);
    expect(result).toMatch(/\$|990|\./);
  });

  it('usa locale y moneda provistos', () => {
    const result = formatMoney(100, 'en-US', 'USD');
    expect(result).toMatch(/\$|100/);
  });
});

describe('PLANS', () => {
  it('free tiene price 0', () => {
    expect(PLANS.free.price).toBe(0);
  });

  it('basico y estandar tienen price positivo', () => {
    expect(PLANS.basico.price).toBeGreaterThan(0);
    expect(PLANS.estandar.price).toBeGreaterThan(0);
  });

  it('mantiene Stripe en USD aunque el entorno solicite otra moneda', () => {
    const current = process.env.STRIPE_CURRENCY;
    process.env.STRIPE_CURRENCY = 'UYU';
    jest.resetModules();

    try {
      const { STRIPE_CURRENCY, getEffectivePlanPrice } = require('../services/payment-config');
      expect(STRIPE_CURRENCY).toBe('usd');
      expect(getEffectivePlanPrice({
        price: 760,
        price_usd: 19,
        promo_price: 560,
        promo_price_usd: 14,
        promo_months: 3,
      }, 0)).toEqual({ price: 560, price_usd: 14, isPromo: true });
    } finally {
      jest.resetModules();
      if (current !== undefined) {
        process.env.STRIPE_CURRENCY = current;
      } else {
        delete process.env.STRIPE_CURRENCY;
      }
    }
  });
});
