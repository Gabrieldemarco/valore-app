# Auditoría Completa Backend Velsoie - Local vs VPS

## Resumen Ejecutivo

El backend tiene **3 formas de despliegue** que usan configuraciones distintas:
1. **Local Development**: `tsx server.ts` con `.env` directo (PostgreSQL local, Redis local)
2. **VPS con PM2**: `ecosystem.config.js` + PM2 (PostgreSQL local/remoto, Redis local/remoto)
3. **VPS con Docker**: `docker-compose.yml` (contenedores PostgreSQL, Redis, App)

---

## 1. Configuración por Entorno

| Variable | Local (.env) | VPS PM2 (ecosystem.config.js) | VPS Docker (docker-compose.yml) |
|----------|--------------|-------------------------------|----------------------------------|
| **NODE_ENV** | No definido → `development` | `production` (env) / `development` (env_development) | `production` |
| **PORT** | 3000 | 3000 | 3000 |
| **DATABASE_URL** | `postgresql://velsoie:...@localhost:5432/agenda_app` | Heredada de `.env` | `postgresql://postgres:${DB_PASSWORD}@postgres:5432/${DB_NAME}` |
| **REDIS** | `127.0.0.1:6379` (default en notificationQueue) | Heredado de `.env` | `redis://redis:6379` |
| **SMTP_SERVICE** | `gmail` | Heredado | No definido (usa SMTP_HOST/PORT) |
| **SMTP_USER** | `velsoie09@gmail.com` | Heredado | `${SMTP_USER}` |
| **SMTP_PASS** | `amekbgfulmqlxfcr` | Heredado | `${SMTP_PASS}` |
| **ALLOWED_ORIGINS** | `https://velsoie.com,https://www.velsoie.com,https://www.nexo-dev.com,https://nexo-dev.com` | Heredado | `${ALLOWED_ORIGINS}` |
| **BASE_URL** | `https://velsoie.com` | Heredado | `${BASE_URL}` |
| **FORCE_HTTPS** | **NO DEFINIDO** | Heredado | **NO DEFINIDO** |
| **FRONTEND_URL** | `https://velsoie.com` | Heredado | `${FRONTEND_URL}` |

---

## 2. Diferencias Críticas Detectadas

### ❌ PROBLEMAS EN PRODUCCIÓN (VPS)

| Problema | Impacto | Ubicación |
|----------|---------|-----------|
| **FORCE_HTTPS no configurado** | No fuerza HTTPS, HSTS deshabilitado | `.env`, `docker-compose.yml`, `ecosystem.config.js` |
| **SMTP_PASS puede ser App Password vencido** | Error 535 "Invalid login" | `.env` línea 43 |
| **Google OAuth origins** | Error 5 "Origin not allowed" | Google Cloud Console (no en código) |
| **SENTRY_DSN no configurado** | Sin monitoreo de errores | `.env`, `docker-compose.yml` |
| **TURNSTILE keys no configuradas** | CAPTCHA no funciona en producción | `.env` |
| **TWILIO no configurado** | WhatsApp en modo simulado | `.env`, `docker-compose.yml` |
| **WORKER notificaciones** | Se inicia en `server.ts` línea 56 - ¿se ejecuta en PM2 cluster? | `server.ts:56` |

### ⚠️ INCONSISTENCIAS ENTRE ENTORNOS

| Diferencia | Local | VPS Docker | VPS PM2 |
|------------|-------|------------|---------|
| DB Host | `localhost` | `postgres` (container) | `localhost` o IP externa |
| DB User/Pass | `velsoie:2d9730f2...` | `postgres:${DB_PASSWORD}` | Depende de `.env` |
| Redis Host | `127.0.0.1` | `redis` (container) | `127.0.0.1` o IP externa |
| SMTP Config | `SMTP_SERVICE=gmail` | `SMTP_HOST/PORT/SECURE` | `SMTP_SERVICE=gmail` |

---

## 3. Arquitectura de Notificaciones (Crítico para SMTP)

```
cron-billing.ts (sendAppointmentReminders)
    │
    ▼
notifications.ts (notifyStaff, sendClientConfirmation)
    │
    ▼
notificationQueue.ts (BullMQ + Redis)
    │
    ▼
notificationWorker.ts (Worker BullMQ - concurrency: 5)
    │
    ├── Email → createEmailTransporterWithGoogle()
    │       ├── Intenta Gmail XOAUTH2 (si tenantId + google_smtp_tokens)
    │       └── Fallback: SMTP tradicional (SMTP_USER/SMTP_PASS o per-tenant)
    ├── WhatsApp → Twilio
    ├── Push → Web Push (VAPID)
    └── SMS → Simulado
```

**Puntos clave:**
- Emails se encolan en Redis (BullMQ), NO se envían síncronamente
- Worker procesa la cola asíncronamente
- Si Redis falla → las notificaciones NO se envían
- Per-tenant SMTP: columnas `smtp_email`, `smtp_password` en tabla `tenants`

---

## 4. Google OAuth - Dos Flujos Distintos

| Flujo | Callback URL | Uso |
|-------|--------------|-----|
| **Google Sign-In (Clientes/Staff)** | `GOOGLE_CALLBACK_URL` = `https://velsoie.com/api/auth/google/callback` | Login usuarios |
| **Google SMTP OAuth (Por tenant)** | `GOOGLE_SMTP_CALLBACK_URL` = `https://velsoie.com/auth/google/callback` | Autorizar Gmail per-tenant |

**Ambos requieren en Google Cloud Console:**
- Authorized JavaScript origins: `https://velsoie.com`, `https://www.velsoie.com`
- Authorized redirect URIs: ambas callback URLs
- OAuth consent screen: **Publicado en Production** (no Testing)

---

## 5. Cron Jobs Programados (server.ts)

| Horario | Función | Descripción |
|---------|---------|-------------|
| `0 0 1 * *` | `generateMonthlyInvoices()` | Facturación mensual planes pagos |
| `0 8 * * *` | `suspendExpiredFreeTrials()` | Suspender trials vencidos |
| `0 20 * * *` | `sendAppointmentReminders()` | **Recordatorios turnos (ENVÍA EMAILS)** |
| `0 9 * * *` | Trial ending warning | Aviso trial por expirar (3 días) |
| `0 10 * * *` | `sendPaymentReminders()` | Recordatorios pago (3 días antes) |
| `0 3 * * *` | `backupDatabase()` | Backup DB (pg_dump) |
| `0 23 * * *` | `suspendOverdueTenants()` | Suspender facturas vencidas >7 días |
| `*/30 * * * *` | Google Calendar sync | Sincronizar calendarios staff |

---

## 6. Variables Faltantes en .env Actual vs .env.example

| Variable | En .env | En .env.example | Estado |
|----------|---------|-----------------|--------|
| `FORCE_HTTPS` | ❌ | ✅ | **FALTA** |
| `SENTRY_DSN` | ❌ | ✅ | **FALTA** |
| `TURNSTILE_SECRET_KEY` | ❌ | ✅ | **FALTA** |
| `TURNSTILE_SITE_KEY` | ❌ | ✅ | **FALTA** |
| `STRIPE_SECRET_KEY` | ❌ | ✅ | No usada (opcional) |
| `STRIPE_WEBHOOK_SECRET` | ❌ | ✅ | No usada (opcional) |
| `TWILIO_ACCOUNT_SID` | ❌ | ✅ | **FALTA** (WhatsApp simulado) |
| `TWILIO_AUTH_TOKEN` | ❌ | ✅ | **FALTA** |
| `TWILIO_WHATSAPP_FROM` | ❌ | ✅ | **FALTA** |
| `LOG_LEVEL` | ❌ | ✅ | Opcional |
| `DB_SSL_REJECT_UNAUTHORIZED` | ❌ | ✅ | Opcional |
| `DB_POOL_MAX` | ❌ | ✅ | Opcional (default 30) |
| `METRICS_ENABLED` | ❌ | ✅ | Opcional |
| `SWAGGER_UI_ENABLED` | ❌ | ✅ | Opcional |
| `SWAGGER_BASIC_AUTH_USER/PASS` | ❌ | ✅ | **REQUERIDO si Swagger en prod** |

---

## 7. Plan de Acción Priorizado

### 🔴 CRÍTICO (Bloquean producción)

1. **Configurar FORCE_HTTPS=true** en `.env`, `docker-compose.yml`, `ecosystem.config.js`
2. **Regenerar App Password Gmail** (2FA obligatorio) → actualizar `SMTP_PASS` en `.env`
3. **Google Cloud Console**: Agregar origins + publicar consent screen
4. **Verificar Redis accesible** en VPS (¿contenedor o externo?)
5. **Verificar PostgreSQL accesible** en VPS (¿contenedor o externo?)

### 🟡 IMPORTANTE (Funcionalidad completa)

6. **Configurar TURNSTILE** (Cloudflare CAPTCHA) - keys en .env
7. **Configurar TWILIO** para WhatsApp real (Account SID, Auth Token, From number)
8. **Configurar SENTRY_DSN** para monitoreo errores
9. **Agregar variables Swagger/Metrics auth** si se usan en producción

### 🟢 MEJORAS (Consistencia)

10. **Unificar configuración DB/Redis** entre Docker y PM2
11. **Documentar despliegue PM2 vs Docker** (¿cuál se usa en VPS?)
12. **Health check** incluye DB pero no Redis - agregar check Redis
13. **Worker notificaciones** - verificar que no haya múltiples workers en PM2 cluster mode

---

## 8. Pruebas de Validación Post-Fix

```bash
# 1. Verificar variables de entorno
NODE_ENV=production node scripts/check-env.js

# 2. Test health check (incluye DB)
curl https://velsoie.com/api/health

# 3. Test SMTP real (desencolar notificación de prueba)
# Revisar logs: "✅ Email enviado a:" vs "📧 [SIMULADO]"

# 4. Test Google OAuth
# Intentar login desde https://velsoie.com

# 5. Test cron recordatorios (forzar ejecución o esperar 20:00)
# Ver logs: "🔔 [CRON] Enviando recordatorios..."

# 6. Verificar worker notificaciones corriendo
# pm2 list | grep notification  (si usa PM2)
# docker logs <container> | grep "Worker de notificaciones"
```

---

## 9. Archivos Clave a Modificar

| Archivo | Cambios Necesarios |
|---------|-------------------|
| `backend/.env` | Agregar FORCE_HTTPS, SENTRY_DSN, TURNSTILE, TWILIO, regenerar SMTP_PASS |
| `docker-compose.yml` | Agregar FORCE_HTTPS, SENTRY_DSN, TURNSTILE, TWILIO, SMTP vars |
| `ecosystem.config.js` | Agregar FORCE_HTTPS, SENTRY_DSN, TURNSTILE, TWILIO en env |
| `backend/config.js` | Ya valida correctamente (requiere SMTP en prod) |

---

## 10. Preguntas para Definir Estrategia

1. **¿VPS usa PM2 o Docker?** (ecosystem.config.js vs docker-compose.yml)
2. **¿Base de datos en contenedor Docker o PostgreSQL externo/gestionado?**
3. **¿Redis en contenedor Docker o Redis externo/gestionado?**
4. **¿SMTP global (velsoie09@gmail.com) o per-tenant Gmail OAuth?**
5. **¿Stripe se va a usar o solo MercadoPago?**

---

**Estado actual**: Backend funcional en local, problemas de configuración en VPS (SMTP, OAuth, HTTPS). El código de notificaciones está bien implementado con queue asíncrona, el problema es puramente configuración de credenciales y origins OAuth.

---

## 2. Arquitectura

### 2.1 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Backend** | Node.js 20+ + Express + TypeScript |
| **Frontend** | Vite 8 + React 19 + TypeScript |
| **Base de datos** | PostgreSQL 16 (raw queries con `pg`) |
| **Cache** | Redis 7 + memory-cache (NodeCache) |
| **Auth** | JWT (jsonwebtoken, HS256) |
| **Pagos** | MercadoPago SDK (UYU) + Stripe SDK (USD) |
| **WhatsApp** | Twilio API |
| **Email** | Nodemailer (SMTP) |
| **Tests** | Jest (backend), Vitest + Testing Library (frontend), Playwright (E2E) |
| **CI/CD** | GitHub Actions |
| **Infra** | Docker, PM2 |
| **Monitoreo** | Prometheus (`/metrics`), Sentry, Winston logging, Swagger/OpenAPI |

### 2.2 Estructura de Directorios

```
agenda-app/
├── backend/
│   ├── server.ts              # Entry point, config Express, SSR landing, cron, static serving
│   ├── config.js              # Validación de env vars, CORS, JWT algo, Swagger/Metrics auth
│   ├── database.ts            # Pool PG, query/queryOne/getClient, initDB (inline schema + seed)
│   ├── cron-billing.ts        # Cron jobs: facturación mensual, trials, recordatorios, backups
│   ├── routes/
│   │   ├── auth.ts            # /api/register, /api/login, /api/staff/login, /api/staff/register,
│   │   │                      #   /api/staff/forgot-password, /api/staff/reset-password
│   │   │                      #   /client/* (verificar email, recuperar password)
│   │   ├── public.ts          # /p/:slug/* — landing config, services, staff, availability,
│   │   │                      #   POST appointments (booking), manage/cancel/reschedule,
│   │   │                      #   waitlist, reviews, validate-coupon
│   │   ├── tenant.ts          # /api/* — full staff dashboard: appointments, staff, services,
│   │   │                      #   categories, clients, coupons, products, sales (POS),
│   │   │   tenant settings, blocked dates, analytics/stats
│   │   ├── superadmin.ts      # /api/super-admin/* — tenants CRUD, invoices, payments,
│   │   │                      #   plan prices, global config
│   │   ├── mercadopago.ts     # Webhook IPN, payment preferences
│   │   ├── stripe.ts          # Stripe checkout sessions, webhooks
│   │   ├── misc.ts            # /api/health, /api/tenants (directorio público),
│   │   │                      #   /api/tenants/nearby, /api/upload-image, /api/agenda (personal)
│   │   ├── google.ts          # Google OAuth login
│   │   ├── calendar.ts        # Google Calendar sync endpoints
│   │   ├── push.ts            # Web push subscription management
│   ├── services/
│   │   ├── billing.ts         # Subscription logic, invoice creation, plan activation
│   │   ├── notifications.ts   # Email + WhatsApp + push a client y staff
│   │   ├── slots.ts           # Generación de slots de disponibilidad
│   │   ├── twilio.ts          # WhatsApp messaging
│   │   ├── email.ts           # Nodemailer transporter
│   │   ├── payment-config.ts  # PLANS (free/basico/estandar/premium), precios, discounts
│   │   ├── mercadopago-client.ts, stripe-client.ts
│   │   ├── logger.ts          # Winston logger
│   │   ├── metrics.ts         # Prometheus metrics
│   │   ├── swagger.ts         # OpenAPI spec generation
│   │   ├── i18n.ts            # i18n middleware (es-UY por defecto)
│   │   ├── cache.ts           # Redis client
│   │   ├── redis.ts           # Redis client wrapper
│   │   ├── errors.ts          # AppError, formatError
│   │   ├── google-calendar.ts # Google Calendar API sync
│   │   ├── web-push.ts        # VAPID push notifications
│   ├── middleware/
│   │   └── index.ts           # validate, authenticate, authenticateStaff,
│   │                          #   authenticateSuperAdmin, checkTenantActive,
│   │                           #   checkTrialExpiration, checkPlanLimits, identifyTenant
│   ├── migrations/            # SQL migrations 001-030
│   ├── tests/                 # Jest unit tests + integration + E2E (Playwright)
│   ├── seed.ts, seed-noba-spa.ts
│   ├── tsconfig.json          # Strict mode, CommonJS
│   └── package.json
├── frontend-vite/
│   ├── src/
│   │   ├── App.tsx            # React Router v7, lazy loading pages, providers
│   │   ├── main.tsx           # React 19 root, PWA registration
│   │   ├── api/client.ts      # fetch wrapper con cache, auth tokens
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx  # JWT tokens en localStorage (staff/client/superAdmin)
│   │   │   ├── ThemeContext.tsx # light/dark theme
│   │   ├── i18n.ts            # i18next con es/en/pt
│   │   ├── locales/           # es.json, en.json, pt.json
│   │   ├── pages/
│   │   │   ├── public/        # Landing, PublicIndex, AppointmentManage, booking/*, Terms
│   │   │   ├── staff/         # Login, Register, ForgotPassword, ResetPassword, Dashboard, LandingEditor
│   │   │   ├── admin/         # Login, Dashboard (super admin)
│   │   │   ├── client/        # Login, Register, Dashboard, ForgotPassword, ResetPassword
│   │   ├── components/        # ErrorBoundary, PhoneInput, LanguageSwitcher, etc.
│   │   ├── hooks/             # usePushNotifications, useGeo, useInstallPrompt, usePullToRefresh
│   │   ├── services/          # offlineCache, logger
│   │   ├── utils/             # whatsapp, sanitize, phoneFlags, invoicePdf, imageUtils
│   │   ├── styles/            # landing.css, dashboard.css, fullcalendar.css, themeColors, etc.
│   │   ├── sw.ts              # Service worker custom logic
│   │   └── test/              # setup.ts
│   ├── vite.config.ts         # Proxy a backend:3000, PWA, Vitest (jsdom)
│   ├── tsconfig*.json
│   └── package.json
├── frontend/                  # Legacy/static files (public html, css, js)
├── frontend/dist/            # Vite build output (served by Express)
├── docker-compose.yml
└── README.md
```

### 2.3 Modelo de Datos (DB Schema)

**Tablas principales:**

| Tabla | Descripción |
|---|---|
| `tenants` | Información del negocio (slug, nombre, branding, horarios, plan, status, trial, lat/lng) |
| `users` | Usuarios clientes (register/login) |
| `staff` | Profesionales del tenant (email, password, role, horarios individuales, especialidades, foto, bio, comisiones) |
| `services` | Servicios ofrecidos (duración, precio, categoría, imagen, descripción, depósito) |
| `appointments` | Turnos (cliente, servicio, staff, fecha, estado, notas, coupon, depósito, recurring) |
| `service_categories` | Categorías de servicios (parent/child, árbol) |
| `service_images` | Imágenes múltiples por servicio |
| `reviews` | Reseñas de clientes (rating 1-5, aprobadas) |
| `coupons` | Cupones de descuento (percentage/fixed) |
| `products` | Inventario de productos |
| `sales` | Ventas POS (items JSON, total, método de pago) |
| `waitlist` | Lista de espera |
| `blocked_dates` | Fechas bloqueadas |
| `invoices` | Facturas (tenants, amount, status, due_date) |
| `payments` | Pagos (mp_payment_id, stripe, status) |
| `plan_prices` | Precios de planes (con promos) |
| `app_config` | Configuración global (clave/valor JSON) |
| `google_calendar_tokens` | Tokens OAuth de Google Calendar por staff |
| `super_admins` | Administradores del sistema |
| `push_subscriptions` | Suscripciones push (PWA) |
| `personal_agenda` | Agenda personal de usuarios cliente |

**Planes:** `free` (15-day trial, límites: 1 staff, 5 servicios, 5 productos, 10 citas/día), `basico`, `estandar`, `premium` (sin límites). Promos de lanzamiento: 3 meses con precio reducido.

### 2.4 Roles y Autenticación

| Rol | Token | Alcance |
|---|---|---|
| `client` | `/api/login` → `clientToken` | Agenda personal, buscar turnos propios |
| `staff` | `/api/staff/login` → `staffToken` | Dashboard staff (CRUD turnos, staff, servicios, clientes, config) |
| `admin` (staff) | same endpoint → `staffToken` | Mismo dashboard + configuración del tenant |
| `super_admin` | `/api/super-admin/login` → `superAdminToken` | CRUD tenants, facturas, precios, config global |

JWT contiene: `{ id, role, tenant_id (staff), email, name }`. Middleware verifica `role` contra whitelist. Todos los endpoints staff/admin usan `authenticateStaff` + `checkTenantActive` + `checkTrialExpiration`.

### 2.5 Rutas API (por prefijo)

- **`/p/:slug/*`** — Landing pública y booking (sin auth). Identifica tenant por slug.
- **`/api/auth/*`** — Auth (register, login, staff login/register, forgot/reset password, verify-email).
- **`/api/*`** — Dashboard staff (appointments, staff, services, clients, coupons, products, sales, stats, settings, blocked dates, waitlist).
- **`/api/super-admin/*`** — Panel admin (tenants CRUD, invoices, payments, plan prices, config).
- **`/api/payments/*`** — MercadoPago + Stripe webhooks y checkout.
- **`/api/misc/*`** — Health, tenants list, nearby search, upload, agenda personal.

---

## 3. Flujos de Datos Clave

### 3.1 Booking (5 pasos) — Frontend a Backend

1. **Carga landing**: SSR en `/p/:slug` inyecta `window.__INITIAL_DATA__` con tenant + servicios. React hidrata.
2. **Paso 1 - Staff**: GET `/p/:slug/staff` → lista de staff con servicios disponibles.
3. **Paso 2 - Servicio**: Click en servicio → auto-selecciona staff (si no se eligió) o filtra.
4. **Paso 3 - Fecha**: Calendario → al seleccionar fecha, GET `/p/:slug/availability?date=YYYY-MM-DD&serviceId=N` → slots disponibles.
5. **Paso 4 - Horario**: Click en slot → setea `selectedTime`.
6. **Paso 5 - Datos**: Formulario con nombre, teléfono, email, notas, cupón, captcha (Cloudflare Turnstile). POST `/p/:slug/appointments` crea el turno.
   - Si el servicio tiene `deposit_amount > 0` → turno creado como `pending`, se genera checkout de MercadoPago para la seña, se retorna `checkout_url`.
   - Si es recurring → se crean hasta 12 turnos con `recurring_group`.
   - Se envían notificaciones (email + WhatsApp) al cliente y staff.
   - Retorna `management_link` para autogestión del cliente.

**Doble reserva**: prevención con `SELECT ... FOR UPDATE` en transacción + unique index parcial `idx_appointments_unique_active` (tenant_id, staff_id, appointment_date) WHERE status NOT IN ('cancelled', 'no-show').

### 3.2 Suscripción a Plan

1. Staff ve planes en GET `/api/tenant/plan` → precios con promoción si `paidCycles < promo_months`.
2. POST `/api/tenant/subscribe` con `{ plan }` → crea/obtén invoice pendiente, crea preferencia MP, retorna `init_point`.
3. Cliente paga en MercadoPago → MP envía webhook a `/api/payments/mercadopago/webhook`.
4. Webhook verifica firma, busca invoice por `external_reference`, marca como pagada, llama `activateTenantFromPaidInvoice` que setea `plan`, `status='active'`, `trial_end_date=NULL`.

### 3.3 Autogestión de Cliente

- GET `/p/:slug/appointments/manage/:token` → obtiene turno por token único + turnos del mismo recurring_group.
- PUT `/p/:slug/appointments/manage/:token/cancel` → cancela turno, retorna `waitlist_count`.
- PUT `/p/:slug/appointments/manage/:token/reschedule` → reprograma validando disponibilidad.

### 3.4 Cron Jobs (node-cron)

| Horario | Tarea |
|---|---|
| `0 0 1 * *` | Generar facturas mensuales para planes pagos |
| `0 8 * * *` | Suspender tenants con trial vencido |
| `0 20 * * *` | Enviar recordatorios de turnos (24h antes) |
| `0 9 * * *` | Email de advertencia de trial por expirar (3 días) |
| `0 10 * * *` | Enviar recordatorios de pago (3 días antes de vencimiento) |
| `0 3 * * *` | Backup de DB (pg_dump, mantiene últimos 7) |
| `0 23 * * *` | Suspender tenants con facturas vencidas >7 días |
| `*/30 * * * *` | Sincronizar Google Calendar de staff |

---

## 4. Testing

### 4.1 Backend (Jest)
- **Unit tests**: `backend/tests/*.test.js` (auth, appointments, billing, cron-billing, landing, mercadopago-webhook, misc, notifications, payment-config, security, slots, superadmin, twilio, api).
- **Integration tests**: `backend/tests/integration/api.test.js` — requiere PostgreSQL real, crea tablas, sembrado de datos, pruebas end-to-end con supertest.
- **E2E tests**: `backend/tests/e2e/` — Playwright con specs (auth, booking, landing, pages, mp-webhook, forgot-password, staff-dashboard, superadmin, upload).
- Patrón: mock de `uuid`, `database`, `cron-billing`, `notifications` en unit tests; setup real en integration.
- Comandos: `npm test`, `npm run test:integration`, `npm run test:e2e`, `npm run smoke`, `npm run lint`, `npm run typecheck`.

### 4.2 Frontend (Vitest)
- Tests en archivos `.test.tsx` al lado de componentes.
- Setup: `jsdom` environment, `@testing-library/jest-dom`, mockea `i18next-browser-languagedetector`.
- Comandos: `npm test` (vitest run), `npm run dev`, `npm run build`.

---

## 5. Puntos de Extensión / Áreas de Mejora

### 5.1 Funcionalidades
- **Suscripción recurrente automática**: Actualmente los pagos son por única vez (invoice). No hay suscripción automática recurrente con retry (Stripe Billing / webhooks de renovación).
- **Multi-peluquero en booking**: El booking actualmente auto-asigna o permite elegir staff. No hay balanceo de carga avanzado o vista de agenda compartida.
- **Reportes avanzados**: Los stats actuales son básicos (summary, revenue-by-month, revenue-by-staff, top-services). Podrían expandirse con cohort, retención, LTV.
- **Sincronización de calendario bidireccional**: Google Calendar sync es unidireccional (solo pull). No hay push de cambios locales a Google.

### 5.2 Técnico
- **Configuración de env**: `config.js` valida env vars. Documentado con `.env.example` (no presente en el repo explorado).
- **Migraciones**: El esquema está embebido en `database.ts` (initDB). Existen archivos SQL en `migrations/` pero `run-migrations.js` existe. Hay duplicación entre initDB inline y migrations.
- **Type safety**: Backend usa TypeScript parcial (server.ts, database.ts, routes son .ts pero con tipado laxo/JSDoc). Frontend es TS estricto.
- **Rate limiting**: Configurado por endpoint (login, appointment, public, api, webhook, password-reset).
- **Security**: Helmet (CSP, noSniff, frameguard, CORP, DNS prefetch, referrer), HPP, compresión, rate limiting. Swagger/Metrics requieren auth básica en producción.

---

## 6. Próximos Pasos Recomendados

1. **Crear `.env.example`**: Documentar todas las variables de entorno requeridas y opcionales.
2. **Forzar HTTPS en producción**: Configurar `FORCE_HTTPS=true` en Hostinger (SSL Let's Encrypt disponible).
3. **Configurar Twilio**: Habilitar notificaciones WhatsApp reales en el panel de super admin (`/api/super-admin/config` key `twilio`).
4. **Habilitar Swagger/Metrics con auth básica**: Configurar `SWAGGER_BASIC_AUTH_USER/PASS` y `METRICS_BASIC_AUTH_USER/PASS` para acceso seguro.
5. **Separar migraciones**: Migrar el schema inline de `database.ts` a archivos SQL versionados en `migrations/` para producción.
6. **Suscripción recurrente**: Implementar Stripe Billing para renovación automática con webhooks de `invoice.payment_succeeded` / `customer.subscription.deleted`.
7. **Tests de integración para booking**: Agregar tests de integración para el flujo completo de booking, depósitos y cupones.
8. **Monitoreo**: Configurar alertas de Prometheus para tasas de error 5xx, latencia, y pool de conexiones.

---

## 7. Despliegue en Producción (Hostinger)

### 7.1 Configuración actual

- **Dominio principal**: `https://www.nexo-dev.com` (también `https://nexo-dev.com`)
- **BASE_URL**: `https://www.nexo-dev.com` (usado para webhooks, emails, redirects)
- **ALLOWED_ORIGINS**: `https://www.nexo-dev.com,https://nexo-dev.com`
- **FRONTEND_URL**: `https://nexo-dev.com`
- **Base de datos**: PostgreSQL local (`postgresql://postgres:orion1@localhost:5432/agenda_app_db`)
- **PM2**: `ecosystem.config.js` ejecuta `server.js` en modo fork (1 instancia), reinicio a las 4am, límite de memoria 500M
- **Frontend**: Vite build output servido desde `frontend/dist/` por Express
- **Docker**: `Dockerfile` multi-stage (builder → runtime con node:20-alpine)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml` mencionado en README, no encontrado en el repo explorado)

### 7.2 Servicios configurados

| Servicio | Configuración |
|---|---|
| **MercadoPago** | App ID 2347813022076425, User ID 3423172564, Moneda UYU, Locale es-UY |
| **Email** | Gmail SMTP (trixcrm9@gmail.com), SMTP_SERVICE=gmail |
| **WhatsApp** | Variables de entorno no configuradas en .env (modo simulado) |
| **Google OAuth** | Cliente ID configurado, callback en `https://nexo-dev.com/api/auth/google/callback` |
| **Push** | VAPID keys configuradas |
| **Sentry** | No configurado (advertencia en logs) |

### 7.3 Observaciones de seguridad

- **Secrets expuestos en `.env`**: El archivo `backend/.env` contiene secrets reales (MP_ACCESS_TOKEN, SMTP_PASS, JWT_SECRET, VAPID keys). Debe estar en `.gitignore` y no comprometerse.
- **Sin Twilio configurado**: WhatsApp está en modo simulado (logs informativos, no envía mensajes reales).
- **Sin HTTPS forzado**: `FORCE_HTTPS` no está configurado en .env.
- **Swagger/Metrics**: No están habilitados en el .env de producción (SWAGGER_UI_ENABLED y METRICS_ENABLED no definidos → defaults: Swagger deshabilitado en prod, Metrics deshabilitado).

---

## 8. Archivos Clave de Interés

- `backend/server.ts` — Configuración Express, SSR landing, cron, static serving
- `backend/config.js` — Validación de env vars
- `backend/database.ts` — Pool, queries, schema inline, seed
- `backend/middleware/index.ts` — Auth, tenant identification, rate limiting
- `backend/routes/public.ts` — Landing API + booking (multi-tenant, sin auth)
- `backend/routes/tenant.ts` — Dashboard staff (CRUD completo)
- `backend/routes/superadmin.ts` — Panel admin
- `backend/routes/auth.ts` — Auth (register, login, staff login/register, forgot/reset)
- `backend/routes/mercadopago.ts` — Webhooks IPN, payment preferences
- `backend/routes/stripe.ts` — Stripe checkout sessions, webhooks
- `backend/routes/misc.ts` — Health, tenants list, nearby, upload, agenda personal
- `backend/services/billing.ts` — Lógica de suscripciones e invoices
- `backend/services/notifications.ts` — Email + WhatsApp + push
- `backend/services/slots.ts` — Generación de slots de disponibilidad
- `backend/services/twilio.ts` — WhatsApp messaging (con fallback a env config)
- `backend/services/payment-config.ts` — PLANS, precios, discounts
- `backend/cron-billing.ts` — Jobs programados
- `backend/ecosystem.config.js` — Configuración PM2
- `frontend-vite/src/App.tsx` — Rutas React Router v7
- `frontend-vite/src/pages/public/Landing.tsx` — Landing page + booking
- `frontend-vite/src/pages/staff/Dashboard.tsx` — Dashboard staff
- `frontend-vite/src/pages/staff/LandingEditor.tsx` — Editor de landing
- `frontend-vite/src/api/client.ts` — Cliente API con cache
- `frontend-vite/src/contexts/AuthContext.tsx` — Auth state management
- `frontend-vite/src/i18n.ts` — i18n (es/en/pt)
- `backend/.env` — Configuración de producción actual
