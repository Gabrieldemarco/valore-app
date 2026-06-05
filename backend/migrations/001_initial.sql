-- backend/migrations/001_initial.sql
-- Initial schema migration based on existing database initialization

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  business_address TEXT,
  business_phone TEXT,
  notification_email TEXT,
  notification_whatsapp TEXT,
  smtp_email TEXT,
  smtp_password TEXT,
  brand_primary_color TEXT DEFAULT '#2563eb',
  brand_secondary_color TEXT DEFAULT '#7c3aed',
  brand_logo_url TEXT,
  landing_enabled BOOLEAN DEFAULT true,
  landing_description TEXT,
  landing_hero_image TEXT,
  landing_gallery JSONB DEFAULT '[]',
  landing_team JSONB DEFAULT '[]',
  landing_services_info JSONB DEFAULT '[]',
  landing_social_links JSONB DEFAULT '{}',
  landing_custom_css TEXT,
  opening_hours JSONB DEFAULT '{"startHour":9,"endHour":19,"workDays":[1,2,3,4,5]}',
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'free',
  subscription_status TEXT,
  trial_start_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  landing_layout JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'client',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '19:00',
  photo_url TEXT,
  bio TEXT,
  specialties TEXT[],
  individual_hours JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  service TEXT NOT NULL,
  service_duration INTEGER NOT NULL,
  appointment_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  internal_notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personal_agenda (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP,
  issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_date TIMESTAMP,
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  tenant_id INTEGER,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'UYU',
  method TEXT,
  mp_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_prices (
  id SERIAL PRIMARY KEY,
  plan_name TEXT UNIQUE NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'UYU',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, appointment_date);
