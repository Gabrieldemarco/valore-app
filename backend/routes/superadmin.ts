
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { authenticateSuperAdmin } from '../middleware';
import { activateTenantFromPaidInvoice } from '../services/billing';

/**
 * @param {import('express').RequestHandler} loginLimiter
 * @param {(invoice: any, tenant: any, req: import('express').Request, returnPath?: string) => Promise<any>} createMercadoPagoPreference
 * @param {string} MP_CURRENCY
 * @returns {import('express').Router}
 */
export default function(loginLimiter, createMercadoPagoPreference, MP_CURRENCY) {
  const router = Router();

  router.post('/super-admin/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });
      const admin = await queryOne('SELECT * FROM super_admins WHERE email = $1', [email]);
      if (!admin) return res.status(400).json({ error: 'Credenciales inválidas' });
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });
      const token = jwt.sign(
        { id: admin.id, email: admin.email, name: admin.name, role: 'super_admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
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
      const params = [];
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
      const { business_name, status, plan, billing_email, subscription_status } = req.body;
      const result = await query(
        `UPDATE tenants SET business_name = COALESCE($1, business_name), status = COALESCE($2, status), plan = COALESCE($3, plan), billing_email = COALESCE($4, billing_email), subscription_status = COALESCE($5, subscription_status), updated_at = NOW() WHERE id = $6 RETURNING *`,
        [business_name, status, plan, billing_email, subscription_status, id]
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
        `UPDATE tenants SET plan = 'free', status = 'active', trial_start_date = NOW(), trial_end_date = NOW() + INTERVAL '${trialDays} days', subscription_status = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
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

      if (mode === 'upgrade_pro') {
        updateSql = `UPDATE tenants SET status = 'active', plan = 'pro', trial_end_date = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`;
        updateParams = [id];
      } else {
        const extensionDays = parseInt(days) || 15;
        updateSql = `UPDATE tenants SET status = 'active', trial_end_date = NOW() + INTERVAL '${extensionDays} days', updated_at = NOW() WHERE id = $1 RETURNING *`;
        updateParams = [id];
      }

      const result = await query(updateSql, updateParams);
      if (result.rows.length === 0) return res.status(404).json({ error: 'No se pudo reactivar' });

      logger.info(`Tenant ${id} reactivado por superadmin (mode: ${mode || 'extend_trial'})`);
      res.json({
        message: mode === 'upgrade_pro' ? 'Cuenta actualizada a Pro y reactivada' : `Cuenta reactivada con ${days || 15} días adicionales`,
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
      await activateTenantFromPaidInvoice(query, result.rows[0]);
      res.json({ message: 'Factura marcada como pagada', invoice: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al actualizar factura' }); }
  });

  router.get('/super-admin/stats/billing', authenticateSuperAdmin, async (req, res) => {
    try {
      const totalInvoiced = await queryOne('SELECT SUM(amount) as total FROM invoices WHERE status = \'paid\'');
      const pendingInvoices = await queryOne('SELECT COUNT(*) as count FROM invoices WHERE status = \'pending\'');
      const activeTenants = await queryOne('SELECT COUNT(*) as count FROM tenants WHERE status = \'active\'');
      res.json({
        totalInvoiced: parseFloat(totalInvoiced.total) || 0,
        pendingInvoices: parseInt(pendingInvoices.count) || 0,
        activeTenants: parseInt(activeTenants.count) || 0,
      });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar estadísticas' }); }
  });

  router.get('/super-admin/plan-prices', authenticateSuperAdmin, async (req, res) => {
    try {
      const prices = await query('SELECT plan_name, price, currency, updated_at FROM plan_prices ORDER BY plan_name');
      res.json({ prices: prices.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar precios' });
    }
  });

  router.put('/super-admin/plan-prices/:planName', authenticateSuperAdmin, async (req, res) => {
    try {
      const { planName } = req.params;
      const { price, currency } = req.body;

      if (!price || isNaN(price)) {
        return res.status(400).json({ error: 'Precio inválido' });
      }

      const validPlans = ['pro', 'enterprise'];
      if (!validPlans.includes(planName)) {
        return res.status(400).json({ error: 'Plan inválido' });
      }

      await query(
        `INSERT INTO plan_prices (plan_name, price, currency, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (plan_name)
         DO UPDATE SET price = $2, currency = $3, updated_at = CURRENT_TIMESTAMP`,
        [planName, price, currency || 'UYU']
      );

      logger.info(`Precio actualizado: ${planName} -> ${price} ${currency || 'UYU'}`);
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
};
