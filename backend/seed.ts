import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
require('dotenv').config();

const isLocal = (process.env.DATABASE_URL || '').includes('localhost') || (process.env.DATABASE_URL || '').includes('127.0.0.1');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    return await client.query({ text, values: params });
  } finally {
    client.release();
  }
};

const CATEGORIES = [
  { key: 'peluqueria', label: 'Peluquería & Barbería', name1: 'BarberKing Studio', name2: 'Corte Elegante' },
  { key: 'cejas', label: 'Cejas & Pestañas', name1: 'Ojos Perfectos', name2: 'Brow Art Studio' },
  { key: 'uñas', label: 'Manicura & Pedicura', name1: 'Nail Art House', name2: 'Uñas Divine' },
  { key: 'maquillaje', label: 'Maquillaje', name1: 'Maquillaje London', name2: 'Glam Makeup Studio' },
  { key: 'facial', label: 'Cuidado Facial', name1: 'Radiant Face Spa', name2: 'DermaGlow' },
  { key: 'depilacion', label: 'Depilación', name1: 'Cera & Luz', name2: 'DepilCenter' },
  { key: 'masajes', label: 'Masajes & Bienestar', name1: 'Serenity Massage', name2: 'Zen Body Studio' },
];

const DEFAULT_SERVICES: Record<string, { name: string; duration: number }[]> = {
  peluqueria: [
    { name: 'Corte de Cabello', duration: 30 },
    { name: 'Lavado y Secado', duration: 20 },
    { name: 'Tinte / Color', duration: 120 },
    { name: 'Barba y Bigote', duration: 15 },
  ],
  cejas: [
    { name: 'Diseño de Cejas', duration: 30 },
    { name: 'Henna', duration: 20 },
    { name: 'Lifting de Pestañas', duration: 45 },
    { name: 'Laminado de Cejas', duration: 40 },
  ],
  uñas: [
    { name: 'Manicura Clásica', duration: 40 },
    { name: 'Pedicura Clásica', duration: 40 },
    { name: 'Esmaltado Semipermanente', duration: 50 },
    { name: 'Kapping en Gel', duration: 90 },
  ],
  maquillaje: [
    { name: 'Maquillaje Social', duration: 60 },
    { name: 'Maquillaje Novia', duration: 120 },
    { name: 'Peinado para Novia', duration: 45 },
    { name: 'Maquillaje Artístico', duration: 90 },
  ],
  facial: [
    { name: 'Limpieza Facial Profunda', duration: 50 },
    { name: 'Hidratación Facial', duration: 40 },
    { name: 'Dermaplaning', duration: 30 },
    { name: 'Radiofrecuencia Facial', duration: 60 },
  ],
  depilacion: [
    { name: 'Depilación Cejas', duration: 15 },
    { name: 'Depilación Axilas', duration: 15 },
    { name: 'Depilación Piernas Completas', duration: 30 },
    { name: 'Depilación Brazos', duration: 20 },
  ],
  masajes: [
    { name: 'Masaje Relajante', duration: 60 },
    { name: 'Masaje Descontracturante', duration: 60 },
    { name: 'Masaje con Piedras Calientes', duration: 75 },
    { name: 'Masaje Aromaterapia', duration: 60 },
  ],
};

async function seed() {
  try {
    // Run migration
    console.log('→ Ejecutando migración: category column...');
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'peluqueria'`);

    for (const cat of CATEGORIES) {
      for (const bizName of [cat.name1, cat.name2]) {
        const slug = bizName.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + uuidv4().slice(0, 6);

        // Check if already exists
        const exists = await query('SELECT id FROM tenants WHERE business_name = $1', [bizName]);
        if (exists.rows.length > 0) {
          console.log(`  ∃ ${bizName} (${cat.key}) — ya existe, salteando`);
          continue;
        }

        const email = `${slug}@test.com`;
        const hashedPassword = await bcrypt.hash('123456', 10);

        const tenantRes = await query(
          `INSERT INTO tenants (slug, business_name, business_address, business_phone, notification_email, smtp_email, landing_enabled, status, opening_hours, plan, category, trial_start_date, trial_end_date)
           VALUES ($1, $2, $3, $4, $5, $6, true, 'active', $7, 'free', $8, NOW(), NOW() + INTERVAL '15 days') RETURNING id`,
          [slug, bizName, `${cat.label} - Dirección de prueba 123`, '+598 99 999 999', email, email,
           JSON.stringify({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5, 6] }), cat.key]
        );
        const tenantId = tenantRes.rows[0].id;

        // Create admin staff
        await query(
          `INSERT INTO staff (tenant_id, email, password, name, role) VALUES ($1, $2, $3, $4, 'admin')`,
          [tenantId, email, hashedPassword, bizName]
        );

        // Create services
        const services = DEFAULT_SERVICES[cat.key] || DEFAULT_SERVICES['peluqueria'];
        for (const svc of services) {
          await query(
            `INSERT INTO services (tenant_id, name, duration, price, active) VALUES ($1, $2, $3, $4, true)`,
            [tenantId, svc.name, svc.duration, 0]
          );
        }

        console.log(`  ✓ ${bizName} (${cat.key}) — creado`);
      }
    }

    console.log('\n✅ Seed completado exitosamente');
  } catch (err) {
    console.error('❌ Error en seed:', err);
  } finally {
    await pool.end();
  }
}

seed();
