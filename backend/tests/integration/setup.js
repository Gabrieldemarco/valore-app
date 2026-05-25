// @ts-check
/**
 * Setup para tests de integración con PostgreSQL real.
 * Uso: TEST_DATABASE_URL=postgresql://... npm run test:integration
 *       (o por defecto apunta a localhost:5432/agenda_app_test)
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const TEST_DB_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:orion1@localhost:5432/agenda_app_test';

/** @type {Pool|null} */
let adminPool = null;

/**
 * Crea la base de datos de test si no existe (conecta a postgres default DB)
 */
async function ensureTestDatabase() {
  const url = new URL(TEST_DB_URL);
  const dbName = url.pathname.slice(1);
  url.pathname = '/postgres';

  const tempPool = new Pool({ connectionString: url.toString(), max: 1 });
  try {
    const exists = await tempPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (exists.rows.length === 0) {
      await tempPool.query(`CREATE DATABASE "${dbName}"`);
      console.log('✅ Base de test creada: ' + dbName);
    }
  } finally {
    await tempPool.end();
  }
}

/**
 * Conecta al pool de admin (sin base de datos específica) para operaciones DDL
 * @returns {Promise<Pool>}
 */
async function getAdminPool() {
  if (!adminPool) {
    const url = new URL(TEST_DB_URL);
    url.pathname = '/postgres';
    adminPool = new Pool({ connectionString: url.toString(), max: 1 });
  }
  return adminPool;
}

/**
 * Elimina todas las tablas de la base de test
 */
async function dropAllTables() {
  const pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
  try {
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('🗑️ Tablas eliminadas');
  } finally {
    await pool.end();
  }
}

/**
 * Crea todas las tablas (mismo schema que initDB)
 */
async function createTables() {
  const pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
  try {
    await pool.query(`
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
        landing_layout JSONB DEFAULT NULL,
        status TEXT DEFAULT 'active',
        plan TEXT DEFAULT 'free',
        trial_start_date TIMESTAMP,
        trial_end_date TIMESTAMP,
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
        landing_image TEXT,
        landing_description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
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

      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date
      ON appointments(tenant_id, appointment_date);
    `);
    console.log('✅ Tablas creadas');
  } finally {
    await pool.end();
  }
}

/**
 * Inserta datos de prueba mínimos
 * @returns {Promise<{tenantId: number, staffId: number, serviceId: number, adminStaffId: number, superAdminId: number}>}
 */
async function seedTestData() {
  const { query, queryOne } = require('../../database');
  const hash = await bcrypt.hash('test123', 10);

  // Super admin
  const superAdmin = await queryOne(
    `INSERT INTO super_admins (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
    ['Admin Test', 'admin@test.com', hash]
  );

  // Tenant
  const tenant = await queryOne(
    `INSERT INTO tenants (slug, business_name, notification_email, status, plan)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    ['test-pelu', 'Pelu Test', 'test@pelu.com', 'active', 'free']
  );

  // Admin staff (usa email único para evitar conflicto con seed demo de initDB)
  const adminStaff = await queryOne(
    `INSERT INTO staff (tenant_id, name, email, password, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant.id, 'Admin Test', 'admin@test-pelu.com', hash, 'admin']
  );

  // Regular staff
  const staff = await queryOne(
    `INSERT INTO staff (tenant_id, name, email, password, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant.id, 'Peluquero Uno', 'staff@test-pelu.com', hash, 'staff']
  );

  // Service
  const service = await queryOne(
    `INSERT INTO services (tenant_id, name, duration, price, active)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tenant.id, 'Corte de pelo', 30, 500, true]
  );

  // User (client)
  await queryOne(
    `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id`,
    ['cliente1', hash, 'client']
  );

  // Plan prices
  await query(
    `INSERT INTO plan_prices (plan_name, price, currency) VALUES
     ('pro', 990, 'UYU'),
     ('enterprise', 2490, 'UYU')
     ON CONFLICT (plan_name) DO NOTHING`
  );

  console.log('✅ Datos de prueba insertados');

  return {
    tenantId: tenant.id,
    staffId: staff.id,
    serviceId: service.id,
    adminStaffId: adminStaff.id,
    superAdminId: superAdmin.id
  };
}

module.exports = {
  ensureTestDatabase,
  dropAllTables,
  createTables,
  seedTestData,
  TEST_DB_URL
};
