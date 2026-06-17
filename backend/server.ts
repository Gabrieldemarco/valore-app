
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
import os from 'os';
import path from 'path';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import createEmailTransporter from './services/email';
import { isConfigured as isMercadoPagoConfigured, createPreference as mpCreatePreference } from './services/mercadopago-client';
import helmet from 'helmet';
import compression from 'compression';
import { initDB, query, queryOne, pool } from './database';
import { AppError } from './services/errors';
import { i18nMiddleware } from './services/i18n';
import { closeRedis } from './services/redis';
require('dotenv').config();
const config = require('./config');
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  });
}
import { generateMonthlyInvoices, sendPaymentReminders, suspendOverdueTenants, suspendExpiredFreeTrials, backupDatabase, sendAppointmentReminders } from './cron-billing';
import logger, { stream as loggerStream } from './services/logger';
import morgan from 'morgan';
import { MP_CURRENCY, MP_LOCALE, MP_COUNTRY, PLANS, loadPlanPricesFromDB } from './services/payment-config';
import { generateAvailableSlots } from './services/slots';
import { authenticateSuperAdmin } from './middleware';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './services/swagger';
import { metricsMiddleware, createMetricsHandler, refreshDbPoolMetrics } from './services/metrics';
import metricsRegister from './services/metrics';

const app = express();

function createBasicAuthMiddleware(validUser: string, validPass: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="Protected"');
      return res.status(401).send('Unauthorized');
    }

    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = credentials.split(':');
    if (user !== validUser || pass !== validPass) {
      res.set('WWW-Authenticate', 'Basic realm="Protected"');
      return res.status(401).send('Unauthorized');
    }

    next();
  };
}

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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "https://oauth2.googleapis.com", "https://www.googleapis.com"],
      frameSrc: ["'self'", "https:", "http:", "https://challenges.cloudflare.com"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.crossOriginResourcePolicy({ policy: 'same-origin' }));
app.use(helmet.dnsPrefetchControl());
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
app.use(helmet.permittedCrossDomainPolicies());
const hpp = require('hpp');
app.use(hpp());
const responseTime = require('response-time');
app.use(responseTime());
app.use(compression());
app.use(morgan('combined', { stream: loggerStream }));
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}
if (config.METRICS_ENABLED) {
  app.use(metricsMiddleware);
}
if (config.ALLOWED_ORIGINS) {
  app.use(cors({ origin: config.ALLOWED_ORIGINS, credentials: true }));
} else {
  app.use(cors());
}

// En producción/config.FORCE_HTTPS, forzar HTTPS y HSTS
if (config.FORCE_HTTPS) {
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  });
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 50,
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

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes públicas' },
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

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '30'),
  message: { error: 'Demasiadas solicitudes de webhook' },
  standardHeaders: true,
  legacyHeaders: false
});

initDB().then(async () => {
  await loadPlanPricesFromDB(query);
}).catch(err => logger.error('Error initDB', { error: err.message }));

// ========== I18N ==========
app.use(i18nMiddleware);

// ========== ROUTES ==========
app.use('/p', require('./routes/public').default(generateAvailableSlots, appointmentLimiter, publicLimiter));
app.use('/api', apiLimiter);
app.use('/api', require('./routes/auth').default(loginLimiter, passwordResetLimiter));
app.use('/api', require('./routes/mercadopago').default(createMercadoPagoPreference, MP_CURRENCY, webhookLimiter));
app.use('/api', require('./routes/tenant').default(createMercadoPagoPreference, MP_CURRENCY, MP_LOCALE, MP_COUNTRY, PLANS));
app.use('/api', require('./routes/superadmin').default(loginLimiter, createMercadoPagoPreference, MP_CURRENCY));
app.use('/api', require('./routes/misc').default(apiLimiter));
app.use('/api', require('./routes/push').default());
app.use('/api', require('./routes/google').default());
app.use('/', require('./routes/calendar').default());

// ========== SWAGGER API DOCS ==========
if (config.SWAGGER_UI_ENABLED) {
  if (config.NODE_ENV === 'production' && !config.SWAGGER_BASIC_AUTH_ENABLED) {
    logger.warn('Swagger UI deshabilitado en producción porque no hay autenticación básica configurada. Establece SWAGGER_BASIC_AUTH_USER y SWAGGER_BASIC_AUTH_PASS o deshabilita SWAGGER_UI_ENABLED.');
  } else {
    const swaggerAuth = config.SWAGGER_BASIC_AUTH_ENABLED
      ? createBasicAuthMiddleware(config.SWAGGER_BASIC_AUTH_USER, config.SWAGGER_BASIC_AUTH_PASS)
      : undefined;

    if (swaggerAuth) {
      app.use(config.SWAGGER_UI_ROUTE, swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      app.get(config.SWAGGER_UI_JSON_ROUTE, swaggerAuth, (req, res) => res.json(swaggerSpec));
    } else {
      app.use(config.SWAGGER_UI_ROUTE, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      app.get(config.SWAGGER_UI_JSON_ROUTE, (req, res) => res.json(swaggerSpec));
    }
  }
}
if (config.METRICS_ENABLED) {
  if (config.NODE_ENV === 'production' && !config.METRICS_AUTH_ENABLED) {
    logger.warn('Endpoint /metrics deshabilitado en producción porque no hay autenticación básica configurada. Establece METRICS_BASIC_AUTH_USER y METRICS_BASIC_AUTH_PASS o deshabilita METRICS_ENABLED.');
  } else {
    const metricsHandlerInstance = createMetricsHandler(pool);
    const metricsAuth = config.METRICS_AUTH_ENABLED
      ? createBasicAuthMiddleware(config.METRICS_BASIC_AUTH_USER, config.METRICS_BASIC_AUTH_PASS)
      : undefined;

    app.get('/metrics', metricsAuth || ((req, res, next) => next()), metricsHandlerInstance);
    app.get('/monitoring/summary', metricsAuth || ((req, res, next) => next()), async (req, res) => {
      try {
        if (pool) refreshDbPoolMetrics(pool);
        const metrics = await metricsRegister.getMetricsAsJSON();
        res.json({
          status: 'ok',
          environment: config.NODE_ENV,
          uptime_seconds: Math.round(process.uptime()),
          memory_usage: process.memoryUsage(),
          load_average: os.loadavg(),
          db_pool: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount,
          },
          metrics,
        });
      } catch (err: any) {
        res.status(500).json({ error: 'Error al obtener métricas', detail: err.message });
      }
    });
  }
}

// ========== SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND ==========
const frontendPublicPath = path.join(__dirname, '..', 'frontend', 'public');
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');

// Servir build de Vite (React SPA) primero
// index.html y sw.js nunca se cachean para que los usuarios vean updates al instante
app.use((req, res, next) => {
  if (req.path === '/index.html' || req.path === '/' || req.path === '/sw.js') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
}, express.static(frontendDistPath, { maxAge: '1d', dotfiles: 'ignore', index: false }));

// Archivos legacy NO HTML (img, css, js) aún pueden ser necesarios
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) return next();
  express.static(frontendPublicPath, { maxAge: '1d', dotfiles: 'ignore', index: false })(req, res, next);
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d', dotfiles: 'ignore', index: false }));

// ========== SSR LANDING PAGE: pre-render hero + inject data ==========
function fixImageUrlServer(url, req) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) {
    const base = process.env.BASE_URL || req.protocol + '://' + req.get('host');
    return base + url;
  }
  return url;
}

function prerenderHero(tenant, req) {
  const heroImage = fixImageUrlServer(tenant.landing_hero_image, req);
  const logo = fixImageUrlServer(tenant.brand_logo_url, req);
  const name = tenant.business_name || '';
  const description = tenant.landing_description || '';
  return '<section class="hero">'
    + (heroImage ? '<div class="hero-image" style="background-image:url(' + heroImage.replace(/"/g, '&quot;') + ')"></div>' : '')
    + '<div class="hero-content">'
    + (logo ? '<img src="' + logo.replace(/"/g, '&quot;') + '" alt="' + name + '" class="hero-logo">' : '')
    + '<h1>' + name + '</h1>'
    + (description ? '<p>' + description + '</p>' : '')
    + '<a href="#reservar" class="btn btn-primary btn-lg">Reservar turno</a>'
    + '<div class="hero-trust"><span>Atención personalizada</span><span>Resultados garantizados</span></div>'
    + '</div></section>';
}

app.get('/p/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const tenantRow = await queryOne(
      `SELECT id, slug, business_name, business_address, business_phone,
              brand_primary_color, brand_secondary_color, brand_logo_url,
              landing_description, landing_hero_image,
              landing_gallery, landing_team, landing_social_links,
              landing_custom_css, landing_layout, opening_hours, captcha_enabled
       FROM tenants WHERE slug = $1`,
      [slug]
    );
    if (!tenantRow) return next();

    const servicesRows = await query(
      'SELECT id, name, duration, price, image FROM services WHERE tenant_id = $1 AND active = true ORDER BY name',
      [tenantRow.id]
    );

    const initialData = {
      tenant: {
        ...tenantRow,
        opening_hours: typeof tenantRow.opening_hours === 'string'
          ? JSON.parse(tenantRow.opening_hours) : tenantRow.opening_hours,
      },
      services: servicesRows.rows,
    };

    const spaPath = path.join(frontendDistPath, 'index.html');
    if (!fs.existsSync(spaPath)) return next();

    let html = fs.readFileSync(spaPath, 'utf-8');
    const primaryColor = tenantRow.brand_primary_color || '#7c3aed';
    const secondaryColor = tenantRow.brand_secondary_color || '#a855f7';
    const customCss = tenantRow.landing_custom_css || '';

    html = html.replace('</head>',
      '<style>:root{--primary:' + primaryColor + ';--accent:' + secondaryColor + '}'
      + (customCss ? ' ' + customCss : '') + '</style></head>');
    html = html.replace('<div id="root">',
      '<script>window.__INITIAL_DATA__='
      + JSON.stringify(initialData).replace(/</g, '\\u003c')
      + ';window.__CAPTCHA_SITE_KEY__=' + JSON.stringify(config.TURNSTILE_SITE_KEY || '') + '</script><div id="root">'
      + prerenderHero(tenantRow, req));

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(html);
  } catch (err) {
    next();
  }
});

// SPA catch-all: toda ruta de frontend va a la React app (React Router maneja 404s)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
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

// ========== SENTRY ERROR HANDLER ==========
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err: any, req: any, res: any, next: any) => {
  const { formatError } = require('./services/errors');
  const isAppError = err instanceof AppError;
  logger.error(isAppError ? err.message : 'Unhandled request error', {
    error: err.message,
    stack: err.stack,
    path: req?.path,
    method: req?.method,
    code: err.code,
  });

  if (res.headersSent) {
    return next(err);
  }
  const { status, body } = formatError(err);
  res.status(status).json(body);
});

// ========== PROGRAMAR TAREAS CRON ==========
cron.schedule('0 0 1 * *', async () => {
  logger.info('⏰ Ejecutando facturación automática programada...');
  try {
    const result = await generateMonthlyInvoices();
    logger.info('🧾 Resultado facturación:', result);
  } catch (err: any) {
    logger.error('❌ Error en facturación automática:', err);
  }
});

cron.schedule('0 8 * * *', async () => {
  logger.info('🔍 Ejecutando verificación de trials vencidos...');
  try {
    const result = await suspendExpiredFreeTrials();
    logger.info('🔒 Resultado suspensión de trials:', result);
  } catch (err: any) {
    logger.error('❌ Error en suspensión de trials:', err);
  }
});

cron.schedule('0 20 * * *', async () => {
  logger.info('🔔 Ejecutando recordatorios de turnos para mañana...');
  try {
    const result = await sendAppointmentReminders();
    logger.info('🔔 Resultado recordatorios:', result);
  } catch (err: any) {
    logger.error('❌ Error en recordatorios de turnos:', err);
  }
});

cron.schedule('0 9 * * *', async () => {
  logger.info('🔔 Revisando tenants con trial por expirar...');
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
        from: `"Velsoie" <${process.env.SMTP_USER}>`,
        to: tenant.notification_email,
        subject: 'Tu prueba gratuita está por terminar',
        html: `<p>Hola ${tenant.business_name},</p><p>Tu período de prueba de 15 días finaliza en ${daysLeft} días. Para continuar usando todos los beneficios, contrata un plan.</p><p>Saludos,<br>Equipo Velsoie</p>`,
      });
      logger.info(`📧 Recordatorio enviado a ${tenant.notification_email} (${daysLeft} días restantes)`);
    }
  } catch (err: any) {
    logger.error('Error en recordatorio de trial:', err);
  }
});

cron.schedule('0 10 * * *', async () => {
  logger.info('🔔 Ejecutando recordatorios de pago...');
  try {
    const result = await sendPaymentReminders();
    logger.info('📧 Resultado recordatorios:', result);
  } catch (err: any) {
    logger.error('❌ Error en recordatorios de pago:', err);
  }
});

cron.schedule('0 3 * * *', async () => {
  logger.info('💾 Ejecutando backup de base de datos...');
  try {
    const result = await backupDatabase();
    logger.info('💾 Resultado backup:', result);
  } catch (err: any) {
    logger.error('❌ Error en backup automático:', err);
  }
});

cron.schedule('0 23 * * *', async () => {
  logger.info('🔒 Verificando tenants con facturas vencidas...');
  try {
    const result = await suspendOverdueTenants();
    logger.info('🔒 Resultado suspensiones:', result);
  } catch (err: any) {
    logger.error('❌ Error en suspensiones:', err);
  }
});

// ========== SINCRONIZACIÓN GOOGLE CALENDAR (cada 30 min) ==========
cron.schedule('*/30 * * * *', async () => {
  try {
    const tokens = await query(
      'SELECT gct.staff_id, gct.tenant_id FROM google_calendar_tokens gct WHERE gct.sync_enabled = true AND gct.refresh_token IS NOT NULL'
    );
    for (const row of tokens.rows) {
      try {
        const { syncStaffCalendar } = require('./services/google-calendar');
        await syncStaffCalendar(row.staff_id, row.tenant_id);
      } catch (err: any) {
        logger.error(`Calendar auto-sync error for staff ${row.staff_id}:`, err.message);
      }
    }
  } catch (err: any) {
    logger.error('Calendar auto-sync cron error:', err.message);
  }
});

logger.info('⏰ Tareas programadas:');
logger.info('  • Facturación: Día 1 de cada mes a las 00:00');
logger.info('  • Backup DB: Diario a las 03:00');
logger.info('  • Suspensión trials: Diario a las 08:00');
logger.info('  • Recordatorio turnos: Diario a las 20:00');
logger.info('  • Recordatorio trial: Diario a las 09:00');
logger.info('  • Recordatorio pagos: Diario a las 10:00');
logger.info('  • Suspensión vencidos: Diario a las 23:00');
logger.info('  • Google Calendar Sync: Cada 30 minutos');

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 3000;
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`Backend activo: http://localhost:${PORT}`);
    logger.info('Entorno:', { NODE_ENV: config.NODE_ENV, FORCE_HTTPS: config.FORCE_HTTPS });
    logger.info('Monitoreo:', { METRICS_ENABLED: config.METRICS_ENABLED, METRICS_AUTH_ENABLED: config.METRICS_AUTH_ENABLED });
    logger.info('Documentacion:', { SWAGGER_UI_ENABLED: config.SWAGGER_UI_ENABLED, SWAGGER_BASIC_AUTH_ENABLED: config.SWAGGER_BASIC_AUTH_ENABLED, SWAGGER_UI_ROUTE: config.SWAGGER_UI_ROUTE });
    logger.info('CORS:', { allowedOrigins: config.ALLOWED_ORIGINS ? config.ALLOWED_ORIGINS.join(', ') : 'any' });
    logger.info('Rutas clave:', { multiTenant: '/p/:slug/...', staffLogin: '/api/staff/login', superAdminLogin: '/api/super-admin/login', forgotPassword: '/staff/forgot-password' });
    logger.info(`Frontend servido desde: ${frontendPublicPath}`);
  });
}

export = app;

// ========== GRACEFUL SHUTDOWN ==========
/**
 * @param {string} signal
 */
function gracefulShutdown(signal) {
  logger.info(`\n🛑 Recibido ${signal}, cerrando servidor...`);
  server.close(() => {
    logger.info('✅ HTTP server cerrado');
    pool.end().then(async () => {
      logger.info('✅ Pool de DB cerrado');
      await closeRedis();
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

