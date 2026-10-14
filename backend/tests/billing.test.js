const {
  subscriptionDescription,
  parseSubscriptionPlan,
} = require('../services/billing');

describe('billing subscription', () => {
  it('genera descripción de suscripción', () => {
    expect(subscriptionDescription('pro')).toBe('subscription:estandar');
    expect(subscriptionDescription('enterprise')).toBe('subscription:premium');
  });

  it('parsea plan desde factura', () => {
    expect(parseSubscriptionPlan('subscription:pro')).toBe('estandar');
    expect(parseSubscriptionPlan('subscription:enterprise')).toBe('premium');
    expect(parseSubscriptionPlan('Factura mensual')).toBeNull();
  });
});
