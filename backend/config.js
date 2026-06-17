// backend/config.js
// Validación mínima de variables de entorno para evitar arranques rotos.
const nodeEnv = process.env.NODE_ENV || 'development';
const required = ['DATABASE_URL', 'JWT_SECRET'];
const warnings = [];

if (nodeEnv === 'production') {
  // En producción exigimos también mail, MP y orígenes permitidos para CORS.
  required.push('SMTP_USER', 'SMTP_PASS', 'MP_ACCESS_TOKEN', 'ALLOWED_ORIGINS');
} else {
  // En staging/desarrollo no rompemos el arranque, pero advertimos si faltan configuraciones importantes.
  if (!process.env.ALLOWED_ORIGINS) {
    warnings.push('ALLOWED_ORIGINS');
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    warnings.push('MP_ACCESS_TOKEN');
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    warnings.push('SMTP_USER/SMTP_PASS');
  }
}
if (!process.env.SENTRY_DSN) {
  warnings.push('SENTRY_DSN');
}

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : undefined;
if (allowedOrigins?.includes('*')) {
  if (nodeEnv === 'production') {
    throw new Error('ALLOWED_ORIGINS cannot contain wildcard "*" in production. Use explicit origins separated by commas.');
  }
  warnings.push('ALLOWED_ORIGINS contiene wildcard "*". Evita usarlo en producción.');
}

const allowedJwtAlgorithms = ['HS256', 'HS384', 'HS512'];
const jwtAlgorithm = process.env.JWT_ALGORITHM || 'HS256';
if (!allowedJwtAlgorithms.includes(jwtAlgorithm)) {
  throw new Error(`JWT_ALGORITHM inválido. Valores permitidos: ${allowedJwtAlgorithms.join(', ')}`);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  warnings.push('JWT_SECRET es demasiado corto. Usa al menos 32 caracteres.');
}

function normalizeRoute(route, fallback) {
  if (!route) return fallback;
  if (typeof route !== 'string') return fallback;
  return route.startsWith('/') ? route : `/${route}`;
}

const config = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  MP_PUBLIC_KEY: process.env.MP_PUBLIC_KEY,
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
  MP_CURRENCY: process.env.MP_CURRENCY || 'UYU',
  ALLOWED_ORIGINS: allowedOrigins,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  FORCE_HTTPS: (process.env.FORCE_HTTPS === '1' || process.env.FORCE_HTTPS === 'true'),
  METRICS_ENABLED: (process.env.METRICS_ENABLED === '1' || process.env.METRICS_ENABLED === 'true'),
  LOG_SLOW_REQUESTS_MS: parseInt(process.env.LOG_SLOW_REQUESTS_MS || '1000', 10),
  BCRYPT_ROUNDS: Math.max(10, parseInt(process.env.BCRYPT_ROUNDS || '12', 10)),
  JWT_ALGORITHM: jwtAlgorithm,
  METRICS_BASIC_AUTH_USER: process.env.METRICS_BASIC_AUTH_USER,
  METRICS_BASIC_AUTH_PASS: process.env.METRICS_BASIC_AUTH_PASS,
  METRICS_AUTH_ENABLED: Boolean(process.env.METRICS_BASIC_AUTH_USER && process.env.METRICS_BASIC_AUTH_PASS),
  SWAGGER_UI_ENABLED: process.env.SWAGGER_UI_ENABLED !== 'false',
  SWAGGER_BASIC_AUTH_USER: process.env.SWAGGER_BASIC_AUTH_USER,
  SWAGGER_BASIC_AUTH_PASS: process.env.SWAGGER_BASIC_AUTH_PASS,
  SWAGGER_BASIC_AUTH_ENABLED: Boolean(process.env.SWAGGER_BASIC_AUTH_USER && process.env.SWAGGER_BASIC_AUTH_PASS),
  SWAGGER_UI_ROUTE: normalizeRoute(process.env.SWAGGER_UI_ROUTE, '/api-docs'),
  SWAGGER_UI_JSON_ROUTE: normalizeRoute(process.env.SWAGGER_UI_JSON_ROUTE, '/api-docs.json'),
  BASE_URL: process.env.BASE_URL,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

config.SWAGGER_UI_ENABLED = process.env.SWAGGER_UI_ENABLED
  ? process.env.SWAGGER_UI_ENABLED !== 'false'
  : config.NODE_ENV !== 'production';

if (config.NODE_ENV === 'production') {
  if (config.METRICS_ENABLED && !config.METRICS_AUTH_ENABLED) {
    throw new Error('METRICS_ENABLED no puede estar activo en producción sin METRICS_BASIC_AUTH_USER y METRICS_BASIC_AUTH_PASS.');
  }
  if (config.SWAGGER_UI_ENABLED && !config.SWAGGER_BASIC_AUTH_ENABLED) {
    throw new Error('SWAGGER_UI_ENABLED no puede estar activo en producción sin SWAGGER_BASIC_AUTH_USER y SWAGGER_BASIC_AUTH_PASS.');
  }
}

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
}

if (warnings.length > 0) {
  console.warn(`Advertencias de configuración: ${warnings.join(', ')}`);
}

module.exports = config;
