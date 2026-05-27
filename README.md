# Veloré — SaaS de Turnos Multi-Tenant

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
| `BASE_URL` | No | URL base para enlaces en emails |
| `PLAN_PRO_PRICE` | No | Precio plan Pro (default 990) |
| `PLAN_ENTERPRISE_PRICE` | No | Precio plan Enterprise (default 2490) |

---

## Scripts

### Backend

| Script | Descripción |
|---|---|
| `npm start` | Inicia servidor con `tsx` (hot reload) |
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

## Licencia

Uso interno. Código propiedad de Nexo Software.
