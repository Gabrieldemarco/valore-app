// backend/seed-velsoie.js
// Seed único: crea el salón principal "Velsoie Studio" sin borrar registros existentes.
// Uso: node seed-velsoie.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'seed');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const NAME = process.env.SEED_NAME || 'Velsoie Studio';
const SLUG_BASE = NAME.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@velsoie.com';
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || 'Velsoie2026!';

function randHex(n) {
  return crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
}

function svgFor(name) {
  const c1 = '#0f172a', c2 = '#d97706';
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'VS';
  const hero = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="1200" height="600" fill="url(#bg)"/>
  <circle cx="1060" cy="70" r="230" fill="rgba(255,255,255,0.07)"/>
  <circle cx="130" cy="560" r="270" fill="rgba(0,0,0,0.10)"/>
  <circle cx="600" cy="300" r="190" fill="rgba(255,255,255,0.05)"/>
  <text x="600" y="270" font-family="Arial" font-size="88" font-weight="800" fill="rgba(255,255,255,0.95)" text-anchor="middle">${ini}</text>
  <rect x="250" y="420" width="700" height="104" rx="18" fill="rgba(0,0,0,0.28)"/>
  <text x="600" y="470" font-family="Arial" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">${name}</text>
  <text x="600" y="502" font-family="Arial" font-size="20" letter-spacing="3" fill="rgba(255,255,255,0.85)" text-anchor="middle">BELLEZA &amp; BIENESTAR</text>
</svg>`;
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <circle cx="340" cy="60" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="60" cy="360" r="140" fill="rgba(0,0,0,0.10)"/>
  <text x="200" y="205" font-family="Arial" font-size="96" font-weight="800" fill="rgba(255,255,255,0.96)" text-anchor="middle">${ini}</text>
</svg>`;
  return { hero, logo };
}

const SERVICES = [
  { name: 'Corte de Cabello', duration: 45, price: 800 },
  { name: 'Color y Tinte', duration: 120, price: 1800 },
  { name: 'Manicura Semipermanente', duration: 60, price: 700 },
  { name: 'Limpieza Facial Profunda', duration: 50, price: 1200 },
  { name: 'Maquillaje Social', duration: 60, price: 1500 },
  { name: 'Masaje Relajante', duration: 60, price: 1300 },
];

async function main() {
  const slug = `${SLUG_BASE}-${randHex(6)}`;
  const hashed = await bcrypt.hash(ADMIN_PASS, 10);
  const { hero, logo } = svgFor(NAME);
  const heroFile = path.join(UPLOADS_DIR, `hero-${slug}.svg`);
  const logoFile = path.join(UPLOADS_DIR, `logo-${slug}.svg`);
  fs.writeFileSync(heroFile, hero);
  fs.writeFileSync(logoFile, logo);

  const tzHours = JSON.stringify({ startHour: 9, endHour: 20, workDays: [1, 2, 3, 4, 5, 6] });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantRes = await client.query(
      `INSERT INTO tenants (slug, business_name, business_address, business_phone, brand_primary_color, brand_secondary_color,
        brand_logo_url, status, plan, notification_email, smtp_email, landing_enabled, landing_description, landing_hero_image,
        opening_hours, category, lat, lng, trial_start_date, trial_end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active','free',$8,$8,true,$9,$10,$11,$12,$13,$14,NOW(), NOW() + INTERVAL '30 days')
       RETURNING id`,
      [slug, NAME, 'Montevideo, Uruguay', '+598 99 000 000', '#0f172a', '#d97706',
       `/uploads/seed/logo-${slug}.svg`, ADMIN_EMAIL, 'Estudio de belleza y bienestar premium.',
       `/uploads/seed/hero-${slug}.svg`, tzHours, 'peluqueria', -34.905, -56.190]
    );
    const tenantId = tenantRes.rows[0].id;

    await client.query(
      `INSERT INTO staff (tenant_id, email, password, name, role, specialties) VALUES ($1,$2,$3,$4,'admin',$5)`,
      [tenantId, ADMIN_EMAIL, hashed, 'Velsoie Admin', ['Beauty']]
    );
    for (const svc of SERVICES) {
      await client.query(
        `INSERT INTO services (tenant_id, name, duration, price, active, category) VALUES ($1,$2,$3,$4,true,$5)`,
        [tenantId, svc.name, svc.duration, svc.price, 'peluqueria']
      );
    }
    await client.query('COMMIT');
    console.log(`\n✅ Seed único creado: ${NAME}`);
    console.log(`   Slug / landing: https://velsoie.com/p/${slug}`);
    console.log(`   Dashboard staff: https://velsoie.com/staff/login`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASS}`);
    console.log(`   Total tenants en DB: ${(await pool.query('SELECT COUNT(*)::int AS c FROM tenants')).rows[0].c}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (e) => { console.error('❌', e.message); await pool.end(); process.exit(1); });