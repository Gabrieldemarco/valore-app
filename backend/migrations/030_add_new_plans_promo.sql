ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12,2);
ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS promo_price_usd NUMERIC(12,2);
ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS promo_months INTEGER DEFAULT 0;

INSERT INTO plan_prices (plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months) VALUES
  ('basico', 400, 10, 'UYU', 280, 7, 3),
  ('estandar', 760, 19, 'UYU', 560, 14, 3),
  ('premium', 1160, 29, 'UYU', 840, 21, 3)
ON CONFLICT (plan_name) DO UPDATE SET
  price = EXCLUDED.price,
  price_usd = EXCLUDED.price_usd,
  currency = EXCLUDED.currency,
  promo_price = EXCLUDED.promo_price,
  promo_price_usd = EXCLUDED.promo_price_usd,
  promo_months = EXCLUDED.promo_months;

UPDATE tenants SET plan = 'estandar' WHERE plan = 'pro';
UPDATE tenants SET plan = 'premium' WHERE plan = 'enterprise';

UPDATE invoices SET description = replace(description, 'subscription:pro', 'subscription:estandar') WHERE description LIKE 'subscription:pro%';
UPDATE invoices SET description = replace(description, 'subscription:enterprise', 'subscription:premium') WHERE description LIKE 'subscription:enterprise%';