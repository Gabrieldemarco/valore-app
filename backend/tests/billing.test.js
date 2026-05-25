const {
  subscriptionDescription,
  parseSubscriptionPlan,
} = require('../services/billing');

describe('billing subscription', () => {
  it('genera descripción de suscripción', () => {
    expect(subscriptionDescription('pro')).toBe('subscription:pro');
  });

  it('parsea plan desde factura', () => {
    expect(parseSubscriptionPlan('subscription:pro')).toBe('pro');
    expect(parseSubscriptionPlan('subscription:enterprise')).toBe('enterprise');
    expect(parseSubscriptionPlan('Factura mensual')).toBeNull();
  });
});
