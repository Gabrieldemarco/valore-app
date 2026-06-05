// backend/scripts/check-env.js
// Uso: NODE_ENV=production node scripts/check-env.js
require('dotenv').config();
const requiredBase = ['DATABASE_URL', 'JWT_SECRET'];
const requiredProd = ['SMTP_USER', 'SMTP_PASS', 'MP_ACCESS_TOKEN'];

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

console.log('[check-env] OK — all required environment variables are present for', env);
process.exit(0);
