// backend/scripts/check-env.js
// Uso: NODE_ENV=production node scripts/check-env.js
require('dotenv').config();
const requiredBase = ['DATABASE_URL', 'JWT_SECRET'];
const requiredProd = [
  'SMTP_USER',
  'SMTP_PASS',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'FRONTEND_URL',
  'BASE_URL',
];

const env = process.env.NODE_ENV || 'development';
const required = [...requiredBase];
if (env === 'production') required.push(...requiredProd);

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n[check-env] Missing environment variables for', env, ':');
  for (const m of missing) console.error('  -', m);
  console.error('\nExport the missing variables or run this in the correct environment.');
  process.exit(2);
}

if (env === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('[check-env] JWT_SECRET debe tener al menos 32 caracteres en producción.');
  process.exit(2);
}

if (env === 'production' && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('[check-env] STRIPE_WEBHOOK_SECRET es obligatorio cuando STRIPE_SECRET_KEY está configurado.');
  process.exit(2);
}

console.log('[check-env] OK — all required environment variables are present for', env);
process.exit(0);
