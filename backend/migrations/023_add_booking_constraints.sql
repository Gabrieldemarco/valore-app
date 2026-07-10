-- Migration 023: Prevent double-booking, client password reset, email verification

-- Prevent double-booking at the database level:
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active
ON appointments(tenant_id, staff_id, appointment_date)
WHERE status NOT IN ('cancelled', 'no-show');

-- Client password reset & email verification support
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
