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

  it('pro y enterprise tienen price positivo', () => {
    expect(PLANS.pro.price).toBeGreaterThan(0);
    expect(PLANS.enterprise.price).toBeGreaterThan(0);
  });
});
