ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_timezone TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_client_phone_normalized
  ON appointments (regexp_replace(client_phone, '[^0-9]', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_appointments_client_email_lower
  ON appointments (lower(client_email))
  WHERE client_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_client_phone_normalized
  ON users (regexp_replace(phone, '[^0-9]', '', 'g'))
  WHERE role = 'client' AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_client_email_lower
  ON users (lower(email))
  WHERE role = 'client' AND email IS NOT NULL;
