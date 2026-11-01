-- Suscripciones y permisos efectivos por tenant.
-- La activación de una factura de suscripción materializa aquí los permisos
-- para que los límites no dependan únicamente del nombre del plan.

CREATE TABLE IF NOT EXISTS feature_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'boolean' CHECK (kind IN ('boolean', 'limit')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_feature_permissions (
  plan_name TEXT NOT NULL,
  feature_code TEXT NOT NULL REFERENCES feature_catalog(code) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INTEGER,
  PRIMARY KEY (plan_name, feature_code)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id INTEGER UNIQUE REFERENCES invoices(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  provider TEXT NOT NULL DEFAULT 'unknown',
  provider_reference TEXT,
  amount NUMERIC(12,2),
  currency TEXT,
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_reference
  ON subscriptions(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS tenant_permissions (
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES feature_catalog(code) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INTEGER,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_permissions_enabled
  ON tenant_permissions(tenant_id, enabled);

INSERT INTO feature_catalog (code, name, description, kind) VALUES
  ('appointments', 'Turnos online', 'Reservas online ilimitadas o sujetas al límite del plan', 'boolean'),
  ('client_records', 'Fichas e historial de clientes', 'Historial de citas y fichas de clientes', 'boolean'),
  ('email_reminders', 'Recordatorios por email', 'Notificaciones automáticas por email', 'boolean'),
  ('whatsapp_reminders', 'Recordatorios por WhatsApp', 'Recordatorios y notificaciones por WhatsApp', 'boolean'),
  ('sms_reminders', 'Recordatorios por SMS', 'Alertas SMS del sistema de recordatorios', 'boolean'),
  ('financial_reports', 'Control de caja y reportes', 'Caja, facturación y reportes financieros', 'boolean'),
  ('analytics_basic', 'Métricas básicas', 'Indicadores básicos del negocio', 'boolean'),
  ('analytics_advanced', 'Métricas de rendimiento', 'Métricas avanzadas de ocupación y rendimiento', 'boolean'),
  ('website_exclusive', 'Página web exclusiva', 'Generador de página web personalizada', 'boolean'),
  ('landing_basic', 'Landing básica', 'Landing pública básica del negocio', 'boolean'),
  ('landing_custom_css', 'Diseño personalizado', 'CSS y personalización avanzada de landing', 'boolean'),
  ('landing_custom_html', 'HTML personalizado', 'Bloques HTML personalizados', 'boolean'),
  ('service_categories', 'Categorías de servicios', 'Organización de servicios por categorías', 'boolean'),
  ('service_featured', 'Servicios destacados', 'Publicación de servicios destacados', 'boolean'),
  ('calendar_sync', 'Sincronización de calendario', 'Integración con Google Calendar', 'boolean'),
  ('pos_basic', 'POS básico', 'Productos y ventas básicas', 'boolean'),
  ('pos_full', 'POS completo', 'Punto de venta completo', 'boolean'),
  ('products', 'Productos', 'Catálogo de productos', 'boolean'),
  ('coupons', 'Cupones', 'Gestión de cupones', 'boolean'),
  ('waitlist', 'Lista de espera', 'Gestión de lista de espera', 'boolean'),
  ('custom_domain', 'Dominio personalizado', 'Dominio propio para la página web', 'boolean'),
  ('priority_support', 'Soporte prioritario', 'Soporte prioritario y asesoría', 'boolean'),
  ('staff_limit', 'Límite de profesionales', 'Cantidad máxima de profesionales activos', 'limit'),
  ('services_limit', 'Límite de servicios', 'Cantidad máxima de servicios activos', 'limit'),
  ('products_limit', 'Límite de productos', 'Cantidad máxima de productos activos', 'limit'),
  ('appointments_per_day_limit', 'Límite diario de turnos', 'Cantidad máxima de turnos por día', 'limit')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, kind = EXCLUDED.kind;

-- Defaults estrictamente alineados con las tarjetas públicas.
INSERT INTO plan_feature_permissions (plan_name, feature_code, enabled, limit_value) VALUES
  ('free', 'staff_limit', true, 1),
  ('free', 'services_limit', true, 5),
  ('free', 'products_limit', true, 5),
  ('free', 'appointments_per_day_limit', true, 10),
  ('basico', 'appointments', true, NULL),
  ('basico', 'client_records', true, NULL),
  ('basico', 'email_reminders', true, NULL),
  ('basico', 'landing_basic', true, NULL),
  ('basico', 'service_categories', true, NULL),
  ('basico', 'staff_limit', true, 1),
  ('basico', 'services_limit', true, 10),
  ('basico', 'products_limit', true, 10),
  ('basico', 'appointments_per_day_limit', true, NULL),
  ('estandar', 'appointments', true, NULL),
  ('estandar', 'client_records', true, NULL),
  ('estandar', 'email_reminders', true, NULL),
  ('estandar', 'whatsapp_reminders', true, NULL),
  ('estandar', 'financial_reports', true, NULL),
  ('estandar', 'analytics_basic', true, NULL),
  ('estandar', 'landing_custom_css', true, NULL),
  ('estandar', 'pos_basic', true, NULL),
  ('estandar', 'calendar_sync', true, NULL),
  ('estandar', 'service_featured', true, NULL),
  ('estandar', 'staff_limit', true, 3),
  ('estandar', 'services_limit', true, 30),
  ('estandar', 'products_limit', true, 30),
  ('estandar', 'appointments_per_day_limit', true, NULL),
  ('premium', 'appointments', true, NULL),
  ('premium', 'client_records', true, NULL),
  ('premium', 'email_reminders', true, NULL),
  ('premium', 'whatsapp_reminders', true, NULL),
  ('premium', 'sms_reminders', true, NULL),
  ('premium', 'financial_reports', true, NULL),
  ('premium', 'analytics_advanced', true, NULL),
  ('premium', 'website_exclusive', true, NULL),
  ('premium', 'landing_custom_css', true, NULL),
  ('premium', 'landing_custom_html', true, NULL),
  ('premium', 'pos_full', true, NULL),
  ('premium', 'products', true, NULL),
  ('premium', 'coupons', true, NULL),
  ('premium', 'waitlist', true, NULL),
  ('premium', 'calendar_sync', true, NULL),
  ('premium', 'service_featured', true, NULL),
  ('premium', 'custom_domain', true, NULL),
  ('premium', 'priority_support', true, NULL),
  ('premium', 'staff_limit', true, NULL),
  ('premium', 'services_limit', true, NULL),
  ('premium', 'products_limit', true, NULL),
  ('premium', 'appointments_per_day_limit', true, NULL)
ON CONFLICT (plan_name, feature_code) DO UPDATE SET enabled = EXCLUDED.enabled, limit_value = EXCLUDED.limit_value;

-- Backfill tenants existentes para que el nuevo modelo sea inmediatamente utilizable.
INSERT INTO subscriptions (tenant_id, plan_name, status, provider, starts_at)
SELECT id,
       CASE plan WHEN 'pro' THEN 'estandar' WHEN 'enterprise' THEN 'premium' ELSE plan END,
       CASE WHEN status = 'active' THEN 'active' ELSE 'cancelled' END,
       'legacy',
       COALESCE(last_payment_date, created_at)
FROM tenants
WHERE plan IN ('free', 'basico', 'estandar', 'premium', 'pro', 'enterprise')
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.tenant_id = tenants.id AND s.provider = 'legacy');

INSERT INTO tenant_permissions (tenant_id, feature_code, enabled, limit_value, subscription_id)
SELECT s.tenant_id, p.feature_code, p.enabled, p.limit_value, s.id
FROM subscriptions s
JOIN plan_feature_permissions p ON p.plan_name = s.plan_name
WHERE s.status = 'active'
ON CONFLICT (tenant_id, feature_code) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value,
  subscription_id = EXCLUDED.subscription_id,
  updated_at = CURRENT_TIMESTAMP;
