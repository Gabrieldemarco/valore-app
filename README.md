# Velsoie — SaaS de Turnos Multi-Tenant

Sistema de gestión de turnos multi-tenant con landing page pública, dashboard para staff, panel super admin, notificaciones WhatsApp (Twilio) y pagos integrados (MercadoPago).

---

## Stack

| Capa | Tecnología |
|---|---|
| **Backend** | Node.js + Express + TypeScript |
| **Frontend** | Vite + React + TypeScript |
| **Base de datos** | PostgreSQL |
| **ORM / DB** | `pg` raw queries |
| **Auth** | JWT (jsonwebtoken) |
| **Pagos** | MercadoPago SDK |
| **WhatsApp** | Twilio API |
| **Email** | Nodemailer (SMTP) |
| **Tests** | Jest (backend), Vitest + Testing Library (frontend) |
| **E2E** | Playwright |
| **CI/CD** | GitHub Actions |
| **Infra** | Docker, PM2 |

---

## Funcionalidades

- **Landing pública por tenant** con branding personalizado (colores, logo, descripción, staff, equipamiento)
- **Booking 5 pasos**: selección de staff → servicio → fecha → horario → datos del cliente
- **Dashboard staff**: CRUD de turnos, staff, servicios, clientes; gestión de horarios; landing editor
- **Panel super admin**: CRUD de tenants, gestión de planes y precios, configuración Twilio global
- **Notificaciones**: email + WhatsApp al cliente y staff al crear/modificar turnos
- **Pagos**: MercadoPago para suscripciones (plan Pro/Enterprise) e invoices
- **WhatsApp**: recordatorios y confirmaciones vía Twilio (números Uruguay +598)
- **Multi-idioma**: interfaz en español

---

## Estructura del proyecto

```
agenda-app/
├── backend/
│   ├── routes/          # Express routers
│   │   ├── auth.ts          # Login, registro, reset password
│   │   ├── public.ts        # Landing pública (booking, disponibilidad)
│   │   ├── tenant.ts        # Dashboard staff (turnos, staff, servicios, clientes)
│   │   ├── superadmin.ts    # Panel admin (tenants, planes, config)
│   │   ├── mercadopago.ts   # Webhooks y preferencias de pago
│   │   └── misc.ts          # Health, agenda personal, upload
│   ├── middleware/      # Validate, authenticate, checkTenantActive, etc.
│   ├── services/        # Twilio, email, notificaciones, disponibilidad
│   ├── server.ts        # Entry point
│   ├── database.ts      # Init DB, queries
│   └── tests/           # Jest tests
├── frontend-vite/
│   ├── src/
│   │   ├── pages/           # public/, staff/, admin/
│   │   ├── components/      # UI components
│   │   ├── contexts/        # AuthContext
│   │   ├── api/             # client.ts (fetch wrapper)
│   │   └── test/            # setup, tests
│   ├── vite.config.ts
│   └── package.json
├── frontend/dist/       # Build output (servido por Express)
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Quick Start (desarrollo local)

### Prerrequisitos

- Node.js 20+
- PostgreSQL 16+
- npm

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Corre en `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend-vite
npm install
npm run dev
```

Corre en `http://localhost:5173` con hot reload y proxy a backend.

### 3. Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión PostgreSQL |
| `JWT_SECRET` | Sí | Secreto para firmar tokens |
| `PORT` | No | Puerto (default 3000) |
| `NODE_ENV` | No | `development`, `production`, `test` |
| `MP_ACCESS_TOKEN` | Pagos | Token de MercadoPago |
| `MP_PUBLIC_KEY` | Pagos | Public key de MercadoPago |
| `MP_WEBHOOK_SECRET` | Pagos | Secreto webhook MercadoPago |
| `MP_CURRENCY` | No | Moneda (default UYU) |
| `SMTP_HOST` | Email | Servidor SMTP |
| `SMTP_USER` | Email | Usuario SMTP |
| `SMTP_PASS` | Email | Contraseña SMTP |
| `TWILIO_ACCOUNT_SID` | WhatsApp | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | WhatsApp | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | WhatsApp | Número verificado Twilio |
| `ALLOWED_ORIGINS` | No | Orígenes CORS separados por coma |
| | | En producción no uses `*`; configura dominios específicos. |
| `SENTRY_DSN` | No | DSN de Sentry para error tracking |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Porcentaje de muestreo de transacciones Sentry (default 0.2) |
| `BCRYPT_ROUNDS` | No | Rondas de bcrypt para hashing de contraseñas (default 12) |
| `JWT_ALGORITHM` | No | Algoritmo JWT usado para firmar/verificar tokens (default HS256) |
| `METRICS_ENABLED` | No | Habilita el endpoint Prometheus `/metrics` |
| `METRICS_BASIC_AUTH_USER` | No | Usuario para autenticación básica en `/metrics` |
| `METRICS_BASIC_AUTH_PASS` | No | Contraseña para autenticación básica en `/metrics` |
| `SWAGGER_UI_ENABLED` | No | Habilita la documentación Swagger (default `true`) |
| `SWAGGER_BASIC_AUTH_USER` | No | Usuario para autenticación básica en Swagger UI y JSON |
| `SWAGGER_BASIC_AUTH_PASS` | No | Contraseña para autenticación básica en Swagger UI y JSON |
| `SWAGGER_UI_ROUTE` | No | Ruta para el UI de Swagger (default `/api-docs`) |
| `SWAGGER_UI_JSON_ROUTE` | No | Ruta para el JSON raw de Swagger (default `/api-docs.json`) |
| `LOG_LEVEL` | No | Nivel de logs para Winston (`info`, `warn`, `error`) |
| `TEST_DATABASE_URL` | No | URL del DB de prueba para `restore-test` |
| `RESTORE_DATABASE_URL` | No | URL separada para restaurar backups en DB de prueba |
| `BASE_URL` | No | URL base para enlaces en emails |
| `PLAN_PRO_PRICE` | No | Precio plan Pro (default 990) |
| `PLAN_ENTERPRISE_PRICE` | No | Precio plan Enterprise (default 2490) |

## Monitoreo y logging

- `LOG_LEVEL` controla el nivel de registro de Winston (`info`, `warn`, `error`).
- El backend escribe logs en `backend/logs/error.log` y `backend/logs/combined.log`.
- Si `SENTRY_DSN` está configurado, los errores se envían a Sentry y se habilita tracing en el middleware.
- `SENTRY_TRACES_SAMPLE_RATE` ajusta el muestreo de transacciones (ej. `0.2`).
- En staging/desarrollo, la app arranca aunque falte `SENTRY_DSN`, pero muestra una advertencia para no perder visibilidad.
- El backend expone `/api/health` con estado, uptime, uso de memoria y conteo básico de entidades.
- El backend aplica cabeceras de seguridad con Helmet (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Cross-Origin-Resource-Policy`, `DNS prefetch control`, `Referrer-Policy`).
- En producción, `ALLOWED_ORIGINS` no debe contener `*`; usa dominios específicos para CORS.
- Si `METRICS_ENABLED=true`, también expone `/metrics` con métricas Prometheus (`velsoie_http_request_duration_seconds`, métricas default de Node.js, etc.).
- En producción es obligatorio proteger `/metrics` y Swagger con autenticación básica utilizando `METRICS_BASIC_AUTH_USER`, `METRICS_BASIC_AUTH_PASS`, `SWAGGER_BASIC_AUTH_USER` y `SWAGGER_BASIC_AUTH_PASS`. Si no hay auth configurada, el backend deshabilita automáticamente esos endpoints en producción.
- El API docs UI está disponible en la ruta configurada por `SWAGGER_UI_ROUTE` y el JSON raw en `SWAGGER_UI_JSON_ROUTE` cuando `SWAGGER_UI_ENABLED` está habilitado (default `true`).
- Los scripts de backup usan `pg_dump` y `psql`, por lo que en entornos de CI/producción debe estar instalado el cliente de PostgreSQL.

---

## Scripts

### Backend

| Script | Descripción |
|---|---|
| `npm start` | Inicia servidor con `tsx` (hot reload) |
| `npm run check-env` | Verifica variables de entorno requeridas |
| `npm run smoke` | Corre smoke tests básicos contra el servidor |
| `npm run backup` | Crea un backup local de la base de datos usando `pg_dump` |
| `npm run restore-test` | Restaura el último backup en un DB de prueba usando `psql` y verifica que los conteos de tablas clave coinciden |
| `npm test` | Tests unitarios + integración (Jest) |
| `npm run test:integration` | Tests de integración |
| `npm run test:e2e` | Tests E2E con Playwright |

### Frontend

| Script | Descripción |
|---|---|
| `npm run dev` | Dev server con hot reload (Vite) |
| `npm run build` | TypeScript check + build a `frontend/dist/` |
| `npm test` | Tests con Vitest |

---

## API Reference

> Todas las rutas públicas llevan el slug del tenant como parámetro de ruta.  
> Todas las rutas autenticadas requieren header `Authorization: Bearer <token>`.

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/register` | — | Registro de cliente |
| POST | `/api/login` | — | Login de cliente |
| POST | `/api/staff/login` | — | Login de staff/admin |
| POST | `/api/staff/register` | — | Registro de nuevo negocio (tenant) |
| POST | `/api/staff/forgot-password` | — | Solicitar reset de contraseña |
| POST | `/api/staff/reset-password` | — | Resetear contraseña con token |

### Landing pública (prefijo `/p`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/p/:slug/config` | — | Configuración pública del tenant |
| GET | `/p/:slug/services` | — | Servicios activos |
| GET | `/p/:slug/staff` | — | Staff con servicios |
| GET | `/p/:slug/availability?date=&service_id=` | — | Horarios disponibles |
| GET | `/p/:slug/staff/:staffId/availability?date=&service_id=` | — | Horarios disponibles para un staff específico |
| POST | `/p/:slug/appointments` | — | Crear turno (booking público) |
| GET | `/p/:slug/landing` | — | Landing page config completa |
| PUT | `/p/:slug/landing` | Staff | Actualizar landing page |

### Dashboard Staff (prefijo `/api`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/appointments` | Staff | Crear turno manual |
| GET | `/api/appointments?date=&status=&page=&limit=` | Staff | Listar turnos (paginado, 20 por página) |
| GET | `/api/appointments/today` | Staff | Turnos del día |
| PUT | `/api/appointments/:id/status` | Staff | Cambiar estado (confirmed/cancelled/completed/no-show) |
| DELETE | `/api/appointments/:id` | Staff | Eliminar turno |
| GET | `/api/appointments/search?phone=` | Staff | Buscar turnos por teléfono |
| GET | `/api/tenant/me` | Staff | Datos del tenant |
| GET | `/api/tenant/plan` | Staff | Información del plan |
| POST | `/api/tenant/subscribe` | Staff | Suscribirse a plan pago |
| GET | `/api/tenant/invoices` | Staff | Facturas del tenant |
| POST | `/api/tenant/invoices/:id/pay` | Staff | Pagar factura |
| PUT | `/api/tenant/settings` | Staff | Actualizar configuración |
| GET | `/api/tenant/staff` | Staff | Listar staff |
| POST | `/api/tenant/staff` | Staff | Crear staff (envía credenciales por email) |
| PUT | `/api/tenant/staff/:id` | Staff | Editar staff |
| DELETE | `/api/tenant/staff/:id` | Staff | Eliminar staff |
| GET | `/api/tenant/services` | Staff | Listar servicios |
| POST | `/api/tenant/services` | Staff | Crear servicio |
| PUT | `/api/tenant/services/:id` | Staff | Editar servicio |
| DELETE | `/api/tenant/services/:id` | Staff | Eliminar servicio |
| GET | `/api/tenant/clients?q=` | Staff | Buscar clientes |
| GET | `/api/tenant/clients/:phone/appointments` | Staff | Historial de turnos del cliente |

### Super Admin (prefijo `/api`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/super-admin/login` | — | Login super admin |
| GET | `/api/super-admin/tenants?status=&plan=&search=&page=&limit=` | SuperAdmin | Listar tenants |
| POST | `/api/super-admin/tenants` | SuperAdmin | Crear tenant |
| GET | `/api/super-admin/tenants/:id` | SuperAdmin | Detalle del tenant |
| PUT | `/api/super-admin/tenants/:id` | SuperAdmin | Actualizar tenant |
| DELETE | `/api/super-admin/tenants/:id` | SuperAdmin | Eliminar tenant |
| POST | `/api/super-admin/tenants/:id/set-trial` | SuperAdmin | Configurar trial |
| POST | `/api/super-admin/tenants/:id/reactivate` | SuperAdmin | Reactivar tenant |
| GET | `/api/super-admin/tenants/:id/invoices` | SuperAdmin | Facturas del tenant |
| GET | `/api/super-admin/tenants/:id/payments` | SuperAdmin | Pagos del tenant |
| POST | `/api/super-admin/invoices` | SuperAdmin | Crear factura manual |
| PUT | `/api/super-admin/invoices/:id/pay` | SuperAdmin | Marcar factura como pagada |
| GET | `/api/super-admin/stats/billing` | SuperAdmin | Estadísticas de facturación |
| GET | `/api/super-admin/plan-prices` | SuperAdmin | Precios de planes |
| PUT | `/api/super-admin/plan-prices/:planName` | SuperAdmin | Actualizar precio de plan |
| GET | `/api/super-admin/config` | SuperAdmin | Configuración global |
| PUT | `/api/super-admin/config` | SuperAdmin | Actualizar configuración global |

### Pagos (MercadoPago)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/payments/mercadopago/create` | SuperAdmin | Crear preferencia de pago |
| POST | `/api/payments/mercadopago/webhook` | — | Webhook IPN (notificación de pago) |
| GET | `/api/test-webhook` | — | Health check webhook |

### Misceláneas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Health check con stats de DB |
| GET | `/api/tenants` | — | Lista de tenants activos (directorio público) |
| GET | `/metrics` | — | Métricas Prometheus (si está habilitado) |
| GET | `/monitoring/summary` | — | Resumen de monitoreo en JSON |
| POST | `/api/upload-image` | Staff | Subir imagen (base64, max 5MB) |
| GET | `/api/agenda` | Cliente | Agenda personal |
| POST | `/api/agenda` | Cliente | Crear evento en agenda |
| PUT | `/api/agenda/:id` | Cliente | Editar evento |
| DELETE | `/api/agenda/:id` | Cliente | Eliminar evento |

---

## Deploy

### Docker (recomendado)

```bash
# Clonar y configurar
git clone <repo>
cd agenda-app
cp backend/.env.example .env
# Editar .env con valores reales

# Build y levantar
docker compose up -d --build
```

### PM2 (manual)

```bash
cd backend
npm ci
npm run build    # compila TypeScript

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta:

1. **Test** — typecheck + tests unitarios/integración/E2E en backend
2. **Deploy** (rama `main`) — build de frontend + deploy vía SSH a producción

Para habilitar CD, configura estos secrets en GitHub:

| Secret | Descripción |
|---|---|
| `DEPLOY_HOST` | IP o dominio del servidor |
| `DEPLOY_USER` | Usuario SSH |
| `DEPLOY_KEY` | Clave privada SSH |
| `DEPLOY_PATH` | Ruta de deploy en el servidor |

---

## Cierre de entrega

La implementación del backend está completa y revisada. Los siguientes elementos ya están resueltos y verificados:

- Validación de variables de entorno y advertencias no bloqueantes en staging/dev
- Migraciones de base de datos y esquema estable
- Tests, CI y compilación TypeScript sin errores
- Seguridad reforzada con Helmet y autenticación básica en Swagger/Metrics en producción
- Logging centralizado con Winston + Morgan
- Monitoreo Prometheus y endpoint `/monitoring/summary`
- Documentación Swagger y referencias de API actualizadas
- Índices de base de datos optimizados para queries frecuentes
- Backup/restore tests y checklist de despliegue actualizada

Verificación realizada:

```bash
cd backend
npx tsc --noEmit -p tsconfig.json
```

## Licencia

Uso interno. Código propiedad de Nexo Software.
