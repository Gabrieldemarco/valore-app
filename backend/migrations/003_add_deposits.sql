-- backend/migrations/003_add_deposits.sql
-- Add deposit support for appointments (seña)

ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_payment_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_preference_id TEXT;
