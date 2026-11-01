ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE plan_prices ADD COLUMN IF NOT EXISTS mp_item_id TEXT;

-- Sincronizar valores existentes desde PLANS (si la columna está vacía, usar env vars)
UPDATE plan_prices SET stripe_price_id = NULL WHERE stripe_price_id IS NULL;
UPDATE plan_prices SET mp_item_id = NULL WHERE mp_item_id IS NULL;
