-- backend/migrations/031_reconcile_schema.sql
-- Reconcile schema between inline database.ts and migration files.
-- Adds missing indexes, columns, and tables. All operations are idempotent.

-- ===== Missing indexes from services/tables =====

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status 
ON appointments(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_staff_date 
ON appointments(tenant_id, staff_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_client_phone 
ON appointments(tenant_id, client_phone);

CREATE INDEX IF NOT EXISTS idx_services_tenant_active 
ON services(tenant_id, active, name);

CREATE INDEX IF NOT EXISTS idx_personal_agenda_user_date 
ON personal_agenda(user_id, fecha);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_issue_date 
ON invoices(tenant_id, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_created_at 
ON payments(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_invoice 
ON payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_tenants_status_landing_created_at 
ON tenants(status, landing_enabled, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_tenant_active_role_name 
ON staff(tenant_id, active, role, name);

-- ===== Service categories tree (only in database.ts inline, missing from migrations) =====

CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_categories_tenant ON service_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_parent ON service_categories(parent_id);

-- Add category_id FK to services (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE services ADD COLUMN category_id INTEGER REFERENCES service_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

-- ===== Missing columns from database.ts inline schema =====

-- Tenants: lat, lng, category (may already exist from migration 005, but ensure here)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Tenants: landing_layout (not in any migration file)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS landing_layout JSONB DEFAULT NULL;

-- Tenants: billing_email, last_payment_date (from migrations 028, 029 — ensure idempotent)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

-- Tenants: notification_whatsapp, smtp_email, smtp_password (in migration 001, ensure present)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notification_whatsapp TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_password TEXT;

-- Tenants: trial_start_date, trial_end_date, subscription_status
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- Services: description, image, category, category_id (description from 024, ensure present)
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE services ADD COLUMN IF NOT EXISTS image TEXT;

-- Staff: photo_url, bio, specialties, individual_hours, active, commission columns
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE staff ADD COLUMN IF NOT EXISTS individual_hours JSONB;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'none';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10,2) DEFAULT 0;

-- Appointments: missing columns from database.ts inline
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_payment_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_preference_id TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_group TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_rule JSONB;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_appointments_recurring_group ON appointments(recurring_group);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id ON appointments(google_event_id);

-- Users: name, phone, email, email_verified, verification tokens, google_id, reset tokens
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Tenants: captcha_enabled, reminder_hours
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS captcha_enabled BOOLEAN DEFAULT false;

-- ===== Fix inconsistencies =====

-- Reviews: ensure approved defaults to false (migration 026 had DEFAULT true)
-- Only change default for new inserts; existing rows keep their value
ALTER TABLE reviews ALTER COLUMN approved DROP DEFAULT;
ALTER TABLE reviews ALTER COLUMN approved SET DEFAULT false;

-- Reviews: add reply column (present in database.ts inline schema)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;

-- ===== Missing tables from database.ts inline schema =====

-- Blocked dates table (only in database.ts inline, missing from migrations)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, date)
);

-- ===== Seed default plan prices if empty =====

INSERT INTO plan_prices (plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months) VALUES
  ('free', 0, 0, 'UYU', 0, 0, 0),
  ('basico', 400, 10, 'UYU', 280, 7, 3),
  ('estandar', 760, 19, 'UYU', 560, 14, 3),
  ('premium', 1160, 29, 'UYU', 840, 21, 3)
ON CONFLICT (plan_name) DO NOTHING;
