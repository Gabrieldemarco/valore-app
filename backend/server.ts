
// backend/server.js - Modular con rutas extraídas a /routes
/**
 * @typedef {Object} Tenant
 * @property {number} id
 * @property {string} slug
 * @property {string} business_name
 * @property {string} [business_address]
 * @property {string} [business_phone]
 * @property {string} [brand_primary_color]
 * @property {string} [brand_secondary_color]
 * @property {string} [brand_logo_url]
 * @property {string} [status]
 * @property {string} [plan]
 * @property {string} [notification_email]
 * @property {object} [opening_hours]
 * @property {string} [trial_end_date]
 * @property {string} [landing_description]
 * @property {boolean} [landing_enabled]
 * @property {string} [landing_hero_image]
 * @property {string[]} [landing_gallery]
 * @property {Array} [landing_team]
 * @property {object} [landing_social_links]
 * @property {string} [landing_custom_css]
 * @property {Array} [landing_layout]
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import createEmailTransporter from './services/email';
import { isConfigured as isMercadoPagoConfigured, createPreference as mpCreatePreference } from './services/mercadopago-client';
import helmet from 'helmet';
import compression from 'compression';
import { initDB, query, pool } from './database';
require('dotenv').config();

import { generateMonthlyInvoices, sendPaymentReminders, suspendOverdueTenants, suspendExpiredFreeTrials, backupDatabase } from './cron-billing';
import logger from './services/logger';
import morgan from 'morgan';
import { MP_CURRENCY, MP_LOCALE, MP_COUNTRY, PLANS, loadPlanPricesFromDB } from './services/payment-config';
import { generateAvailableSlots } from './services/slots';
import { authenticateSuperAdmin } from './middleware';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './services/swagger';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

process.on('unhandledRejection', (reason: any) => {
  logger.error('UNHANDLED REJECTION', { error: reason?.message || reason });
});

process.on('uncaughtException', (err: any) => {
  logger.error('UNCAUGHT EXCEPTION', { error: err.message });
  process.exit(1);
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https:", "http:"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(morgan('short'));
if (process.env.ALLOWED_ORIGINS) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
} else {
  app.use(cors());
}
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== CONFIGURACIÓN DE MERCADOPAGO ==========
if (!isMercadoPagoConfigured()) {
  logger.warn('MercadoPago sin MP_ACCESS_TOKEN configurado. No se podrá procesar pagos.');
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/**
 * @param {{ invoice_number: string, amount: number|string, id: number }} invoice
 * @param {Tenant} tenant
 * @param {import('express').Request} req
 * @param {string} [returnPath]
 * @returns {Promise<any>}
 */
async function createMercadoPagoPreference(invoice, tenant, req, returnPath = '/staff/dashboard') {
  const origin = getBaseUrl(req);
  const returnUrl = `${origin}${returnPath}`;
  const preference = {
    items: [{
      title: `Factura ${invoice.invoice_number}`,
      quantity: 1,
      currency_id: MP_CURRENCY,
      unit_price: parseFloat(invoice.amount) || 0
    }],
    external_reference: String(invoice.id),
    back_urls: {
      success: `${returnUrl}?payment=success`,
      failure: `${returnUrl}?payment=failure`,
      pending: `${returnUrl}?payment=pending`
    },
    notification_url: `${origin}/api/payments/mercadopago/webhook`,
    auto_return: 'approved'
  };
  return mpCreatePreference(preference);
}

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: { error: 'Demasiados intentos' },
  standardHeaders: true,
  legacyHeaders: false
});

const appointmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.APPOINTMENT_RATE_LIMIT_MAX) || 20,
  message: { error: 'Demasiadas reservas' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || '3'),
  message: { error: 'Demasiados intentos de recuperación' },
  standardHeaders: true,
  legacyHeaders: false
});

initDB().then(async () => {
  await loadPlanPricesFromDB(query);
}).catch(err => logger.error('Error initDB', { error: err.message }));

// ========== ROUTES ==========
app.use('/api', require('./routes/auth').default(loginLimiter, passwordResetLimiter));
app.use('/api', require('./routes/mercadopago').default(createMercadoPagoPreference, MP_CURRENCY));
app.use('/api', require('./routes/tenant').default(createMercadoPagoPreference, MP_CURRENCY, MP_LOCALE, MP_COUNTRY, PLANS));
app.use('/api', require('./routes/superadmin').default(loginLimiter, createMercadoPagoPreference, MP_CURRENCY));
app.use('/p', require('./routes/public').default(generateAvailableSlots, appointmentLimiter));
app.use('/api', require('./routes/misc').default(apiLimiter));
app.use('/api', require('./routes/push').default());

// ========== SWAGGER API DOCS ==========
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ========== SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND ==========
const frontendPublicPath = path.join(__dirname, '..', 'frontend', 'public');
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');

// Servir build de Vite (React SPA) primero
app.use(express.static(frontendDistPath, { maxAge: '1d' }));

// Archivos legacy NO HTML (img, css, js) aún pueden ser necesarios
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) return next();
  express.static(frontendPublicPath, { maxAge: '1d' })(req, res, next);
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d' }));

// SPA catch-all: toda ruta de frontend va a la React app (React Router maneja 404s)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/p/') && !req.path.startsWith('/uploads')) {
    const spaPath = path.join(frontendDistPath, 'index.html');
    try {
      if (fs.existsSync(spaPath)) return res.sendFile(spaPath);
    } catch { /* fallback */ }
    // 404 legacy como último recurso
    const legacy404 = path.join(frontendPublicPath, '404.html');
    if (fs.existsSync(legacy404)) return res.status(404).sendFile(legacy404);
    res.status(404).send('Not found');
  }
});

// ========== PROGRAMAR TAREAS CRON ==========
cron.schedule('0 0 1 * *', async () => {
  console.log('⏰ Ejecutando facturación automática programada...');
  try {
    const result = await generateMonthlyInvoices();
    console.log('🧾 Resultado facturación:', result);
  } catch (err: any) {
    logger.error('❌ Error en facturación automática:', err);
  }
});

cron.schedule('0 8 * * *', async () => {
  console.log('🔍 Ejecutando verificación de trials vencidos...');
  try {
    const result = await suspendExpiredFreeTrials();
    console.log('🔒 Resultado suspensión de trials:', result);
  } catch (err: any) {
    logger.error('❌ Error en suspensión de trials:', err);
  }
});

cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Revisando tenants con trial por expirar...');
  try {
    const result = await query(
      `SELECT id, business_name, notification_email, trial_end_date
       FROM tenants
       WHERE plan = 'free' AND trial_end_date IS NOT NULL
       AND trial_end_date > NOW() AND trial_end_date < NOW() + INTERVAL '3 days'
       AND status = 'active'`
    );
    const tenants = result.rows || [];
    if (tenants.length === 0) return;

    const transporter = createEmailTransporter();

    for (const tenant of tenants) {
      const daysLeft = Math.ceil((new Date(tenant.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      await transporter.sendMail({
        from: `"Veloré" <${process.env.SMTP_USER}>`,
        to: tenant.notification_email,
        subject: 'Tu prueba gratuita está por terminar',
        html: `<p>Hola ${tenant.business_name},</p><p>Tu período de prueba de 15 días finaliza en ${daysLeft} días. Para continuar usando todos los beneficios, contrata un plan.</p><p>Saludos,<br>Equipo Veloré</p>`,
      });
      console.log(`📧 Recordatorio enviado a ${tenant.notification_email} (${daysLeft} días restantes)`);
    }
  } catch (err: any) {
    logger.error('Error en recordatorio de trial:', err);
  }
});

cron.schedule('0 10 * * *', async () => {
  console.log('🔔 Ejecutando recordatorios de pago...');
  try {
    const result = await sendPaymentReminders();
    console.log('📧 Resultado recordatorios:', result);
  } catch (err: any) {
    logger.error('❌ Error en recordatorios de pago:', err);
  }
});

cron.schedule('0 3 * * *', async () => {
  console.log('💾 Ejecutando backup de base de datos...');
  try {
    const result = await backupDatabase();
    console.log('💾 Resultado backup:', result);
  } catch (err: any) {
    logger.error('❌ Error en backup automático:', err);
  }
});

cron.schedule('0 23 * * *', async () => {
  console.log('🔒 Verificando tenants con facturas vencidas...');
  try {
    const result = await suspendOverdueTenants();
    console.log('🔒 Resultado suspensiones:', result);
  } catch (err: any) {
    logger.error('❌ Error en suspensiones:', err);
  }
});

console.log('⏰ Tareas programadas:');
console.log('  • Facturación: Día 1 de cada mes a las 00:00');
console.log('  • Backup DB: Diario a las 03:00');
console.log('  • Suspensión trials: Diario a las 08:00');
console.log('  • Recordatorio trial: Diario a las 09:00');
console.log('  • Recordatorio pagos: Diario a las 10:00');
console.log('  • Suspensión vencidos: Diario a las 23:00');

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 3000;
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`Backend activo: http://localhost:${PORT}`);
    logger.info('Multi-tenant: /p/:slug/...');
    logger.info('Staff: /api/staff/login');
    logger.info('Landing: GET /landing?tenant=slug');
    logger.info('Super Admin: /api/super-admin/login');
    logger.info(`Frontend servido desde: ${frontendPublicPath}`);
    logger.info('Recuperacion de contrasena: /staff/forgot-password');
  });
}

export = app;

// ========== GRACEFUL SHUTDOWN ==========
/**
 * @param {string} signal
 */
function gracefulShutdown(signal) {
  console.log(`\n🛑 Recibido ${signal}, cerrando servidor...`);
  server.close(() => {
    console.log('✅ HTTP server cerrado');
    pool.end().then(() => {
      console.log('✅ Pool de DB cerrado');
      process.exit(0);
    }).catch(err => {
      logger.error('❌ Error cerrando pool:', err.message);
      process.exit(1);
    });
  });
  setTimeout(() => {
    logger.error('⚠️ Forzando cierre después de 10s');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

