import swaggerJsdoc from 'swagger-jsdoc';
const config = require('../config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Velsoie API',
      version: '1.0.0',
      description: 'API del sistema de turnos multi-tenant Velsoie',
    },
    servers: [
      { url: '/', description: 'Base URL' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        TenantConfig: {
          type: 'object',
          properties: {
            business_name: { type: 'string' },
            slug: { type: 'string' },
            brand_primary_color: { type: 'string', nullable: true },
            brand_logo_url: { type: 'string', nullable: true },
            landing_description: { type: 'string', nullable: true },
            business_phone: { type: 'string', nullable: true },
            business_address: { type: 'string', nullable: true },
            opening_hours: { type: 'object', nullable: true },
          },
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            duration: { type: 'integer' },
            price: { type: 'number' },
            deposit_amount: { type: 'number', nullable: true, description: 'Monto de seña requerida (opcional)' },
            active: { type: 'boolean' },
            image: { type: 'string', nullable: true },
          },
        },
        Staff: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['staff', 'admin'] },
            specialties: { type: 'array', items: { type: 'string' } },
            photo_url: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            active: { type: 'boolean' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            client_name: { type: 'string' },
            client_phone: { type: 'string' },
            client_email: { type: 'string', nullable: true },
            client_token: { type: 'string', description: 'Token único para autogestión del turno' },
            service: { type: 'string' },
            service_duration: { type: 'integer' },
            appointment_date: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'] },
            staff_id: { type: 'integer', nullable: true },
            notes: { type: 'string', nullable: true },
            deposit_amount: { type: 'number', nullable: true, description: 'Monto de seña' },
            deposit_preference_id: { type: 'string', nullable: true },
            recurring_group: { type: 'string', nullable: true, description: 'UUID que agrupa turnos recurrentes' },
            recurring_rule: { type: 'string', nullable: true, description: 'Regla de recurrencia (JSON)' },
          },
        },
      },
    },
    paths: {
      // ===== AUTH =====
      '/api/register': {
        post: {
          tags: ['Autenticación'],
          summary: 'Registrar cliente',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' } }, required: ['username', 'password'] } } } },
          responses: { 201: { description: 'Usuario creado' }, 400: { description: 'Error de validación', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
        },
      },
      '/api/login': {
        post: {
          tags: ['Autenticación'],
          summary: 'Login de cliente',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' } }, required: ['username', 'password'] } } } },
          responses: { 200: { description: 'Token JWT' }, 400: { description: 'Credenciales inválidas' } },
        },
      },
      '/api/staff/login': {
        post: {
          tags: ['Autenticación'],
          summary: 'Login de staff/admin',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
          responses: { 200: { description: 'Token JWT + datos del staff' } },
        },
      },
      '/api/staff/register': {
        post: {
          tags: ['Autenticación'],
          summary: 'Registrar nuevo negocio (tenant)',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { businessName: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' } }, required: ['businessName', 'email', 'password'] } } } },
          responses: { 201: { description: 'Registro exitoso, devuelve slug' } },
        },
      },
      '/api/staff/forgot-password': {
        post: {
          tags: ['Autenticación'],
          summary: 'Solicitar reset de contraseña',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' } }, required: ['email'] } } } },
          responses: { 200: { description: 'Mensaje de confirmación' } },
        },
      },
      '/api/staff/reset-password': {
        post: {
          tags: ['Autenticación'],
          summary: 'Resetear contraseña con token',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } }, required: ['token', 'newPassword'] } } } },
          responses: { 200: { description: 'Contraseña actualizada' } },
        },
      },

      // ===== SUPER ADMIN =====
      '/api/super-admin/login': {
        post: {
          tags: ['Super Admin'],
          summary: 'Login super admin',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
          responses: { 200: { description: 'Token JWT' } },
        },
      },
      '/api/super-admin/tenants': {
        get: {
          tags: ['Super Admin'],
          summary: 'Listar tenants',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'plan', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Lista paginada de tenants' } },
        },
        post: {
          tags: ['Super Admin'],
          summary: 'Crear tenant',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { business_name: { type: 'string' }, slug: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, plan: { type: 'string' } }, required: ['business_name', 'slug', 'email'] } } } },
          responses: { 201: { description: 'Tenant creado' } },
        },
      },
      '/api/super-admin/tenants/{id}': {
        get: {
          tags: ['Super Admin'],
          summary: 'Detalle del tenant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Datos del tenant' }, 404: { description: 'No encontrado' } },
        },
        put: {
          tags: ['Super Admin'],
          summary: 'Actualizar tenant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { business_name: { type: 'string' }, status: { type: 'string' }, plan: { type: 'string' }, billing_email: { type: 'string' }, subscription_status: { type: 'string' } } } } } },
          responses: { 200: { description: 'Tenant actualizado' } },
        },
        delete: {
          tags: ['Super Admin'],
          summary: 'Eliminar tenant permanentemente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Tenant eliminado' } },
        },
      },
      '/api/super-admin/tenants/{id}/set-trial': {
        post: {
          tags: ['Super Admin'],
          summary: 'Configurar trial',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { days: { type: 'integer', default: 15 } } } } } },
          responses: { 200: { description: 'Trial configurado' } },
        },
      },
      '/api/super-admin/tenants/{id}/reactivate': {
        post: {
          tags: ['Super Admin'],
          summary: 'Reactivar tenant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { mode: { type: 'string', enum: ['upgrade_pro', 'extend_trial'] }, days: { type: 'integer' } } } } } },
          responses: { 200: { description: 'Tenant reactivado' } },
        },
      },
      '/api/super-admin/tenants/{tenantId}/invoices': {
        get: {
          tags: ['Super Admin'],
          summary: 'Facturas del tenant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'tenantId', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'status', in: 'query', schema: { type: 'string' } }],
          responses: { 200: { description: 'Lista de facturas' } },
        },
      },
      '/api/super-admin/tenants/{tenantId}/payments': {
        get: {
          tags: ['Super Admin'],
          summary: 'Pagos del tenant',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'tenantId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Lista de pagos' } },
        },
      },
      '/api/super-admin/invoices': {
        post: {
          tags: ['Super Admin'],
          summary: 'Crear factura manual',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { tenant_id: { type: 'integer' }, amount: { type: 'number' }, description: { type: 'string' }, due_date: { type: 'string', format: 'date' } }, required: ['tenant_id', 'amount'] } } } },
          responses: { 201: { description: 'Factura creada' } },
        },
      },
      '/api/super-admin/invoices/{id}/pay': {
        put: {
          tags: ['Super Admin'],
          summary: 'Marcar factura como pagada',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { payment_method: { type: 'string', default: 'transfer' } } } } } },
          responses: { 200: { description: 'Factura pagada' } },
        },
      },
      '/api/super-admin/stats/billing': {
        get: {
          tags: ['Super Admin'],
          summary: 'Estadísticas de facturación',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Estadísticas' } },
        },
      },
      '/api/super-admin/plan-prices': {
        get: {
          tags: ['Super Admin'],
          summary: 'Precios de planes',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista de precios' } },
        },
      },
      '/api/super-admin/plan-prices/{planName}': {
        put: {
          tags: ['Super Admin'],
          summary: 'Actualizar precio de plan',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'planName', in: 'path', required: true, schema: { type: 'string', enum: ['pro', 'enterprise'] } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { price: { type: 'number' }, currency: { type: 'string', default: 'UYU' } }, required: ['price'] } } } },
          responses: { 200: { description: 'Precio actualizado' } },
        },
      },
      '/api/super-admin/config': {
        get: {
          tags: ['Super Admin'],
          summary: 'Obtener configuración global',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Configuración actual' } },
        },
        put: {
          tags: ['Super Admin'],
          summary: 'Actualizar configuración global',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'object' } }, required: ['key', 'value'] } } } },
          responses: { 200: { description: 'Configuración guardada' } },
        },
      },

      // ===== STAFF DASHBOARD =====
      '/api/appointments': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Listar turnos (paginado)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'clientPhone', in: 'query', schema: { type: 'string' } },
            { name: 'staffId', in: 'query', schema: { type: 'integer' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { 200: { description: 'Turnos paginados' } },
        },
        post: {
          tags: ['Staff Dashboard'],
          summary: 'Crear turno manual',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { clientName: { type: 'string' }, clientPhone: { type: 'string' }, serviceId: { type: 'integer' }, appointmentDate: { type: 'string', format: 'date-time' }, staffId: { type: 'integer' } }, required: ['clientName', 'clientPhone', 'serviceId', 'appointmentDate'] } } } },
          responses: { 201: { description: 'Turno creado' } },
        },
      },
      '/api/appointments/today': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Turnos del día',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista de turnos del día' } },
        },
      },
      '/api/appointments/{id}/status': {
        put: {
          tags: ['Staff Dashboard'],
          summary: 'Cambiar estado de turno',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['confirmed', 'cancelled', 'completed', 'no-show'] } }, required: ['status'] } } } },
          responses: { 200: { description: 'Estado actualizado' } },
        },
      },
      '/api/appointments/{id}': {
        delete: {
          tags: ['Staff Dashboard'],
          summary: 'Eliminar turno',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Turno eliminado' } },
        },
      },
      '/api/appointments/search': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Buscar turnos por teléfono',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'phone', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Turnos encontrados' } },
        },
      },
      '/api/tenant/me': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Datos del tenant',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Configuración del tenant', content: { 'application/json': { schema: { $ref: '#/components/schemas/TenantConfig' } } } } },
        },
      },
      '/api/tenant/plan': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Información del plan',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Plan actual + opciones disponibles' } },
        },
      },
      '/api/tenant/subscribe': {
        post: {
          tags: ['Staff Dashboard'],
          summary: 'Suscribirse a plan pago',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { plan: { type: 'string', enum: ['pro', 'enterprise'] } } } } } },
          responses: { 200: { description: 'Preferencia de pago creada' } },
        },
      },
      '/api/tenant/invoices': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Facturas del tenant',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista de facturas' } },
        },
      },
      '/api/tenant/invoices/{id}/pay': {
        post: {
          tags: ['Staff Dashboard'],
          summary: 'Pagar factura',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Preferencia de pago' } },
        },
      },
      '/api/tenant/settings': {
        put: {
          tags: ['Staff Dashboard'],
          summary: 'Actualizar configuración del negocio',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { business_name: { type: 'string' }, business_address: { type: 'string' }, business_phone: { type: 'string' }, notification_email: { type: 'string' }, brand_primary_color: { type: 'string' }, brand_logo_url: { type: 'string' }, opening_hours: { type: 'object' }, services: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } } } },
          responses: { 200: { description: 'Configuración actualizada' } },
        },
      },
      '/api/tenant/staff': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Listar staff',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista del staff', content: { 'application/json': { schema: { type: 'object', properties: { staff: { type: 'array', items: { $ref: '#/components/schemas/Staff' } } } } } } } },
        },
        post: {
          tags: ['Staff Dashboard'],
          summary: 'Crear staff (envía credenciales por email)',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, role: { type: 'string', default: 'staff' }, specialties: { type: 'array', items: { type: 'string' } }, photo_url: { type: 'string' }, bio: { type: 'string' } }, required: ['name', 'email'] } } } },
          responses: { 201: { description: 'Staff creado' } },
        },
      },
      '/api/tenant/staff/{id}': {
        put: {
          tags: ['Staff Dashboard'],
          summary: 'Editar staff',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, specialties: { type: 'array', items: { type: 'string' } }, photo_url: { type: 'string' }, bio: { type: 'string' }, individual_hours: { type: 'object' }, active: { type: 'boolean' } } } } } },
          responses: { 200: { description: 'Staff actualizado' } },
        },
        delete: {
          tags: ['Staff Dashboard'],
          summary: 'Eliminar staff',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Staff eliminado' } },
        },
      },
      '/api/tenant/services': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Listar servicios',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista de servicios', content: { 'application/json': { schema: { type: 'object', properties: { services: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } } } } },
        },
        post: {
          tags: ['Staff Dashboard'],
          summary: 'Crear servicio',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, duration: { type: 'integer' }, price: { type: 'number' }, image: { type: 'string' } }, required: ['name', 'duration', 'price'] } } } },
          responses: { 201: { description: 'Servicio creado' } },
        },
      },
      '/api/tenant/services/{id}': {
        put: {
          tags: ['Staff Dashboard'],
          summary: 'Editar servicio',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, duration: { type: 'integer' }, price: { type: 'number' }, active: { type: 'boolean' }, image: { type: 'string' } } } } } },
          responses: { 200: { description: 'Servicio actualizado' } },
        },
        delete: {
          tags: ['Staff Dashboard'],
          summary: 'Eliminar servicio',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Servicio eliminado' } },
        },
      },
      '/api/tenant/clients': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Buscar clientes',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'q', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por nombre o teléfono' }],
          responses: { 200: { description: 'Lista de clientes' } },
        },
      },
      '/api/tenant/clients/{phone}/appointments': {
        get: {
          tags: ['Staff Dashboard'],
          summary: 'Historial de turnos del cliente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'phone', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Turnos del cliente' } },
        },
      },

      // ===== LANDING PÚBLICA =====
      '/p/{slug}/config': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Configuración pública del tenant',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Configuración del salón', content: { 'application/json': { schema: { $ref: '#/components/schemas/TenantConfig' } } } } },
        },
      },
      '/p/{slug}/services': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Servicios activos',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Lista de servicios', content: { 'application/json': { schema: { type: 'object', properties: { services: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } } } } },
        },
      },
      '/p/{slug}/staff': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Staff con servicios',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Lista del staff' } },
        },
      },
      '/p/{slug}/availability': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Horarios disponibles',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'serviceId', in: 'query', required: true, schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Slots disponibles' } },
        },
      },
      '/p/{slug}/staff/{staffId}/availability': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Horarios disponibles para un staff específico',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'staffId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
            { name: 'serviceId', in: 'query', required: true, schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Slots disponibles' } },
        },
      },
      '/p/{slug}/appointments': {
        post: {
          tags: ['Landing Pública'],
          summary: 'Crear turno (booking público)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { clientName: { type: 'string' }, clientPhone: { type: 'string' }, clientEmail: { type: 'string', format: 'email' }, serviceId: { type: 'integer' }, appointmentDate: { type: 'string', format: 'date-time' }, staffId: { type: 'integer' }, notes: { type: 'string' }, recurring: { type: 'object', properties: { frequency: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'] }, count: { type: 'integer', maximum: 12, default: 1 } } } }, required: ['clientName', 'clientPhone', 'serviceId', 'appointmentDate'] } } } },
          responses: {
            '201': { description: 'Turno(s) creado(s). Incluye management_link, checkout_url si requiere seña, recurring_count si es recurrente.' },
            '400': { description: 'Error de validación o fecha en pasado' },
            '404': { description: 'Peluquería o servicio no encontrado' },
            '403': { description: 'Plan sin cupo o trial expirado' },
            '409': { description: 'Horario ya reservado' },
          },
        },
      },
      '/p/{slug}/landing': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Landing page config completa',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Datos completos de la landing' } },
        },
        put: {
          tags: ['Landing Pública'],
          summary: 'Actualizar landing page',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { landing_description: { type: 'string' }, landing_hero_image: { type: 'string' }, landing_gallery: { type: 'array' }, landing_team: { type: 'array' }, landing_social_links: { type: 'object' }, landing_custom_css: { type: 'string' }, landing_enabled: { type: 'boolean' }, landing_layout: { type: 'array' } } } } } },
          responses: { 200: { description: 'Landing actualizada' } },
        },
      },

      '/p/{slug}/appointments/manage/{token}': {
        get: {
          tags: ['Landing Pública'],
          summary: 'Obtener turno por token (portal cliente)',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'token', in: 'path', required: true, schema: { type: 'string' }, description: 'Token único enviado al cliente' },
          ],
          responses: { 200: { description: 'Datos del turno' }, 404: { description: 'Token inválido' } },
        },
      },
      '/p/{slug}/appointments/manage/{token}/cancel': {
        put: {
          tags: ['Landing Pública'],
          summary: 'Cancelar turno por token (portal cliente)',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'token', in: 'path', required: true, schema: { type: 'string' }, description: 'Token único enviado al cliente' },
          ],
          responses: { 200: { description: 'Turno cancelado' }, 404: { description: 'Token inválido' } },
        },
      },
      '/p/{slug}/appointments/manage/{token}/reschedule': {
        put: {
          tags: ['Landing Pública'],
          summary: 'Reprogramar turno por token (portal cliente)',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'token', in: 'path', required: true, schema: { type: 'string' }, description: 'Token único enviado al cliente' },
          ],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { newDate: { type: 'string', format: 'date-time' } }, required: ['newDate'] } } } },
          responses: { 200: { description: 'Turno reprogramado' }, 400: { description: 'Fecha inválida' }, 404: { description: 'Token inválido' } },
        },
      },

      // ===== PUSH NOTIFICATIONS =====
      '/api/push/vapid-public-key': {
        get: {
          tags: ['Notificaciones Push'],
          summary: 'Obtener clave VAPID pública',
          responses: { 200: { description: 'Clave VAPID pública' } },
        },
      },
      '/api/push/subscribe': {
        post: {
          tags: ['Notificaciones Push'],
          summary: 'Suscribirse a notificaciones push',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { subscription: { type: 'object' }, tenantId: { type: 'integer' } }, required: ['subscription', 'tenantId'] } } } },
          responses: { 201: { description: 'Suscripción creada' } },
        },
      },
      '/api/push/unsubscribe': {
        post: {
          tags: ['Notificaciones Push'],
          summary: 'Desuscribirse de notificaciones push',
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' } }, required: ['endpoint'] } } } },
          responses: { 200: { description: 'Suscripción eliminada' } },
        },
      },

      // ===== MERCADOPAGO =====
      '/api/payments/mercadopago/create': {
        post: {
          tags: ['Pagos'],
          summary: 'Crear preferencia de pago',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { invoiceId: { type: 'integer' } }, required: ['invoiceId'] } } } },
          responses: { 200: { description: 'Preferencia creada' } },
        },
      },
      '/api/payments/mercadopago/webhook': {
        post: {
          tags: ['Pagos'],
          summary: 'Webhook IPN de MercadoPago',
          responses: { 200: { description: 'Webhook procesado' } },
        },
      },
      '/api/test-webhook': {
        get: {
          tags: ['Pagos'],
          summary: 'Health check webhook',
          responses: { 200: { description: 'OK' } },
        },
      },

      // ===== MISC =====
      '/api/health': {
        get: {
          tags: ['Misceláneas'],
          summary: 'Health check',
          responses: { 200: { description: 'Estado del servidor y DB' } },
        },
      },
      '/api/tenants': {
        get: {
          tags: ['Misceláneas'],
          summary: 'Directorio público de salones',
          responses: { 200: { description: 'Lista de salones activos' } },
        },
      },
      '/api/upload-image': {
        post: {
          tags: ['Misceláneas'],
          summary: 'Subir imagen (base64, max 5MB)',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { image: { type: 'string', description: 'Base64 data URI' }, filename: { type: 'string' } }, required: ['image', 'filename'] } } } },
          responses: { 200: { description: 'URL de la imagen subida' } },
        },
      },
      '/api/agenda': {
        get: {
          tags: ['Misceláneas'],
          summary: 'Agenda personal del cliente',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Eventos de agenda' } },
        },
        post: {
          tags: ['Misceláneas'],
          summary: 'Crear evento en agenda',
          security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { titulo: { type: 'string' }, fecha: { type: 'string', format: 'date-time' }, descripcion: { type: 'string' } }, required: ['titulo', 'fecha'] } } } },
          responses: { 201: { description: 'Evento creado' } },
        },
      },
      '/api/agenda/{id}': {
        put: {
          tags: ['Misceláneas'],
          summary: 'Editar evento de agenda',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { titulo: { type: 'string' }, fecha: { type: 'string', format: 'date-time' }, descripcion: { type: 'string' } } } } } },
          responses: { 200: { description: 'Evento actualizado' } },
        },
        delete: {
          tags: ['Misceláneas'],
          summary: 'Eliminar evento de agenda',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Evento eliminado' } },
        },
      },
    },
  },
  apis: [],
};

if (config.METRICS_ENABLED) {
  options.definition.paths['/metrics'] = {
    get: {
      tags: ['Monitoreo'],
      summary: 'Metrics endpoint compatible con Prometheus',
      responses: { 200: { description: 'Métricas Prometheus en texto plano' } },
    },
  };
  options.definition.paths['/monitoring/summary'] = {
    get: {
      tags: ['Monitoreo'],
      summary: 'Resumen de monitoreo en JSON con estado, métricas y uso de recursos',
      responses: { 200: { description: 'Resumen de estado y métricas del servicio' } },
    },
  };
}

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
