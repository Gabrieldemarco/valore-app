
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { authenticateSuperAdmin, validate } from '../middleware';
const config = require('../config');
import { body } from 'express-validator';
import { activateTenantFromPaidInvoice } from '../services/billing';
import { reloadPlanPrices } from '../services/payment-config';

/**
 * @param {import('express').RequestHandler} loginLimiter
 * @param {(invoice: any, tenant: any, req: import('express').Request, returnPath?: string) => Promise<any>} _createMercadoPagoPreference
 * @param {string} _MP_CURRENCY
 * @returns {import('express').Router}
 */
export default function(loginLimiter, _createMercadoPagoPreference, _MP_CURRENCY) {
  const router = Router();

  const superAdminLoginValidation = [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ];

  router.post('/super-admin/login', loginLimiter, superAdminLoginValidation, validate, async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await queryOne('SELECT * FROM super_admins WHERE email = $1', [email]);
      if (!admin) return res.status(400).json({ error: 'Credenciales inválidas' });
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });
      const token = jwt.sign(
        { id: admin.id, email: admin.email, name: admin.name, role: 'super_admin' },
        config.JWT_SECRET,
        { expiresIn: '24h', algorithm: config.JWT_ALGORITHM }
      );
      res.json({ token, name: admin.name, email: admin.email, role: 'super_admin' });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error de autenticación' }); }
  });

  router.get('/super-admin/tenants', authenticateSuperAdmin, async (req, res) => {
    try {
      const { status, plan, search } = (req.query as any);
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = parseInt(String(req.query.limit ?? '20'), 10);
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(100, Math.max(1, limit));
      const offset = (pageNum - 1) * limitNum;

      let sql = 'SELECT * FROM tenants';
      const params: any[] = [];
      if (status) { sql += ` WHERE status = $${params.length + 1}`; params.push(status); }
      if (plan) { sql += status ? ` AND plan = $${params.length + 1}` : ` WHERE plan = $${params.length + 1}`; params.push(plan); }
      if (search) { sql += (status || plan) ? ` AND (business_name ILIKE $${params.length + 1} OR slug ILIKE $${params.length + 1})` : ` WHERE (business_name ILIKE $${params.length + 1} OR slug ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
      sql += ' ORDER BY created_at DESC';

      const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as sub`, params);
      const total = parseInt(countResult.rows[0].total);

      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const result = await query(sql, params);
      res.json({ tenants: result.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar peluquerías' }); }
  });

  router.get('/super-admin/clients', authenticateSuperAdmin, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
      const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
      const cte = `
        WITH visits AS (
          SELECT regexp_replace(a.client_phone, '[^0-9]', '', 'g') AS client_key,
                 a.client_name, a.client_phone, a.client_email, a.client_timezone,
                 a.service, a.appointment_date, a.status, a.tenant_id, t.business_name
          FROM appointments a
          JOIN tenants t ON t.id = a.tenant_id
          WHERE regexp_replace(a.client_phone, '[^0-9]', '', 'g') <> ''
        ),
        clients AS (
          SELECT client_key,
                 (array_agg(client_name ORDER BY appointment_date DESC))[1] AS client_name,
                 (array_agg(client_phone ORDER BY appointment_date DESC))[1] AS client_phone,
                 (array_agg(client_email ORDER BY appointment_date DESC) FILTER (WHERE client_email IS NOT NULL))[1] AS client_email,
                 (array_agg(client_timezone ORDER BY (status = 'completed') DESC, appointment_date DESC) FILTER (WHERE client_timezone IS NOT NULL))[1] AS client_timezone,
                 COUNT(*)::int AS total_appointments,
                 COUNT(DISTINCT tenant_id) FILTER (WHERE status = 'completed')::int AS salons_visited_count,
                 array_agg(DISTINCT business_name) FILTER (WHERE status = 'completed') AS salons_visited,
                 array_agg(DISTINCT service) AS services_requested,
                 MIN(appointment_date) FILTER (WHERE status = 'completed') AS first_appointment,
                 MAX(appointment_date) FILTER (WHERE status = 'completed') AS last_appointment
          FROM visits
          GROUP BY client_key
        )`;
      const searchClause = search
        ? ` WHERE client_name ILIKE $1 OR client_phone ILIKE $1 OR client_email ILIKE $1 OR array_to_string(salons_visited, ' ') ILIKE $1 OR array_to_string(services_requested, ' ') ILIKE $1`
        : '';
      const params = search ? [`%${search}%`] : [];
      const countResult = await query(`${cte} SELECT COUNT(*)::int AS total FROM clients${searchClause}`, params);
      const total = countResult.rows[0].total;
      const result = await query(
        `${cte} SELECT * FROM clients${searchClause} ORDER BY last_appointment DESC NULLS LAST, total_appointments DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, (page - 1) * limit]
      );
      res.json({ clients: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar clientes globales' });
    }
  });

  router.get('/super-admin/clients/:phone/appointments', authenticateSuperAdmin, async (req, res) => {
    try {
      const clientPhone = req.params.phone.replace(/\D/g, '');
      if (!/^\d{8,15}$/.test(clientPhone)) return res.status(400).json({ error: 'Teléfono inválido' });
      const result = await query(
        `SELECT a.id, a.client_name, a.client_phone, a.client_email, a.client_timezone,
                a.service, a.appointment_date, a.status, a.notes, s.name AS staff_name,
                t.id AS tenant_id, t.business_name, t.slug AS tenant_slug
         FROM appointments a
         JOIN tenants t ON t.id = a.tenant_id
         LEFT JOIN staff s ON s.id = a.staff_id
         WHERE regexp_replace(a.client_phone, '[^0-9]', '', 'g') = $1
         ORDER BY a.appointment_date DESC`,
        [clientPhone]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json({ appointments: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar el historial global' });
    }
  });

  router.post('/super-admin/tenants', authenticateSuperAdmin, async (req, res) => {
    try {
      const { business_name, slug, email, phone, address, plan } = req.body;
      if (!business_name || !slug || !email) return res.status(400).json({ error: 'Faltan datos obligatorios' });
      const exists = await queryOne('SELECT id FROM tenants WHERE slug = $1', [slug]);
      if (exists) return res.status(400).json({ error: 'El slug ya existe' });
      const result = await query(
        `INSERT INTO tenants (slug, business_name, business_address, business_phone, notification_email, plan, status, landing_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', true) RETURNING *`,
        [slug, business_name, address || '', phone || '', email, plan || 'free']
      );
      res.status(201).json({ message: 'Peluquería creada', tenant: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al crear peluquería' }); }
  });

  router.put('/super-admin/tenants/:id', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { business_name, status, plan, billing_email, subscription_status, is_featured, display_order, featured_from, featured_to } = req.body;
      const result = await query(
        `UPDATE tenants SET business_name = COALESCE($1, business_name), status = COALESCE($2, status), plan = COALESCE($3, plan), billing_email = COALESCE($4, billing_email), subscription_status = COALESCE($5, subscription_status), is_featured = COALESCE($6, is_featured), display_order = COALESCE($7, display_order), featured_from = $8, featured_to = $9, updated_at = NOW() WHERE id = $10 RETURNING *`,
        [business_name, status, plan, billing_email, subscription_status, is_featured, display_order, featured_from, featured_to, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquería no encontrada' });
      res.json({ message: 'Peluquería actualizada', tenant: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al actualizar' }); }
  });

  router.delete('/super-admin/tenants/:id', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM appointments WHERE tenant_id = $1', [id]);
      await query('DELETE FROM services WHERE tenant_id = $1', [id]);
      await query('DELETE FROM staff WHERE tenant_id = $1', [id]);
      await query('DELETE FROM invoices WHERE tenant_id = $1', [id]);
      const result = await query('DELETE FROM tenants WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquería no encontrada' });
      res.json({ message: 'Peluquería eliminada permanentemente' });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al eliminar' }); }
  });

  router.get('/super-admin/tenants/:id', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await queryOne(
        `SELECT *,
          CASE WHEN plan = 'free' AND trial_end_date IS NOT NULL AND trial_end_date < NOW() THEN true ELSE false END AS trial_expired,
          CASE WHEN plan = 'free' AND trial_end_date IS NOT NULL AND trial_end_date > NOW() THEN CEIL(EXTRACT(EPOCH FROM (trial_end_date - NOW())) / 86400) ELSE 0 END AS trial_days_left
         FROM tenants WHERE id = $1`,
        [id]
      );
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
      res.json({ tenant });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar tenant' }); }
  });

  router.post('/super-admin/tenants/:id/set-trial', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { days } = req.body;
      const trialDays = parseInt(days) || 15;
      const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
      const result = await query(
        `UPDATE tenants SET plan = 'free', status = 'active', trial_start_date = NOW(), trial_end_date = NOW() + $1::interval, subscription_status = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [`${trialDays} days`, id]
      );
      logger.info(`Tenant ${id} (${tenant.business_name}) puesto en trial por ${trialDays} días por superadmin`);
      res.json({ message: `Cuenta puesta en trial por ${trialDays} días`, tenant: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al poner en trial' }); }
  });

  router.post('/super-admin/tenants/:id/reactivate', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { mode, days } = req.body;

      const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [id]);
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });

      let updateSql, updateParams;

      const upgradePlan = mode === 'upgrade_pro' ? 'pro'
        : mode === 'upgrade_estandar' ? 'estandar'
        : mode === 'upgrade_premium' ? 'premium'
        : null;

      if (upgradePlan) {
        updateSql = `UPDATE tenants SET status = 'active', plan = $1, trial_end_date = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`;
        updateParams = [upgradePlan, id];
      } else {
        const extensionDays = parseInt(days) || 15;
        updateSql = `UPDATE tenants SET status = 'active', trial_end_date = NOW() + $1::interval, updated_at = NOW() WHERE id = $2 RETURNING *`;
        updateParams = [`${extensionDays} days`, id];
      }

      const result = await query(updateSql, updateParams);
      if (result.rows.length === 0) return res.status(404).json({ error: 'No se pudo reactivar' });

      logger.info(`Tenant ${id} reactivado por superadmin (mode: ${mode || 'extend_trial'})`);
      const planNames = { upgrade_pro: 'Pro', upgrade_estandar: 'Estándar', upgrade_premium: 'Premium' };
      const planKey = mode && planNames[mode as keyof typeof planNames];
      res.json({
        message: planKey ? `Cuenta actualizada al plan ${planKey} y reactivada` : `Cuenta reactivada con ${days || 15} días adicionales`,
        tenant: result.rows[0],
      });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al reactivar' }); }
  });

  router.get('/super-admin/tenants/:tenantId/invoices', authenticateSuperAdmin, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { status } = (req.query as any);
      let sql = 'SELECT * FROM invoices WHERE tenant_id = $1';
      const params = [tenantId];
      if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
      sql += ' ORDER BY issue_date DESC';
      const result = await query(sql, params);
      res.json({ invoices: result.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar facturas' }); }
  });

  router.get('/super-admin/tenants/:tenantId/payments', authenticateSuperAdmin, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const result = await query(
        `SELECT p.*, i.invoice_number, i.description as invoice_description
         FROM payments p
         LEFT JOIN invoices i ON i.id = p.invoice_id
         WHERE p.tenant_id = $1
         ORDER BY p.created_at DESC`,
        [tenantId]
      );
      res.json({ payments: result.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar pagos' }); }
  });

  // ========== SERVICES FOR TENANT ==========
  router.get('/super-admin/tenants/:tenantId/services', authenticateSuperAdmin, async (req, res) => {
    try {
      const { tenantId } = req.params;
      const result = await query(
        `SELECT id, name, price, duration, image, active, is_featured, category, description, category_id, tenant_id
         FROM services
         WHERE tenant_id = $1
         ORDER BY name ASC`,
        [tenantId]
      );
      res.json({ services: result.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar servicios' }); }
  });

  router.put('/super-admin/services/:id', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { is_featured, display_order } = req.body;
      
      // Si se quiere marcar como destacado, verificar que tenga imagen
      if (is_featured === true) {
        const service = await queryOne('SELECT image FROM services WHERE id = $1', [id]);
        if (!service || !service.image) {
          return res.status(400).json({ error: 'El servicio debe tener una imagen para ser destacado' });
        }
      }
      
      const result = await query(
        `UPDATE services SET is_featured = COALESCE($1, is_featured), display_order = COALESCE($2, display_order), updated_at = NOW() WHERE id = $3 RETURNING *`,
        [is_featured, display_order, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
      res.json({ message: 'Servicio actualizado', service: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al actualizar servicio' }); }
  });

  // Subida de imagen para servicio
  router.post('/super-admin/services/:id/image', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { image, filename } = req.body;
      
      if (!image) return res.status(400).json({ error: 'Imagen requerida' });
      
      const allowedTypes: Record<string, string> = {
        jpeg: 'jpg', jpg: 'jpg', png: 'png', gif: 'gif', webp: 'webp'
      };
      
      const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ error: 'Formato de imagen inválido' });
      
      const mimeType = matches[1].toLowerCase();
      const ext = allowedTypes[mimeType];
      if (!ext) return res.status(400).json({ error: 'Tipo de imagen no soportado' });
      
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Imagen muy grande (max 5MB)' });
      
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const filepath = path.join(uploadsDir, uniqueName);
      
      await fs.promises.writeFile(filepath, buffer);
      
      const imageUrl = `/uploads/${uniqueName}`;
      
      // Actualizar servicio con la nueva imagen
      await query(
        `UPDATE services SET image = $1, updated_at = NOW() WHERE id = $2`,
        [imageUrl, id]
      );
      
      logger.info('Imagen de servicio subida: ' + imageUrl);
      res.json({ success: true, url: imageUrl, message: 'Imagen subida' });
    } catch (err: any) {
      logger.error('Upload service image error:', err);
      res.status(500).json({ error: 'Error al subir imagen' });
    }
  });

  router.post('/super-admin/invoices', authenticateSuperAdmin, async (req, res) => {
    try {
      const { tenant_id, amount, description, due_date } = req.body;
      if (!tenant_id || isNaN(amount)) return res.status(400).json({ error: 'Datos inválidos' });
      const count = await query('SELECT COUNT(*) FROM invoices');
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count.rows[0].count) + 1).padStart(3, '0')}`;
      const result = await query(
        `INSERT INTO invoices (tenant_id, invoice_number, amount, description, due_date, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [tenant_id, invoiceNumber, amount, description || '', due_date || null]
      );
      res.status(201).json({ message: 'Factura creada', invoice: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al crear factura' }); }
  });

  router.put('/super-admin/invoices/:id/pay', authenticateSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { payment_method } = req.body;
      const result = await query(
        `UPDATE invoices SET status = 'paid', paid_date = NOW(), payment_method = $1 WHERE id = $2 RETURNING *`,
        [payment_method || 'transfer', id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
      await query('UPDATE tenants SET last_payment_date = NOW() WHERE id = $1', [result.rows[0].tenant_id]);
      await activateTenantFromPaidInvoice(query, result.rows[0], { provider: 'manual' });
      res.json({ message: 'Factura marcada como pagada', invoice: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al actualizar factura' }); }
  });

  router.get('/super-admin/stats/billing', authenticateSuperAdmin, async (req, res) => {
    try {
      const totalInvoicedByCurrency = await query(
        `SELECT UPPER(COALESCE(payment.currency,
           CASE WHEN i.payment_method = 'stripe' THEN 'USD' ELSE 'UYU' END)) AS currency,
           SUM(i.amount)::numeric(14, 2) AS total
         FROM invoices i
         LEFT JOIN LATERAL (
           SELECT currency FROM payments WHERE invoice_id = i.id ORDER BY created_at DESC LIMIT 1
         ) payment ON true
         WHERE i.status = 'paid'
         GROUP BY 1`
      );
      const pendingInvoices = await queryOne('SELECT COUNT(*) as count FROM invoices WHERE status = \'pending\'');
      const activeTenants = await queryOne('SELECT COUNT(*) as count FROM tenants WHERE status = \'active\'');
      const invoicedByCurrency = Object.fromEntries(
        totalInvoicedByCurrency.rows.map((row: { currency: string; total: string }) => [
          row.currency,
          parseFloat(row.total) || 0,
        ])
      );
      res.json({
        totalInvoiced: Object.values(invoicedByCurrency).reduce((sum: number, amount: number) => sum + amount, 0),
        totalInvoicedByCurrency: invoicedByCurrency,
        pendingInvoices: parseInt(pendingInvoices.count) || 0,
        activeTenants: parseInt(activeTenants.count) || 0,
      });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar estadísticas' }); }
  });

  router.get('/super-admin/billing/invoices', authenticateSuperAdmin, async (req, res) => {
    try {
      const status = String(req.query.status || '');
      if (!['pending', 'paid'].includes(status)) {
        return res.status(400).json({ error: 'Estado de factura no válido' });
      }

      const result = await query(
        `SELECT i.id, i.invoice_number, i.amount, i.status, i.issue_date, i.due_date, i.payment_method,
           t.id AS tenant_id, t.business_name, t.slug,
           UPPER(COALESCE(payment.currency,
             CASE WHEN i.payment_method = 'stripe' THEN 'USD' ELSE 'UYU' END)) AS currency
         FROM invoices i
         JOIN tenants t ON t.id = i.tenant_id
         LEFT JOIN LATERAL (
           SELECT currency FROM payments WHERE invoice_id = i.id ORDER BY created_at DESC LIMIT 1
         ) payment ON true
         WHERE i.status = $1
         ORDER BY i.issue_date DESC, i.id DESC`,
        [status]
      );
      res.json({ invoices: result.rows });
    } catch (err: any) {
      logger.error('Error al cargar facturas globales', { error: err.message });
      res.status(500).json({ error: 'Error al cargar facturas' });
    }
  });

  router.get('/super-admin/plan-prices', authenticateSuperAdmin, async (req, res) => {
    try {
      const prices = await query('SELECT plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months, stripe_price_id, mp_item_id, updated_at FROM plan_prices ORDER BY plan_name');
      res.json({ prices: prices.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar precios' });
    }
  });

  router.put('/super-admin/plan-prices/:planName', authenticateSuperAdmin, async (req, res) => {
    try {
      const { planName } = req.params;
      const { price, price_usd, currency, promo_price, promo_price_usd, promo_months, stripe_price_id, mp_item_id } = req.body;

      const validPlans = ['free', 'basico', 'estandar', 'premium', 'pro'];
      if (!validPlans.includes(planName)) {
        return res.status(400).json({ error: 'Plan inválido' });
      }

      if (!price && price !== 0) {
        return res.status(400).json({ error: 'Precio es requerido' });
      }

      const numericPrice = parseFloat(price);
      if (isNaN(numericPrice)) {
        return res.status(400).json({ error: 'Precio inválido' });
      }

      await query(
        `INSERT INTO plan_prices (plan_name, price, price_usd, currency, promo_price, promo_price_usd, promo_months, stripe_price_id, mp_item_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (plan_name)
         DO UPDATE SET price = $2, price_usd = $3, currency = $4,
           promo_price = $5, promo_price_usd = $6, promo_months = $7,
           stripe_price_id = COALESCE($8, plan_prices.stripe_price_id), mp_item_id = COALESCE($9, plan_prices.mp_item_id), updated_at = CURRENT_TIMESTAMP`,
        [planName, numericPrice, price_usd || null, currency || 'UYU',
         promo_price || null, promo_price_usd || null, promo_months || 0,
         stripe_price_id || null, mp_item_id || null]
      );

      logger.info(`Precio actualizado: ${planName} -> ${numericPrice} ${currency || 'UYU'}`);
      await reloadPlanPrices(query);
      res.json({ message: 'Precio actualizado correctamente' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al actualizar precio' });
    }
  });

  router.get('/super-admin/config', authenticateSuperAdmin, async (req, res) => {
    try {
      const rows = await query('SELECT key, value FROM app_config');
      const config: Record<string, any> = {};
      for (const row of rows.rows) {
        if (row.key === 'twilio') {
          config.twilio = row.value;
        } else {
          config[row.key] = row.value;
        }
      }
      res.json({ config });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar configuración' });
    }
  });

  router.put('/super-admin/config', authenticateSuperAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key es requerido' });
      await query(
        `INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value)]
      );
      logger.info(`Config actualizada: ${key}`);
      res.json({ message: 'Configuración guardada' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al guardar configuración' });
    }
  });

  return router;
}
