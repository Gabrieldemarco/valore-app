// @ts-check
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const sanitizeHtml = require('sanitize-html');
const { query, queryOne } = require('../database');
const logger = require('../services/logger');
const { getOrCreateSubscriptionInvoice } = require('../services/billing');
const {
  authenticateStaff,
  checkTenantActive,
  checkTrialExpiration,
} = require('../middleware');

/**
 * @param {(invoice: any, tenant: any, req: import('express').Request, returnPath?: string) => Promise<any>} createMercadoPagoPreference
 * @param {string} MP_CURRENCY
 * @param {string} MP_LOCALE
 * @param {string} MP_COUNTRY
 * @param {Object<string, {name: string, price: number}>} PLANS
 * @returns {import('express').Router}
 */
module.exports = function (createMercadoPagoPreference, MP_CURRENCY, MP_LOCALE, MP_COUNTRY, PLANS) {
  const router = Router();

  // ========== APPOINTMENTS ==========

  router.get('/appointments', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const { date, status, clientPhone, staffId, page = 1, limit = 50 } = req.query;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      let sql = 'SELECT a.*, s.name as staff_name FROM appointments a LEFT JOIN staff s ON a.staff_id = s.id WHERE a.tenant_id = $1';
      const params = [req.user.tenant_id];

      if (date) { sql += ` AND a.appointment_date::date = $${params.length + 1}`; params.push(date); }
      if (status) { sql += ` AND a.status = $${params.length + 1}`; params.push(status); }
      if (clientPhone) { sql += ` AND a.client_phone LIKE $${params.length + 1}`; params.push(`%${clientPhone}%`); }
      if (staffId && staffId !== 'all') { sql += ` AND a.staff_id = $${params.length + 1}`; params.push(parseInt(staffId, 10)); }
      sql += ' ORDER BY a.appointment_date ASC';

      const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as sub`, params);
      const total = parseInt(countResult.rows[0].total);

      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const result = await query(sql, params);
      res.json({ appointments: result.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    } catch (err) { logger.error('Error al cargar turnos', { error: err.message }); res.status(500).json({ error: 'Error al cargar turnos' }); }
  });

  router.get('/appointments/today', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await query(
        `SELECT * FROM appointments WHERE tenant_id = $1 AND appointment_date::date = $2 AND status != 'cancelled' ORDER BY appointment_date ASC`,
        [req.user.tenant_id, today]
      );
      res.json(result.rows);
    } catch (err) { logger.error('Error al cargar turnos del dia', { error: err.message }); res.status(500).json({ error: 'Error al cargar turnos del día' }); }
  });

  router.put('/appointments/:id/status', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const { status, internalNotes } = req.body;
      if (!['confirmed', 'cancelled', 'completed', 'no-show'].includes(status)) return res.status(400).json({ error: 'Estado no válido' });
      const result = await query(
        `UPDATE appointments SET status = $1, internal_notes = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 RETURNING *`,
        [status, internalNotes || null, req.params.id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
      res.json({ message: 'Estado actualizado', appointment: result.rows[0] });
    } catch (err) { logger.error('Error al actualizar estado', { error: err.message }); res.status(500).json({ error: 'Error al actualizar estado' }); }
  });

  router.delete('/appointments/:id', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const result = await query(`DELETE FROM appointments WHERE id = $1 AND tenant_id = $2 RETURNING id`, [req.params.id, req.user.tenant_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
      res.json({ message: 'Turno eliminado' });
    } catch (err) { logger.error('Error al eliminar turno', { error: err.message }); res.status(500).json({ error: 'Error al eliminar turno' }); }
  });

  router.get('/appointments/search', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone) return res.status(400).json({ error: 'Teléfono requerido' });
      const result = await query(
        `SELECT * FROM appointments WHERE tenant_id = $1 AND client_phone LIKE $2 ORDER BY appointment_date DESC`,
        [req.user.tenant_id, `%${phone}%`]
      );
      res.json(result.rows);
    } catch (err) { logger.error('Error en busqueda', { error: err.message }); res.status(500).json({ error: 'Error en búsqueda' }); }
  });

  // ========== TENANT CONFIG ==========

  router.get('/tenant/me', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      if (!req.user.tenant_id) return res.status(400).json({ error: 'Usuario no asociado a una peluquería' });
      const tenant = await queryOne(
        `SELECT id, slug, business_name, business_address, business_phone,
                notification_email, notification_whatsapp, smtp_email, smtp_password,
                brand_primary_color, brand_secondary_color, brand_logo_url,
                landing_description, landing_enabled, landing_hero_image,
                landing_gallery, landing_team, landing_services_info,
                landing_social_links, landing_custom_css, landing_layout, opening_hours, updated_at, plan, trial_end_date
          FROM tenants WHERE id = $1`,
        [req.user.tenant_id]
      );
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
      delete tenant.smtp_password;
      const servicesResult = await query(
        `SELECT id, name, duration, price, active, image FROM services WHERE tenant_id = $1 AND active = true ORDER BY name`,
        [req.user.tenant_id]
      );
      res.json({ tenant, services: servicesResult.rows });
    } catch (err) { logger.error(err); res.status(500).json({ error: 'Error al cargar configuración' }); }
  });

  router.get('/tenant/plan', authenticateStaff, async (req, res) => {
    try {
      const tenant = await queryOne(
        `SELECT plan, status, trial_end_date, trial_start_date FROM tenants WHERE id = $1`,
        [req.user.tenant_id]
      );
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });

      let trialDaysLeft = null;
      if (tenant.plan === 'free' && tenant.trial_end_date) {
        trialDaysLeft = Math.ceil((new Date(tenant.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24));
      }

      res.json({
        tenant: {
          plan: tenant.plan,
          status: tenant.status,
          trial_end_date: tenant.trial_end_date,
          trialDaysLeft,
        },
        currency: MP_CURRENCY,
        locale: MP_LOCALE,
        country: MP_COUNTRY,
        plans: {
          pro: { ...PLANS.pro, id: 'pro' },
          enterprise: { ...PLANS.enterprise, id: 'enterprise' },
        },
      });
    } catch (err) {
      logger.error('Error cargando plan', { error: err.message });
      res.status(500).json({ error: 'Error al cargar plan' });
    }
  });

  router.post('/tenant/subscribe', authenticateStaff, async (req, res) => {
    try {
      if (!process.env.MP_ACCESS_TOKEN) {
        return res.status(503).json({ error: 'Mercado Pago no está configurado. Contactá al administrador.' });
      }

      const plan = (req.body.plan || 'pro').toLowerCase();
      if (!PLANS[plan] || plan === 'free') {
        return res.status(400).json({ error: 'Plan no válido' });
      }

      const tenant = await queryOne(
        'SELECT id, plan, status, business_name, slug FROM tenants WHERE id = $1',
        [req.user.tenant_id]
      );
      if (!tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });

      if (tenant.plan === plan && tenant.status === 'active') {
        return res.status(400).json({ error: 'Ya tenés este plan activo' });
      }

      const invoice = await getOrCreateSubscriptionInvoice(
        query, queryOne, req.user.tenant_id, plan, PLANS[plan].price
      );

      const preference = await createMercadoPagoPreference(invoice, tenant, req, '/staff/dashboard');

      await query(
        `INSERT INTO payments (invoice_id, tenant_id, amount, currency, method, status, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoice.id, invoice.tenant_id, invoice.amount, MP_CURRENCY, 'mercadopago', 'pending', JSON.stringify(preference)]
      );

      res.json({
        init_point: preference.init_point || preference.sandbox_init_point,
        preferenceId: preference.id,
        invoiceId: invoice.id,
        plan,
        planName: PLANS[plan].name,
        amount: parseFloat(invoice.amount),
        currency: MP_CURRENCY,
      });
    } catch (err) {
      logger.error('Error al suscribir plan', { error: err.message });
      res.status(500).json({ error: 'Error al iniciar el pago del plan' });
    }
  });

  router.get('/tenant/invoices', authenticateStaff, async (req, res) => {
    try {
      const invoices = await query(
        `SELECT id, invoice_number, amount, description, status, issue_date, due_date
         FROM invoices WHERE tenant_id = $1 ORDER BY issue_date DESC`,
        [req.user.tenant_id]
      );
      res.json({ invoices: invoices.rows });
    } catch (err) {
      logger.error('Error cargando facturas del tenant:', err);
      res.status(500).json({ error: 'Error al cargar facturas' });
    }
  });

  router.post('/tenant/invoices/:id/pay', authenticateStaff, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id, 10);
      if (!invoiceId) return res.status(400).json({ error: 'invoiceId inválido' });

      const invoice = await queryOne('SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2', [invoiceId, req.user.tenant_id]);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
      if (invoice.status === 'paid') return res.status(400).json({ error: 'Factura ya pagada' });

      const tenant = await queryOne('SELECT id, business_name, slug FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

      const preference = await createMercadoPagoPreference(invoice, tenant, req);

      await query(
        `INSERT INTO payments (invoice_id, tenant_id, amount, currency, method, status, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoice.id, invoice.tenant_id, invoice.amount, MP_CURRENCY, 'mercadopago', 'pending', JSON.stringify(preference)]
      );

      res.json({
        init_point: preference.init_point || preference.sandbox_init_point,
        preferenceId: preference.id,
      });
    } catch (err) {
      logger.error('Error creando preferencia MercadoPago tenant:', err);
      res.status(500).json({ error: 'Error al iniciar el pago' });
    }
  });

  router.put('/tenant/settings', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const {
        business_name, business_address, business_phone,
        notification_email, notification_whatsapp,
        smtp_email, smtp_password,
        landing_description, landing_enabled, landing_hero_image,
        landing_gallery, landing_team, landing_services_info,
        landing_social_links, landing_custom_css, landing_layout,
        brand_primary_color, brand_secondary_color, brand_logo_url,
        opening_hours,
        services,
        servicesToDelete,
      } = req.body;

      if (!req.user.tenant_id) return res.status(400).json({ error: 'Usuario no asociado a una peluquería' });

      // Sanitizar bloques custom del layout
      if (landing_layout && Array.isArray(landing_layout)) {
        const sanitizeOpts = {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'iframe', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'img', 'figure', 'figcaption', 'hr', 'br',
            'span', 'div', 'section', 'header', 'footer',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'sup', 'sub', 'ins', 'del', 'mark', 'small',
            'video', 'source',
          ]),
          allowedAttributes: {
            '*': ['style', 'class', 'id', 'data-*'],
            'a': ['href', 'target', 'rel', 'title'],
            'img': ['src', 'alt', 'width', 'height', 'loading'],
            'iframe': ['src', 'width', 'height', 'style', 'allowfullscreen', 'loading', 'frameborder', 'allow', 'title', 'referrerpolicy'],
            'video': ['src', 'controls', 'width', 'height', 'autoplay', 'loop', 'muted', 'poster'],
            'source': ['src', 'type'],
            'td': ['colspan', 'rowspan'],
            'th': ['colspan', 'rowspan'],
          },
          allowedSchemes: ['http', 'https', 'mailto', 'tel'],
          allowedSchemesByTag: {
            iframe: ['https', 'http'],
            img: ['https', 'http', 'data'],
            video: ['https', 'http'],
          },
          allowProtocolRelative: false,
          disallowedTagsMode: 'discard',
        };
        for (const block of landing_layout) {
          if (block.type === 'custom' && block.content) {
            block.content = sanitizeHtml(block.content, sanitizeOpts);
          }
          if (block.title) {
            block.title = sanitizeHtml(block.title, { allowedTags: [], allowedAttributes: {} });
          }
          if (block.label) {
            block.label = sanitizeHtml(block.label, { allowedTags: [], allowedAttributes: {} });
          }
        }
      }

      if (services && Array.isArray(services)) {
        if (servicesToDelete?.length) {
          for (let id of servicesToDelete) {
            await query('DELETE FROM services WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
          }
        }
        for (let s of services) {
          if (s.name?.trim()) {
            const duration = parseInt(s.duration);
            if (isNaN(duration) || duration <= 0) return res.status(400).json({ error: `Duración inválida: ${s.name}` });
            const price = parseFloat(s.price) || 0;
            if (isNaN(price) || price < 0) return res.status(400).json({ error: `Precio inválido: ${s.name}` });
            if (s.id && s.id !== 'new') {
              await query(
                `UPDATE services SET name=$1,duration=$2,price=$3,active=true,image=$4 WHERE id=$5 AND tenant_id=$6`,
                [s.name.trim(), duration, price, s.image || '', s.id, req.user.tenant_id]
              );
            } else {
              await query(
                `INSERT INTO services (tenant_id,name,duration,price,active,image) VALUES ($1,$2,$3,$4,true,$5)`,
                [req.user.tenant_id, s.name.trim(), duration, price, s.image || '']
              );
            }
          }
        }
      }

      const result = await query(
        `UPDATE tenants SET
           business_name=COALESCE(NULLIF($1,''),business_name),
           business_address=COALESCE(NULLIF($2,''),business_address),
           business_phone=COALESCE(NULLIF($3,''),business_phone),
           notification_email=COALESCE(NULLIF($4,''),notification_email),
           notification_whatsapp=COALESCE(NULLIF($5,''),notification_whatsapp),
           smtp_email=COALESCE(NULLIF($6,''),smtp_email),
           smtp_password=COALESCE(NULLIF($7,''),smtp_password),
           landing_description=COALESCE($8,landing_description),
           landing_enabled=COALESCE($9::boolean,landing_enabled),
           landing_hero_image=COALESCE($10,landing_hero_image),
           landing_gallery=COALESCE($11::jsonb,landing_gallery),
           landing_team=COALESCE($12::jsonb,landing_team),
           landing_services_info=COALESCE($13::jsonb,landing_services_info),
           landing_social_links=COALESCE($14::jsonb,landing_social_links),
           landing_custom_css=COALESCE($15,landing_custom_css),
           landing_layout=COALESCE($16::jsonb,landing_layout),
           brand_primary_color=COALESCE($17,brand_primary_color),
           brand_secondary_color=COALESCE($18,brand_secondary_color),
           brand_logo_url=COALESCE($19,brand_logo_url),
           opening_hours=COALESCE($20::jsonb,opening_hours),
           updated_at=NOW()
          WHERE id=$21 RETURNING *`,
        [
          business_name, business_address, business_phone,
          notification_email, notification_whatsapp,
          smtp_email, smtp_password,
          landing_description, landing_enabled, landing_hero_image,
          landing_gallery ? JSON.stringify(landing_gallery) : null,
          landing_team ? JSON.stringify(landing_team) : null,
          landing_services_info ? JSON.stringify(landing_services_info) : null,
          landing_social_links ? JSON.stringify(landing_social_links) : null,
          landing_custom_css,
          landing_layout ? JSON.stringify(landing_layout) : null,
          brand_primary_color, brand_secondary_color, brand_logo_url,
          opening_hours ? JSON.stringify(opening_hours) : null,
          req.user.tenant_id,
        ]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquería no encontrada' });

      const servicesResult = await query(
        `SELECT id, name, duration, price, active, image FROM services WHERE tenant_id = $1 AND active = true ORDER BY name`,
        [req.user.tenant_id]
      );

      res.json({ message: 'Configuración actualizada', tenant: result.rows[0], services: servicesResult.rows });
    } catch (err) {
      logger.error('Error updating tenant:', err);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  });

  // ========== STAFF MANAGEMENT ==========

  router.get('/tenant/staff', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const staff = await query(
        'SELECT id, name, email, role, specialties, photo_url, bio, individual_hours, active FROM staff WHERE tenant_id = $1 ORDER BY name',
        [req.user.tenant_id]
      );
      res.json({ staff: staff.rows });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar staff' });
    }
  });

  router.post('/tenant/staff', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { name, email, role = 'staff', specialties = [], photo_url, bio } = req.body;

      if (!name || !email) return res.status(400).json({ error: 'Nombre y email son obligatorios' });

      const exists = await queryOne(
        'SELECT id FROM staff WHERE email = $1 AND tenant_id = $2',
        [email, req.user.tenant_id]
      );
      if (exists) return res.status(400).json({ error: 'Email ya registrado en esta peluquería' });

      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const result = await query(
        `INSERT INTO staff (tenant_id, email, password, name, role, specialties, photo_url, bio)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role`,
        [req.user.tenant_id, email, hashedPassword, name, role, specialties, photo_url, bio]
      );

      res.status(201).json({
        message: 'Peluquero creado. Compartí la contraseña temporal con el usuario de forma segura.',
        staff: result.rows[0],
        tempPassword,
      });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Error al crear peluquero' });
    }
  });

  router.put('/tenant/staff/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, specialties, photo_url, bio, individual_hours, active } = req.body;

      const result = await query(
        `UPDATE staff SET
           name = COALESCE($1, name),
           specialties = COALESCE($2::TEXT[], specialties),
           photo_url = COALESCE($3, photo_url),
           bio = COALESCE($4, bio),
           individual_hours = COALESCE($5::JSONB, individual_hours),
           active = COALESCE($6::BOOLEAN, active)
         WHERE id = $7 AND tenant_id = $8 RETURNING *`,
        [name, specialties, photo_url, bio, individual_hours ? JSON.stringify(individual_hours) : null, active, id, req.user.tenant_id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquero no encontrado' });

      res.json({ message: 'Peluquero actualizado', staff: result.rows[0] });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Error al actualizar peluquero' });
    }
  });

  return router;
};
