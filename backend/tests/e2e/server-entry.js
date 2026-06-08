// @ts-check
/**
 * Punto de entrada único para E2E: prepara DB, imprime debug, e inicia servidor.
 */
const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:orion1@localhost:5432/agenda_app_test';

process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'e2e';
process.env.JWT_SECRET = 'test-secret-for-e2e';
process.env.SMTP_USER = 'test@velsoie.com';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '3099'; // Puerto distinto para evitar conflicto con dev server
process.env.MP_ACCESS_TOKEN = 'test-mp-token-e2e';
process.env.LOGIN_RATE_LIMIT_MAX = '200';
process.env.APPOINTMENT_RATE_LIMIT_MAX = '200';
process.env.PASSWORD_RESET_RATE_LIMIT_MAX = '200';

// Verificar conexión ANTES de cargar server
(async () => {
  const { Pool } = require('pg');
  const bcrypt = require('bcryptjs');

  // 1. Conectar al test DB
  const pool = new Pool({ connectionString: TEST_DB_URL });

  try {
    console.log('=== E2E Server Setup ===');
    console.log('DB URL:', TEST_DB_URL);

    // 2. Limpiar datos previos + crear tablas
    await pool.query(`DROP TABLE IF EXISTS payments, personal_agenda, appointments, services, staff, invoices, plan_prices, tenants, users, super_admins CASCADE;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, business_name TEXT NOT NULL,
        business_address TEXT, business_phone TEXT, notification_email TEXT,
        notification_whatsapp TEXT, smtp_email TEXT, smtp_password TEXT,
        brand_primary_color TEXT DEFAULT '#2563eb', brand_secondary_color TEXT DEFAULT '#7c3aed',
        brand_logo_url TEXT, landing_enabled BOOLEAN DEFAULT true,
        landing_description TEXT, landing_hero_image TEXT,
        landing_gallery JSONB DEFAULT '[]', landing_team JSONB DEFAULT '[]',
        landing_services_info JSONB DEFAULT '[]', landing_social_links JSONB DEFAULT '{}',
        landing_custom_css TEXT,
        opening_hours JSONB DEFAULT '{"startHour":9,"endHour":19,"workDays":[1,2,3,4,5]}',
        status TEXT DEFAULT 'active', plan TEXT DEFAULT 'free',
        trial_start_date TIMESTAMP, trial_end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'client', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS staff (id SERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'staff', working_hours_start TIME DEFAULT '09:00', working_hours_end TIME DEFAULT '19:00', photo_url TEXT, bio TEXT, specialties TEXT[], individual_hours JSONB, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS services (id SERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE, name TEXT NOT NULL, duration INTEGER NOT NULL, price DECIMAL(10,2) NOT NULL DEFAULT 0, image TEXT, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE, staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL, client_name TEXT NOT NULL, client_phone TEXT NOT NULL, client_email TEXT, service TEXT NOT NULL, service_duration INTEGER NOT NULL, appointment_date TIMESTAMP NOT NULL, status TEXT DEFAULT 'confirmed', notes TEXT, internal_notes TEXT, reminder_sent BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS personal_agenda (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, titulo TEXT NOT NULL, fecha TIMESTAMP NOT NULL, descripcion TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS invoices (id SERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE, invoice_number TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL, description TEXT, status TEXT DEFAULT 'pending', due_date TIMESTAMP, issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, paid_date TIMESTAMP, payment_method TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS super_admins (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'super_admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL, tenant_id INTEGER, amount NUMERIC(12,2), currency TEXT DEFAULT 'UYU', method TEXT, mp_payment_id TEXT, status TEXT DEFAULT 'pending', raw_payload JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS plan_prices (id SERIAL PRIMARY KEY, plan_name TEXT UNIQUE NOT NULL, price NUMERIC(12,2) NOT NULL, currency TEXT DEFAULT 'UYU', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialties TEXT[];
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS individual_hours JSONB;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token TEXT;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS landing_layout JSONB DEFAULT NULL;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
    `);

    // 3. Seed test data
    const hash = await bcrypt.hash('test123', 10);

    await pool.query(`INSERT INTO super_admins (name, email, password) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
      ['Admin Test', 'admin@test.com', hash]);

    await pool.query(`INSERT INTO tenants (slug, business_name, notification_email, status, plan, opening_hours)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status`,
      ['test-pelu', 'Peluquería Test', 'test@pelu.com', 'active', 'pro',
       JSON.stringify({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5, 6] })]);

    const tid = (await pool.query(`SELECT id FROM tenants WHERE slug = 'test-pelu'`)).rows[0].id;
    console.log('Tenant ID:', tid);

    await pool.query(`INSERT INTO staff (tenant_id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      [tid, 'Dueño Test', 'admin@test-pelu.com', hash, 'admin']);
    await pool.query(`INSERT INTO staff (tenant_id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      [tid, 'Peluquero Uno', 'staff@test-pelu.com', hash, 'staff']);

    // Usuario dedicado para test de reset password (no lo usan otros tests)
    const resetHash = await bcrypt.hash('oldpass789', 10);
    await pool.query(`INSERT INTO staff (tenant_id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      [tid, 'Reset Test', 'reset-e2e@test-pelu.com', resetHash, 'staff']);
    // Fijar un reset_token conocido para el flujo completo
    await pool.query(`UPDATE staff SET reset_token = 'e2e-reset-token-known', reset_token_expires = '2099-12-31T23:59:59Z' WHERE email = 'reset-e2e@test-pelu.com'`);
    await pool.query(`DELETE FROM services WHERE tenant_id = $1`, [tid]);
    await pool.query(`INSERT INTO services (tenant_id, name, duration, price, active) VALUES ($1, $2, $3, $4, $5)`,
      [tid, 'Corte de pelo', 30, 500, true]);
    await pool.query(`INSERT INTO services (tenant_id, name, duration, price, active) VALUES ($1, $2, $3, $4, $5)`,
      [tid, 'Corte + Barba', 60, 800, true]);
    await pool.query(`INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING`,
      ['cliente-e2e', hash, 'client']);
    await pool.query(`INSERT INTO plan_prices (plan_name, price, currency) VALUES ('pro', 990, 'UYU'), ('enterprise', 2490, 'UYU') ON CONFLICT (plan_name) DO NOTHING`);

    console.log('✅ Datos de prueba insertados');
  } finally {
    await pool.end();
  }

  console.log('=== Iniciando servidor Express ===');

  // 4. AHORA cargar el servidor Express (hereda DATABASE_URL correcta)
  const app = require('../../server');
})();
