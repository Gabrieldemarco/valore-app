# Plan: Google Auth en sección SMTP del staff

## Contexto
Ya existe Google OAuth para calendario (`/api/auth/google/calendar`) y login (`/api/auth/google/callback`). La sección SMTP en SettingsPanel.tsx (líneas 268-290) solo tiene campos manuales para `smtp_email` y `smtp_password`.

## Objetivo
Agregar un botón de Google Auth en la sección SMTP que:
1. Autentique con Google solicitando scope de Gmail (`https://mail.google.com/`)
2. Auto-complete el campo `smtp_email` con el email de Google
3. Muestre el estado de conexión (conectado/desconectado)
4. Use XOAUTH2 para enviar emails vía Gmail (sin necesidad de app password manual)

## Cambios

### 1. Backend - Nuevos endpoints (`/backend/routes/google.ts`)
- `GET /api/auth/google/smtp` — URL de OAuth con scope de Gmail
- `GET /api/auth/google/smtp/callback` — Callback que guarda tokens en `tenants.google_smtp_tokens` y auto-configura SMTP

### 2. Backend - Tabla de tokens (`/backend/migrations/`)
- Nueva tabla `google_smtp_tokens`
- Campos: `tenant_id, access_token, refresh_token, token_expiry, google_email, smtp_connected`

### 3. Backend - Servicio de email (`/backend/services/email.ts`)
- Si SMTP está conectado a Google → usar XOAUTH2 con refresh_token
- Si no → usar auth tradicional con smtp_email/smtp_password

### 4. Frontend - SettingsPanel.tsx (líneas 268-290)
- Botón "Conectar Google" / "Desconectar" en la sección SMTP
- Mostrar email conectado y estado
- Auto-completar `smtp_email` al conectar
- Toggle de visibilidad de password (ya implementado)

### 5. Frontend - Estado y traducciones
- Agregar `googleAuthConnected`, `googleAuthConnect`, `googleAuthDisconnect` a i18n
- Estado `smtpGoogleConnected` y `smtpGoogleEmail` en dashboardContext
