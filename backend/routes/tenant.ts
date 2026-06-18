
import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
const config = require('../config');
import { query, queryOne, pool } from '../database';
import logger from '../services/logger';
import { AppError } from '../services/errors';
import { getOrCreateSubscriptionInvoice } from '../services/billing';
import { sendClientConfirmation, notifyStaff, sendStaffCredentials } from '../services/notifications';
import { validate,
  authenticateStaff,
  checkTenantActive,
  checkTrialExpiration, } from '../middleware';

/**
 * @param {(invoice: any, tenant: any, req: import('express').Request, returnPath?: string) => Promise<any>} createMercadoPagoPreference
 * @param {string} MP_CURRENCY
 * @param {string} MP_LOCALE
 * @param {string} MP_COUNTRY
 * @param {Object<string, {name: string, price: number}>} PLANS
 * @returns {import('express').Router}
 */
export default function(createMercadoPagoPreference, MP_CURRENCY, MP_LOCALE, MP_COUNTRY, PLANS) {
  const router = Router();

  // ========== APPOINTMENTS ==========

  async function resolveServiceAndStaffForStaffAppointment(serviceId, staffId, tenantId, res) {
    const service = await queryOne(
      'SELECT * FROM services WHERE id = $1 AND tenant_id = $2',
      [serviceId, tenantId]
    );
    if (!service) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return null;
    }

    let validStaffId = null;
    if (staffId) {
      const staffMember = await queryOne(
        'SELECT id, name, email FROM staff WHERE id = $1 AND tenant_id = $2 AND active = true',
        [staffId, tenantId]
      );
      if (!staffMember) {
        res.status(400).json({ error: 'Peluquero no válido para esta peluquería' });
        return null;
      }
      validStaffId = staffMember.id;
    }

    return { service, validStaffId };
  }

  async function insertStaffAppointment(tenantId, body, service, validStaffId) {
    const { clientName, clientPhone, clientEmail, appointmentDate, notes, status } = body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
    const appointmentStatus = status && validStatuses.includes(status) ? status : 'confirmed';

    const clientToken = crypto.randomUUID();

    try {
      const result = await query(
        `INSERT INTO appointments (tenant_id, client_name, client_phone, client_email, service, service_duration, service_price, appointment_date, notes, staff_id, status, client_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [tenantId, clientName.trim(), clientPhone.trim(), clientEmail?.trim() || null, service.name, service.duration, service.price, appointmentDate, notes?.trim() || null, validStaffId, appointmentStatus, clientToken]
      );
      const newAppointment = result.rows[0];

      if (validStaffId) {
        const staffMember = await queryOne('SELECT name, email FROM staff WHERE id = $1', [validStaffId]);
        if (staffMember) {
          newAppointment.staff_name = staffMember.name;
          newAppointment.staff_email = staffMember.email;
        }
      }

      return newAppointment;
    } catch (dbErr: any) {
      if (dbErr.code === '23505') return null;
      throw dbErr;
    }
  }

  async function sendStaffAppointmentNotifications(appointment, tenantId, status) {
    if (status === 'confirmed') {
      const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [tenantId]);
      if (tenant) {
        sendClientConfirmation(appointment, tenant).catch(e => logger.error('Error notificacion cliente', { error: e.message }));
        notifyStaff(appointment, tenant).catch(e => logger.error('Error notificacion staff', { error: e.message }));
      }
    }
  }

  router.post('/appointments', authenticateStaff, checkTenantActive, [
    body('clientName').trim().isLength({ min: 1, max: 100 }).withMessage('Nombre requerido').escape(),
    body('clientPhone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido').escape(),
    body('clientEmail').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('serviceId').isInt({ min: 1 }).withMessage('Servicio inválido'),
    body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
  ], validate, async (req, res) => {
    try {
      const { clientName, clientPhone, clientEmail, serviceId, staffId, appointmentDate, notes, status } = req.body;
      if (new Date(appointmentDate) <= new Date()) {
        return res.status(400).json({ error: 'La fecha del turno debe ser futura' });
      }

      const resolved = await resolveServiceAndStaffForStaffAppointment(serviceId, staffId, req.user.tenant_id, res);
      if (!resolved) return;

      const newAppointment = await insertStaffAppointment(req.user.tenant_id, req.body, resolved.service, resolved.validStaffId);
      if (!newAppointment) {
        return res.status(409).json({ error: 'Horario ya reservado' });
      }

      await sendStaffAppointmentNotifications(newAppointment, req.user.tenant_id, newAppointment.status);

      res.status(201).json({ message: 'Turno creado', appointment: newAppointment });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al crear turno' });
    }
  });

  router.get('/appointments', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const { date, dateFrom, dateTo, status, clientPhone, staffId } = (req.query as any);
      const page = parseInt(String(req.query.page ?? '1'), 10);
      const limit = parseInt(String(req.query.limit ?? '50'), 10);
      const pageNum = Math.max(1, page);
      const limitNum = Math.min(100, Math.max(1, limit));
      const offset = (pageNum - 1) * limitNum;

      let sql = 'SELECT a.*, s.name as staff_name FROM appointments a LEFT JOIN staff s ON a.staff_id = s.id WHERE a.tenant_id = $1';
      const params = [req.user.tenant_id];

      if (date) { sql += ` AND a.appointment_date::date = $${params.length + 1}`; params.push(date); }
      if (dateFrom) { sql += ` AND a.appointment_date::date >= $${params.length + 1}`; params.push(dateFrom); }
      if (dateTo) { sql += ` AND a.appointment_date::date <= $${params.length + 1}`; params.push(dateTo); }
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
    } catch (err: any) { logger.error('Error al cargar turnos', { error: err.message }); res.status(500).json({ error: 'Error al cargar turnos' }); }
  });

  router.get('/appointments/today', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await query(
        `SELECT * FROM appointments WHERE tenant_id = $1 AND appointment_date::date = $2 AND status != 'cancelled' ORDER BY appointment_date ASC`,
        [req.user.tenant_id, today]
      );
      res.json(result.rows);
    } catch (err: any) { logger.error('Error al cargar turnos del dia', { error: err.message }); res.status(500).json({ error: 'Error al cargar turnos del día' }); }
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
      let waitlistCount = 0;
      if (status === 'cancelled') {
        const wc = await queryOne(
          'SELECT COUNT(*)::int as count FROM waitlist WHERE tenant_id = $1 AND status = $2',
          [req.user.tenant_id, 'waiting']
        );
        waitlistCount = wc?.count || 0;
      }
      res.json({ message: 'Estado actualizado', appointment: result.rows[0], waitlist_count: waitlistCount });
    } catch (err: any) { logger.error('Error al actualizar estado', { error: err.message }); res.status(500).json({ error: 'Error al actualizar estado' }); }
  });

  router.put('/appointments/:id/notes', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const { internalNotes } = req.body;
      const result = await query(
        `UPDATE appointments SET internal_notes = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
        [internalNotes || null, req.params.id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
      res.json({ message: 'Notas actualizadas', appointment: result.rows[0] });
    } catch (err: any) { logger.error('Error al actualizar notas', { error: err.message }); res.status(500).json({ error: 'Error al actualizar notas' }); }
  });

  router.delete('/appointments/:id', authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
    try {
      const result = await query(`DELETE FROM appointments WHERE id = $1 AND tenant_id = $2 RETURNING id`, [req.params.id, req.user.tenant_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
      res.json({ message: 'Turno eliminado' });
    } catch (err: any) { logger.error('Error al eliminar turno', { error: err.message }); res.status(500).json({ error: 'Error al eliminar turno' }); }
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
    } catch (err: any) { logger.error('Error en busqueda', { error: err.message }); res.status(500).json({ error: 'Error en búsqueda' }); }
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
                landing_social_links, landing_custom_css, landing_layout, opening_hours, reminder_hours, updated_at, plan, trial_end_date,
                landing_background_color, landing_hero_height, landing_hero_width,
                landing_primary_text_color, landing_secondary_text_color,
                landing_primary_font, landing_secondary_font,
                captcha_enabled
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
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar configuración' }); }
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
        trialDaysLeft = Math.ceil((new Date(tenant.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
    } catch (err: any) {
      logger.error('Error cargando plan', { error: err.message });
      res.status(500).json({ error: 'Error al cargar plan' });
    }
  });

  router.post('/tenant/subscribe', authenticateStaff, [
    body('plan').optional().isIn(['pro', 'enterprise']).withMessage('Plan no válido'),
  ], validate, async (req, res) => {
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
    } catch (err: any) {
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
    } catch (err: any) {
      logger.error('Error cargando facturas del tenant:', err);
      res.status(500).json({ error: 'Error al cargar facturas' });
    }
  });

  router.post('/tenant/invoices/:id/pay', authenticateStaff, [
    body('id').isInt().withMessage('invoiceId inválido'),
  ], validate, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id, 10);

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
    } catch (err: any) {
      logger.error('Error creando preferencia MercadoPago tenant:', err);
      res.status(500).json({ error: 'Error al iniciar el pago' });
    }
  });

  function sanitizeLandingLayout(layout) {
    if (layout && Array.isArray(layout)) {
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
        disallowedTagsMode: 'discard' as const,
      };
      for (const block of layout) {
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
      return layout;
    }
    return null;
  }

  async function updateTenantServices(tenantId, services, servicesToDelete) {
    if (services && Array.isArray(services)) {
      if (servicesToDelete?.length) {
        for (const id of servicesToDelete) {
          await query('DELETE FROM services WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        }
      }
      for (const s of services) {
        if (s.name?.trim()) {
          const duration = parseInt(s.duration);
          if (isNaN(duration) || duration <= 0) return `Duración inválida: ${s.name}`;
          const price = parseFloat(s.price) || 0;
          if (isNaN(price) || price < 0) return `Precio inválido: ${s.name}`;
          if (s.id && s.id !== 'new') {
            await query(
              `UPDATE services SET name=$1,duration=$2,price=$3,active=true,image=$4 WHERE id=$5 AND tenant_id=$6`,
              [s.name.trim(), duration, price, s.image || '', s.id, tenantId]
            );
          } else {
            await query(
              `INSERT INTO services (tenant_id,name,duration,price,active,image) VALUES ($1,$2,$3,$4,true,$5)`,
              [tenantId, s.name.trim(), duration, price, s.image || '']
            );
          }
        }
      }
    }
    return null;
  }

  function buildTenantUpdateQuery(tenantId, body) {
    const {
      business_name, business_address, business_phone,
      notification_email, notification_whatsapp,
      smtp_email, smtp_password,
      landing_description, landing_enabled, landing_hero_image,
      landing_gallery, landing_team, landing_services_info,
      landing_social_links, landing_custom_css, landing_layout,
      brand_primary_color, brand_secondary_color, brand_logo_url,
      opening_hours, lat, lng,
      landing_background_color, landing_hero_height, landing_hero_width,
      landing_primary_text_color, landing_secondary_text_color,
      landing_primary_font, landing_secondary_font, reminder_hours, captcha_enabled,
    } = body;

    const sql = `UPDATE tenants SET
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
             lat=COALESCE($21::double precision,lat),
             lng=COALESCE($22::double precision,lng),
             landing_background_color=COALESCE($23,landing_background_color),
             landing_hero_height=COALESCE($24::integer,landing_hero_height),
             landing_hero_width=COALESCE($25::integer,landing_hero_width),
             landing_primary_text_color=COALESCE($26,landing_primary_text_color),
             landing_secondary_text_color=COALESCE($27,landing_secondary_text_color),
             landing_primary_font=COALESCE($28,landing_primary_font),
             landing_secondary_font=COALESCE($29,landing_secondary_font),
             reminder_hours=COALESCE($30::INTEGER,reminder_hours),
             captcha_enabled=COALESCE($31::BOOLEAN,captcha_enabled),
             updated_at=NOW()
            WHERE id=$32 RETURNING *`;

    const params = [
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
      lat ?? null, lng ?? null,
      landing_background_color,
      landing_hero_height,
      landing_hero_width,
      landing_primary_text_color,
      landing_secondary_text_color,
      landing_primary_font,
      landing_secondary_font,
      reminder_hours !== undefined ? parseInt(reminder_hours, 10) : null,
      captcha_enabled !== undefined ? captcha_enabled : null,
      tenantId,
    ];

    return { sql, params };
  }

  const settingsValidation = [
    body('business_name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('notification_email').optional().isEmail().normalizeEmail(),
    body('brand_primary_color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color inválido'),
    body('brand_secondary_color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color inválido'),
    body('landing_background_color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color inválido'),
    body('landing_hero_height').optional().isInt({ min: 30, max: 100 }).withMessage('Altura inválida'),
    body('landing_hero_width').optional().isInt({ min: 50, max: 200 }).withMessage('Ancho inválido'),
    body('landing_primary_text_color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color inválido'),
    body('landing_secondary_text_color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color inválido'),
    body('captcha_enabled').optional().isBoolean().withMessage('captcha_enabled debe ser booleano'),
  ];

  router.put('/tenant/settings', authenticateStaff, checkTenantActive, checkTrialExpiration, settingsValidation, validate, async (req, res) => {
    try {
      if (!req.user.tenant_id) return res.status(400).json({ error: 'Usuario no asociado a una peluquería' });

      const { services, servicesToDelete } = req.body;

      req.body.landing_layout = sanitizeLandingLayout(req.body.landing_layout);

      const serviceError = await updateTenantServices(req.user.tenant_id, services, servicesToDelete);
      if (serviceError) return res.status(400).json({ error: serviceError });

      const { sql, params } = buildTenantUpdateQuery(req.user.tenant_id, req.body);
      const result = await query(sql, params);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquería no encontrada' });

      const servicesResult = await query(
        `SELECT id, name, duration, price, active, image FROM services WHERE tenant_id = $1 AND active = true ORDER BY name`,
        [req.user.tenant_id]
      );

      res.json({ message: 'Configuración actualizada', tenant: result.rows[0], services: servicesResult.rows });
    } catch (err: any) {
      logger.error('Error updating tenant:', err);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  });

  // ========== STAFF MANAGEMENT ==========

  router.get('/tenant/staff', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const staff = await query(
        'SELECT id, name, email, role, specialties, photo_url, bio, individual_hours, active, commission_type, commission_value FROM staff WHERE tenant_id = $1 ORDER BY name',
        [req.user.tenant_id]
      );
      res.json({ staff: staff.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar staff' });
    }
  });

  const createStaffValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres').escape(),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('role').optional().isIn(['staff', 'admin']).withMessage('Rol inválido'),
  ];

  router.post('/tenant/staff', authenticateStaff, checkTenantActive, createStaffValidation, validate, async (req, res) => {
    try {
      const { name, email, role = 'staff', specialties = [], photo_url, bio, commission_type, commission_value } = req.body;

      const exists = await queryOne(
        'SELECT id FROM staff WHERE email = $1 AND tenant_id = $2',
        [email, req.user.tenant_id]
      );
      if (exists) return res.status(400).json({ error: 'Email ya registrado en esta peluquería' });

      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, config.BCRYPT_ROUNDS);

      const result = await query(
        `INSERT INTO staff (tenant_id, email, password, name, role, specialties, photo_url, bio, commission_type, commission_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, email, role, commission_type, commission_value`,
        [req.user.tenant_id, email, hashedPassword, name, role, specialties, photo_url, bio, commission_type || 'none', commission_value !== undefined ? parseFloat(commission_value) : 0]
      );

      const tenant = await queryOne('SELECT id, business_name FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (tenant) {
        sendStaffCredentials({ name, email }, tempPassword, tenant).catch(e => logger.error('Error enviando credenciales', { error: e.message }));
      }

      res.status(201).json({
        message: 'Peluquero creado. Compartí la contraseña temporal con el usuario de forma segura.',
        staff: result.rows[0],
        tempPassword,
      });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al crear peluquero' });
    }
  });

  const updateStaffValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  ];

  router.put('/tenant/staff/:id', authenticateStaff, checkTenantActive, updateStaffValidation, validate, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, specialties, photo_url, bio, individual_hours, active, commission_type, commission_value } = req.body;

      if (email) {
        const existing = await queryOne(
          'SELECT id FROM staff WHERE email = $1 AND id != $2',
          [email, id]
        );
        if (existing) return res.status(400).json({ error: 'Email ya registrado en otra cuenta' });
      }

      const result = await query(
        `UPDATE staff SET
           name = COALESCE($1, name),
           email = COALESCE($2, email),
           specialties = COALESCE($3::TEXT[], specialties),
           photo_url = COALESCE($4, photo_url),
           bio = COALESCE($5, bio),
           individual_hours = COALESCE($6::JSONB, individual_hours),
           active = COALESCE($7::BOOLEAN, active),
           commission_type = COALESCE($10, commission_type),
           commission_value = COALESCE($11, commission_value)
         WHERE id = $8 AND tenant_id = $9 RETURNING *`,
        [name, email, specialties, photo_url, bio, individual_hours ? JSON.stringify(individual_hours) : null, active, id, req.user.tenant_id, commission_type, commission_value !== undefined ? parseFloat(commission_value) : null]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquero no encontrado' });

      res.json({ message: 'Peluquero actualizado', staff: result.rows[0] });
    } catch (err: any) {
      logger.error(err);
      if (err.code === '23505') return res.status(400).json({ error: 'Email ya registrado en otra cuenta' });
      res.status(500).json({ error: 'Error al actualizar peluquero' });
    }
  });

  router.delete('/tenant/staff/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(
        'DELETE FROM staff WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Peluquero no encontrado' });
      res.json({ message: 'Peluquero eliminado' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al eliminar peluquero' });
    }
  });

  // ========== SERVICES ==========

  router.get('/tenant/services', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        'SELECT id, name, duration, price, category, active, image FROM services WHERE tenant_id = $1 ORDER BY category, name',
        [req.user.tenant_id]
      );
      res.json({ services: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar servicios' });
    }
  });

  const createServiceValidation = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nombre requerido').escape(),
    body('duration').isInt({ min: 1 }).withMessage('Duración debe ser un número positivo'),
    body('price').isFloat({ min: 0 }).withMessage('Precio debe ser un número válido'),
  ];

  router.post('/tenant/services', authenticateStaff, checkTenantActive, createServiceValidation, validate, async (req, res) => {
    try {
      const { name, duration, price, category, image } = req.body;
      const existing = await queryOne(
        'SELECT id FROM services WHERE LOWER(name) = LOWER($1) AND tenant_id = $2',
        [name, req.user.tenant_id]
      );
      if (existing) return res.status(409).json({ error: 'Ya existe un servicio con ese nombre' });
      const result = await query(
        `INSERT INTO services (tenant_id, name, duration, price, category, active, image)
         VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id, name, duration, price, category, active, image`,
        [req.user.tenant_id, name, parseInt(duration, 10), parseFloat(price), category?.trim() || '', image || null]
      );
      res.status(201).json({ message: 'Servicio creado', service: result.rows[0] });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al crear servicio' });
    }
  });

  const updateServiceValidation = [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).escape(),
    body('duration').optional().isInt({ min: 1 }),
    body('price').optional().isFloat({ min: 0 }),
  ];

  router.put('/tenant/services/:id', authenticateStaff, checkTenantActive, updateServiceValidation, validate, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, duration, price, category, active, image } = req.body;
      if (name) {
        const existing = await queryOne(
          'SELECT id FROM services WHERE LOWER(name) = LOWER($1) AND tenant_id = $2 AND id != $3',
          [name, req.user.tenant_id, id]
        );
        if (existing) return res.status(409).json({ error: 'Ya existe otro servicio con ese nombre' });
      }
      const result = await query(
        `UPDATE services SET
           name = COALESCE($1, name),
           duration = COALESCE($2::INTEGER, duration),
           price = COALESCE($3::NUMERIC, price),
           category = COALESCE($4, category),
           active = COALESCE($5::BOOLEAN, active),
           image = COALESCE($6, image)
         WHERE id = $7 AND tenant_id = $8 RETURNING id, name, duration, price, category, active, image`,
         [name, duration ? parseInt(duration, 10) : null, price !== undefined ? parseFloat(price) : null, category !== undefined ? category : null, active, image !== undefined ? image : null, id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
      res.json({ message: 'Servicio actualizado', service: result.rows[0] });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al actualizar servicio' });
    }
  });

  router.delete('/tenant/services/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(
        'DELETE FROM services WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
      res.json({ message: 'Servicio eliminado' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al eliminar servicio' });
    }
  });

  // ========== CLIENTS ==========

  router.get('/tenant/clients', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { q } = req.query;
      let sql = `SELECT client_name, client_phone, client_email,
                  COUNT(*) as total_appointments,
                  MAX(appointment_date) as last_appointment,
                  MIN(appointment_date) as first_appointment
                FROM appointments
                WHERE tenant_id = $1`;
      const params = [req.user.tenant_id];
      if (q && typeof q === 'string' && q.trim()) {
        sql += ` AND (client_name ILIKE $${params.length + 1} OR client_phone ILIKE $${params.length + 1} OR client_email ILIKE $${params.length + 1})`;
        params.push(`%${q.trim()}%`);
      }
      sql += ' GROUP BY client_name, client_phone, client_email ORDER BY last_appointment DESC';
      const result = await query(sql, params);
      res.json({ clients: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar clientes' });
    }
  });

  router.get('/tenant/clients/:phone/appointments', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { phone } = req.params;
      const result = await query(
        `SELECT a.*, s.name as staff_name
         FROM appointments a
         LEFT JOIN staff s ON a.staff_id = s.id
         WHERE a.tenant_id = $1 AND a.client_phone = $2
         ORDER BY a.appointment_date DESC`,
        [req.user.tenant_id, phone]
      );
      res.json({ appointments: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar historial' });
    }
  });

  // ===== BLOCKED DATES =====
  router.get('/tenant/blocked-dates', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        'SELECT id, date, reason FROM blocked_dates WHERE tenant_id = $1 ORDER BY date DESC',
        [req.user.tenant_id]
      );
      res.json({ blockedDates: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar días bloqueados' });
    }
  });

  router.post('/tenant/blocked-dates', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { date, reason } = req.body;
      if (!date) return res.status(400).json({ error: 'La fecha es requerida' });
      await query(
        'INSERT INTO blocked_dates (tenant_id, date, reason) VALUES ($1, $2, $3) ON CONFLICT (tenant_id, date) DO NOTHING',
        [req.user.tenant_id, date, reason || '']
      );
      res.json({ message: 'Fecha bloqueada' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al bloquear fecha' });
    }
  });

  router.delete('/tenant/blocked-dates/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      await query('DELETE FROM blocked_dates WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenant_id]);
      res.json({ message: 'Fecha desbloqueada' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al desbloquear fecha' });
    }
  });

  // ========== ANALYTICS / STATS ==========

  router.get('/tenant/stats/summary', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const tenantId = req.user.tenant_id;
      const today = await queryOne(
        `SELECT COUNT(*) as total FROM appointments WHERE tenant_id = $1 AND appointment_date::date = CURRENT_DATE`,
        [tenantId]
      );
      const month = await queryOne(
        `SELECT COUNT(*) as total, COALESCE(SUM(a.service_price), 0) as revenue
         FROM appointments a
         WHERE a.tenant_id = $1 AND date_trunc('month', a.appointment_date) = date_trunc('month', CURRENT_DATE)`,
        [tenantId]
      );
      const pending = await queryOne(
        `SELECT COUNT(*) as total FROM appointments WHERE tenant_id = $1 AND status = 'pending'`,
        [tenantId]
      );
      const completed = await queryOne(
        `SELECT COUNT(*) as total FROM appointments WHERE tenant_id = $1 AND status = 'completed'`,
        [tenantId]
      );
      const cancelled = await queryOne(
        `SELECT COUNT(*) as total FROM appointments WHERE tenant_id = $1 AND status = 'cancelled'`,
        [tenantId]
      );
      const total = await queryOne(
        `SELECT COUNT(*) as total FROM appointments WHERE tenant_id = $1`,
        [tenantId]
      );

      res.json({
        todayAppointments: parseInt(today?.total || '0'),
        monthAppointments: parseInt(month?.total || '0'),
        monthRevenue: parseFloat(month?.revenue || '0'),
        pendingAppointments: parseInt(pending?.total || '0'),
        completedAppointments: parseInt(completed?.total || '0'),
        cancellationRate: parseInt(total?.total || '0') > 0
          ? Math.round((parseInt(cancelled?.total || '0') / parseInt(total?.total || '0')) * 100)
          : 0,
      });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al obtener resumen' });
    }
  });

  router.get('/tenant/stats/revenue-by-month', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        `SELECT
           to_char(date_trunc('month', a.appointment_date), 'YYYY-MM') as month,
           COUNT(*) as appointments,
           COALESCE(SUM(a.service_price), 0) as revenue
         FROM appointments a
         WHERE a.tenant_id = $1 AND a.appointment_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
         GROUP BY date_trunc('month', a.appointment_date)
         ORDER BY month ASC`,
        [req.user.tenant_id]
      );
      res.json({ months: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al obtener ingresos' });
    }
  });

  router.get('/tenant/stats/revenue-by-staff', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        `SELECT
           s.id,
           s.name,
           COUNT(a.id) as appointments,
           COALESCE(SUM(a.service_price), 0) as revenue
         FROM staff s
         LEFT JOIN appointments a ON a.staff_id = s.id AND a.tenant_id = s.tenant_id AND a.status != 'cancelled'
         WHERE s.tenant_id = $1
         GROUP BY s.id, s.name
         ORDER BY revenue DESC`,
        [req.user.tenant_id]
      );
      res.json({ staff: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al obtener ingresos por peluquero' });
    }
  });

  router.get('/tenant/stats/top-services', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        `SELECT
           a.service,
           COUNT(*) as count,
           COALESCE(AVG(a.service_price), 0) as avg_price
         FROM appointments a
         WHERE a.tenant_id = $1 AND a.status != 'cancelled'
         GROUP BY a.service
         ORDER BY count DESC
         LIMIT 10`,
        [req.user.tenant_id]
      );
      res.json({ services: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al obtener servicios' });
    }
  });

  // ===== COUPONS =====
  router.get('/tenant/coupons', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        'SELECT * FROM coupons WHERE tenant_id = $1 ORDER BY created_at DESC',
        [req.user.tenant_id]
      );
      res.json({ coupons: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar cupones' });
    }
  });

  const createCouponValidation = [
    body('code').trim().isLength({ min: 1, max: 50 }).withMessage('Código inválido').escape(),
    body('discount_type').isIn(['percentage', 'fixed']).withMessage('Tipo de descuento inválido'),
    body('discount_value').isFloat({ min: 0 }).withMessage('Valor de descuento inválido'),
  ];

  router.post('/tenant/coupons', authenticateStaff, checkTenantActive, createCouponValidation, validate, async (req, res) => {
    try {
      const { code, discount_type, discount_value, min_appointment_amount, max_uses, expires_at } = req.body;
      const exists = await queryOne(
        'SELECT id FROM coupons WHERE code = $1 AND tenant_id = $2',
        [code.toUpperCase(), req.user.tenant_id]
      );
      if (exists) return res.status(400).json({ error: 'Código ya existe' });
      const result = await query(
        `INSERT INTO coupons (tenant_id, code, discount_type, discount_value, min_appointment_amount, max_uses, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.tenant_id, code.toUpperCase(), discount_type, parseFloat(discount_value), min_appointment_amount ? parseFloat(min_appointment_amount) : 0, max_uses || null, expires_at || null]
      );
      res.status(201).json({ coupon: result.rows[0] });
    } catch (err: any) {
      logger.error(err);
      if (err.code === '23505') return res.status(400).json({ error: 'Código ya existe' });
      res.status(500).json({ error: 'Error al crear cupón' });
    }
  });

  router.put('/tenant/coupons/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { id } = req.params;
      const { code, discount_type, discount_value, min_appointment_amount, max_uses, expires_at, active } = req.body;
      const result = await query(
        `UPDATE coupons SET
           code = COALESCE($1, code),
           discount_type = COALESCE($2, discount_type),
           discount_value = COALESCE($3, discount_value),
           min_appointment_amount = COALESCE($4, min_appointment_amount),
           max_uses = $5,
           expires_at = $6,
           active = COALESCE($7, active)
         WHERE id = $8 AND tenant_id = $9 RETURNING *`,
        [code ? code.toUpperCase() : null, discount_type, discount_value !== undefined ? parseFloat(discount_value) : null, min_appointment_amount !== undefined ? parseFloat(min_appointment_amount) : null, max_uses !== undefined ? max_uses : null, expires_at || null, active, id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Cupón no encontrado' });
      res.json({ coupon: result.rows[0] });
    } catch (err: any) {
      logger.error(err);
      if (err.code === '23505') return res.status(400).json({ error: 'Código ya existe' });
      res.status(500).json({ error: 'Error al actualizar cupón' });
    }
  });

  router.delete('/tenant/coupons/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query('DELETE FROM coupons WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, req.user.tenant_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Cupón no encontrado' });
      res.json({ message: 'Cupón eliminado' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al eliminar cupón' });
    }
  });

  // ===== PUBLIC COUPON VALIDATION =====
  router.post('/tenant/validate-coupon', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const { code } = req.body;
      const coupon = await queryOne(
        `SELECT * FROM coupons WHERE code = $1 AND tenant_id = $2 AND active = true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR current_uses < max_uses)`,
        [code.toUpperCase(), req.user.tenant_id]
      );
      if (!coupon) return res.status(404).json({ error: 'Cupón inválido o vencido' });
      res.json({ valid: true, coupon });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al validar cupón' });
    }
  });

  // ========== WAITLIST (staff) ==========
  router.get('/tenant/waitlist', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        `SELECT w.*, s.name as service_name, st.name as staff_name
         FROM waitlist w
         LEFT JOIN services s ON w.service_id = s.id
         LEFT JOIN staff st ON w.staff_id = st.id
         WHERE w.tenant_id = $1
         ORDER BY w.created_at DESC`,
        [req.user.tenant_id]
      );
      res.json({ entries: result.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar lista de espera' });
    }
  });

  router.put('/tenant/waitlist/:id/notify', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        `UPDATE waitlist SET status = 'notified', notified_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'waiting' RETURNING id`,
        [req.params.id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ message: 'Marcado como notificado' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al actualizar' });
    }
  });

  router.delete('/tenant/waitlist/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        'DELETE FROM waitlist WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [req.params.id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ message: 'Eliminado de la lista de espera' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });

  // ========== PRODUCTOS / INVENTARIO ==========

  const productValidation = [
    body('name').trim().isLength({ min: 1, max: 200 }).escape(),
    body('price').isFloat({ min: 0 }),
    body('cost').optional({ values: 'falsy' }).isFloat({ min: 0 }),
    body('stock').optional({ values: 'falsy' }).isInt({ min: 0 }),
    body('min_stock').optional({ values: 'falsy' }).isInt({ min: 0 }),
    body('category').optional().trim().escape(),
    body('sku').optional().trim().escape(),
    body('description').optional().trim().escape(),
  ];

  router.get('/tenant/products', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        'SELECT id, name, description, price, cost, stock, min_stock, category, sku, image_url, active, created_at FROM products WHERE tenant_id = $1 ORDER BY name',
        [req.user.tenant_id]
      );
      res.json({ products: result.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar productos' }); }
  });

  router.post('/tenant/products', authenticateStaff, checkTenantActive, productValidation, validate, async (req, res) => {
    try {
      const { name, description, price, cost, stock, min_stock, category, sku, image_url } = req.body;
      const result = await query(
        `INSERT INTO products (tenant_id, name, description, price, cost, stock, min_stock, category, sku, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [req.user.tenant_id, name, description || '', parseFloat(price), cost ? parseFloat(cost) : 0, stock !== undefined ? parseInt(stock, 10) : 0, min_stock ? parseInt(min_stock, 10) : 0, category || '', sku || '', image_url || '']
      );
      res.status(201).json({ message: 'Producto creado', product: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al crear producto' }); }
  });

  router.put('/tenant/products/:id', authenticateStaff, checkTenantActive, productValidation, validate, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, cost, stock, min_stock, category, sku, image_url, active } = req.body;
      const result = await query(
        `UPDATE products SET
           name = COALESCE($1, name), description = COALESCE($2, description),
           price = COALESCE($3::NUMERIC, price), cost = COALESCE($4::NUMERIC, cost),
           stock = COALESCE($5::INTEGER, stock), min_stock = COALESCE($6::INTEGER, min_stock),
           category = COALESCE($7, category), sku = COALESCE($8, sku),
           image_url = COALESCE($9, image_url), active = COALESCE($10::BOOLEAN, active),
           updated_at = NOW()
         WHERE id = $11 AND tenant_id = $12 RETURNING *`,
        [name, description, price !== undefined ? parseFloat(price) : null, cost !== undefined ? parseFloat(cost) : null, stock !== undefined ? parseInt(stock, 10) : null, min_stock !== undefined ? parseInt(min_stock, 10) : null, category, sku, image_url, active, id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json({ message: 'Producto actualizado', product: result.rows[0] });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al actualizar producto' }); }
  });

  router.delete('/tenant/products/:id', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query('DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.id, req.user.tenant_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json({ message: 'Producto eliminado' });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al eliminar producto' }); }
  });

  // ========== VENTAS (POS) ==========

  const saleValidation = [
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
    body('items.*.product_id').isInt(),
    body('items.*.name').trim().notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.unit_price').isFloat({ min: 0 }),
    body('items.*.total').isFloat({ min: 0 }),
    body('total').isFloat({ min: 0 }),
    body('payment_method').optional().isIn(['cash', 'card', 'mp']),
    body('client_name').optional().trim().escape(),
    body('client_phone').optional().trim().escape(),
  ];

  router.get('/tenant/sales', authenticateStaff, checkTenantActive, async (req, res) => {
    try {
      const result = await query(
        'SELECT id, items, total, payment_method, client_name, client_phone, notes, created_at FROM sales WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100',
        [req.user.tenant_id]
      );
      res.json({ sales: result.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar ventas' }); }
  });

  router.post('/tenant/sales', authenticateStaff, checkTenantActive, saleValidation, validate, async (req, res) => {
    try {
      const { items, total, payment_method, client_name, client_phone, notes } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const item of items) {
          if (!item.product_id) continue;

          const product = await client.query(
            'SELECT stock FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
            [item.product_id, req.user.tenant_id]
          );
          if (product.rows.length === 0) {
            throw new AppError(`Producto ID ${item.product_id} no encontrado`, 404);
          }
          const currentStock = parseInt(product.rows[0].stock, 10);
          if (currentStock < item.quantity) {
            throw new AppError(
              `Stock insuficiente para "${item.name || 'producto'}": disponible ${currentStock}, requerido ${item.quantity}`,
              400
            );
          }

          await client.query(
            'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }

        const result = await client.query(
          `INSERT INTO sales (tenant_id, items, total, payment_method, client_name, client_phone, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [req.user.tenant_id, JSON.stringify(items), parseFloat(total), payment_method || 'cash', client_name || '', client_phone || '', notes || '']
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Venta registrada', sale: result.rows[0] });
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (err instanceof AppError) {
        return res.status(err.statusCode || 400).json({ error: err.message });
      }
      logger.error(err);
      res.status(500).json({ error: 'Error al registrar venta' });
    }
  });

  return router;
}
