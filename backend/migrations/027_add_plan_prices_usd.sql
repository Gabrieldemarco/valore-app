ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS price_usd NUMERIC(12,2);

-- Valores por defecto en USD si la columna esta vacia
UPDATE plan_prices SET price_usd = 9.90 WHERE plan_name = 'pro' AND price_usd IS NULL;
UPDATE plan_prices SET price_usd = 24.90 WHERE plan_name = 'enterprise' AND price_usd IS NULL;