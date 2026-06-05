-- backend/migrations/004_add_recurring.sql
-- Add recurring appointments support

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_group TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_rule JSONB;

CREATE INDEX IF NOT EXISTS idx_appointments_recurring_group ON appointments(recurring_group);
