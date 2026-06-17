CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  preferred_date DATE,
  preferred_time TIME,
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','notified','converted','expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP,
  converted_appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_waitlist_tenant ON waitlist(tenant_id);
