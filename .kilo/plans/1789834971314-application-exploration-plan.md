# Plan: Fix Google OAuth & SMTP Authentication Issues

## Contexto
- Backend corriendo en VPS (puerto 3000)
- Headers de seguridad en `server.ts` ya corregidos (Referrer-Policy, COOP)
- Credenciales SMTP en `.env` actualizadas (velsoie09@gmail.com / kkgssqsmbtlcsvfj) pero auth falla con error 535
- Código de notificaciones push en `cron-billing.ts` incluye correctamente `s.email as staff_email`
- `notifyStaff()` importa y usa `staff_email` correctamente

## Tareas

### 1. Corregir Error de Google OAuth Code 5 (Origen Faltante)
**Estado**: A la espera de configuración externa
- Agregar `https://velsoie.com` y `https://www.velsoie.com` a Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → "Authorized JavaScript origins"
- Publicar pantalla de consentimiento desde "Testing" a "Production" (o agregar usuarios de prueba)
- El `GOOGLE_CLIENT_ID` en `.env` debe coincidir con el configurado en Google Console

### 2. Corregir Fallo de Autenticación SMTP (Error 535)
**Estado**: Investigando

El error "Invalid login: 535-5.7.8 Username and Password not accepted" indica que Gmail rechazó las credenciales. Opciones:

#### Opción A: Generar App Password (Recomendado)
Gmail requiere App Passwords para SMTP cuando 2FA está activado:
1. Activar 2FA en la cuenta velsoie09@gmail.com
2. Generar App Password para "Mail"
3. Actualizar `SMTP_PASS` en `backend/.env` con la contraseña de 16 caracteres
4. Reiniciar el backend

#### Opción B: Permitir Apps Menos Seguras
Gmail ha descontinuado esta opción, pero si está disponible:
1. Activar "Less secure app access" en la cuenta Google
2. Reiniciar backend

#### Opción C: Cambiar Proveedor SMTP
Usar un servicio SMTP dedicado (SendGrid, Mailgun):
1. Crear cuenta con proveedor SMTP
2. Actualizar `backend/.env` con nuevas credenciales SMTP
3. Ajustar `createEmailTransporter()` en `services/email.ts` si es necesario
4. Reiniciar backend

### 3. Verificar Notificaciones de Staff
**Estado**: Código correcto

El sistema de notificaciones está implementado correctamente:
- `cron-billing.ts` línea 437: query SQL incluye `s.email as staff_email`
- `cron-billing.ts` línea 491: Llama `notifyStaff(apt, {...})` con objeto tenant
- `notifications.ts` líneas 97-163: `notifyStaff()` usa `appointment.staff_email`
- `server.ts` líneas 530-537: Cron job diario a las 20:00 llama `sendAppointmentReminders()`

No se necesitan cambios de código. El problema es puramente la autenticación SMTP.

## Validación
1. Después de corregir credenciales SMTP, probar o verificar logs para "✅ Email enviado"
2. Probar Google OAuth intentando login desde el frontend
3. Verificar que no haya errores en logs de backend sobre "Invalid login" o "Error code: 5"

## Riesgos
- Google puede bloquear intentos de login desde nuevas ubicaciones (VPS) - requerirá aprobación
- Generar App Password requiere tener 2FA activado en la cuenta Gmail

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
