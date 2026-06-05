
// backend/database.js
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
require('dotenv').config();
const config = require('./config');
import logger from './services/logger';

const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: parseInt(process.env.DB_POOL_MAX) || 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  logger.error('❌ Error inesperado en el pool:', err.message);
});

/**
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const res = await client.query({
      text,
      values: params,
      statement_timeout: 5000
    });
    return res;
  } catch (err: any) {
    logger.error('❌ Query error:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * @param {string} text
 * @param {any[]} [params]
 * @returns {Promise<any>}
 */
const queryOne = async (text: string, params?: any[]) => {
  const res = await query(text, params);
  return res.rows[0] || null;
};

// INIT DB (igual lógica, pero más robusta)
async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔌 Conectando a DB...');

    await client.query('SELECT 1'); // test conexión

    await client.query(`
      -- (tu SQL intacto)
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

      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date 
      ON appointments(tenant_id, appointment_date);
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
      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date_only 
      ON appointments(tenant_id, (appointment_date::date));

      -- Migraciones para Multi-Peluqueros
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialties TEXT[];
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS individual_hours JSONB;
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;

      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS landing_layout JSONB DEFAULT NULL;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
    `);

    if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO === 'true') {
      await seedDefaults(client);
    } else {
      console.log('ℹ️ Seed demo omitido en producción (SEED_DEMO=true para habilitarlo)');
    }

    console.log('✅ DB lista y estable');
  } catch (err: any) {
    logger.error('❌ Error initDB:', err.message);
  } finally {
    client.release();
  }
}

// Seed (lo dejamos igual)
async function seedDefaults(client) {
  try {
    const admin = await client.query('SELECT id FROM staff WHERE email = $1', ['admin@pelu.com']);

    if (admin.rows.length === 0) {
      const tenantResult = await client.query(
        `INSERT INTO tenants (slug, business_name, notification_email) 
         VALUES ($1, $2, $3) RETURNING id`,
        ['demo', 'Pelu Demo', 'admin@pelu.com']
      );

      const tenantId = tenantResult.rows[0].id;

      const hash = await bcrypt.hash('admin123', config.BCRYPT_ROUNDS);

      await client.query(
        `INSERT INTO staff (tenant_id, name, email, password, role) 
         VALUES ($1, $2, $3, $4, 'admin')`,
        [tenantId, 'Admin', 'admin@pelu.com', hash]
      );

      console.log('✅ Admin demo creado');
    }

    // Seed precios de planes por defecto
    const planPrices = await client.query('SELECT plan_name FROM plan_prices');
    if (planPrices.rows.length === 0) {
      await client.query(
        `INSERT INTO plan_prices (plan_name, price, currency) VALUES 
         ('pro', $1, 'UYU'),
         ('enterprise', $2, 'UYU')`,
        [process.env.PLAN_PRO_PRICE || 990, process.env.PLAN_ENTERPRISE_PRICE || 2490]
      );
      console.log('✅ Precios de planes creados');
    }
  } catch (e: any) {
    logger.error('Seed error:', e.message);
  }
}

export {
  pool,
  initDB,
  query,
  queryOne
};