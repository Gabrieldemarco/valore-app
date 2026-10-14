-- Migration 032: Seed plan prices (basico/estandar/premium)
-- Idempotent; 031 also seeds these as a fallback.

INSERT INTO plan_prices (plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months) VALUES
  ('basico', 400, 10, 'UYU', 280, 7, 3),
  ('estandar', 760, 19, 'UYU', 560, 14, 3),
  ('premium', 1160, 29, 'UYU', 840, 21, 3)
ON CONFLICT (plan_name) DO NOTHING;
