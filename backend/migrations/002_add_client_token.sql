-- backend/migrations/002_add_client_token.sql
-- Add client_token to appointments for self-service management

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_token TEXT UNIQUE;

UPDATE appointments SET client_token = md5(random()::text || clock_timestamp()::text)::uuid WHERE client_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_client_token ON appointments(client_token);
