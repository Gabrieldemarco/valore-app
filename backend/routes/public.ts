
import { Router } from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import NodeCache from 'memory-cache';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { sendClientConfirmation, notifyStaff } from '../services/notifications';
import { createPreference as mpCreatePreference, isConfigured as mpConfigured } from '../services/mercadopago-client';
import { MP_CURRENCY } from '../services/payment-config';
import { validate,
  authenticateStaff,
  identifyTenant,
  checkTenantActive,
  checkTrialExpiration,
  checkPlanLimits, } from '../middleware';

/**
 * @param {(date: string, duration: number, appointments: Array<{appointment_date: string, service_duration: number}>, tenantConfig?: {startHour?: number, endHour?: number, workDays?: number[]}) => string[]} generateAvailableSlots
 * @param {import('express').RequestHandler} appointmentLimiter
 * @returns {import('express').Router}
 */
export default function(generateAvailableSlots, appointmentLimiter, publicLimiter) {
  const router = Router();
  router.use('/', publicLimiter);

  // --- Helper functions for booking ---
  async function validateBookingRequest(req, res, tenant) {
    if (new Date(req.body.appointmentDate) <= new Date()) {
      res.status(400).json({ error: 'La fecha del turno debe ser futura' });
      return null;
    }
    if (tenant.plan === 'free' && tenant.trial_end_date && new Date() > new Date(tenant.trial_end_date)) {
      res.status(403).json({ error: 'El período de prueba ha finalizado. No se pueden reservar nuevos turnos.' });
      return null;
    }
    if (!(await checkPlanLimits(tenant.id, 'appointments'))) {
      res.status(403).json({ error: 'Límite de plan alcanzado. Contactá al administrador.' });
      return null;
    }
    const { clientName, clientPhone, clientEmail, serviceId, staffId, appointmentDate, notes, recurring } = req.body;
    if (!clientName || !clientPhone || !serviceId || !appointmentDate) {
      res.status(400).json({ error: 'Datos obligatorios faltantes' });
      return null;
    }
    return { clientName, clientPhone, clientEmail, serviceId, staffId, appointmentDate, notes, recurring };
  }

  async function resolveServiceAndStaff(serviceId, staffId, tenantId, res) {
    const service = await queryOne(
      'SELECT * FROM services WHERE id = $1 AND tenant_id = $2 AND active = true',
      [serviceId, tenantId]
    );
    if (!service) {
      res.status(404).json({ error: 'Servicio no disponible' });
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

  function buildAppointmentDates(appointmentDate, recurring, service) {
    const clientToken = crypto.randomUUID();
    const appointmentStatus = service.deposit_amount > 0 ? 'pending' : 'confirmed';
    const recurringGroup = crypto.randomUUID();
    const appointmentDates: { date: string; token: string }[] = [{ date: appointmentDate, token: clientToken }];
    if (recurring && recurring.frequency && recurring.count > 1) {
      const frequencies: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };
      const interval = frequencies[recurring.frequency] || 7;
      for (let i = 1; i < Math.min(recurring.count, 12); i++) {
        const nextDate = new Date(appointmentDate);
        nextDate.setDate(nextDate.getDate() + interval * i);
        if (nextDate <= new Date()) continue;
        appointmentDates.push({ date: nextDate.toISOString(), token: crypto.randomUUID() });
      }
    }
    return { clientToken, appointmentStatus, recurringGroup, appointmentDates };
  }

  function buildRecurringInfo(recurring, count) {
    return recurring && recurring.count > 1
      ? { recurring: true, recurring_frequency: recurring.frequency, recurring_count: count }
      : {};
  }

  async function handleDepositCheckout(service, appointment, req, tenant) {
    if (!(service.deposit_amount > 0 && mpConfigured())) return null;
    try {
      const origin = (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const successUrl = `${origin}/p/${tenant.slug}/manage/${appointment.client_token}?deposit=ok`;
      const failureUrl = `${origin}/p/${tenant.slug}/manage/${appointment.client_token}?deposit=fail`;
      const preference = await mpCreatePreference({
        items: [{
          title: `Seña ${service.name} - ${tenant.business_name}`,
          quantity: 1,
          currency_id: MP_CURRENCY,
          unit_price: parseFloat(service.deposit_amount),
        }],
        external_reference: `appointment:${appointment.id}`,
        back_urls: { success: successUrl, failure: failureUrl, pending: successUrl },
        notification_url: `${origin}/api/payments/mercadopago/webhook`,
        auto_return: 'approved',
      });
      const checkoutUrl = preference.init_point || preference.sandbox_init_point;
      await query('UPDATE appointments SET deposit_preference_id = $1 WHERE id = $2', [preference.id, appointment.id]);
      await query(
        `INSERT INTO payments (tenant_id, amount, currency, method, status, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenant.id, service.deposit_amount, MP_CURRENCY, 'mercadopago', 'pending', JSON.stringify(preference)]
      );
      return checkoutUrl;
    } catch (mpErr: any) {
      logger.error('Error creando preferencia de seña', { error: mpErr.message });
      return null;
    }
  }

  function sendNotifications(appointment, tenant, status) {
    if (status === 'confirmed') {
      sendClientConfirmation(appointment, tenant).catch(e => logger.error('Error notificacion cliente', { error: e.message }));
      notifyStaff(appointment, tenant).catch(e => logger.error('Error notificacion staff', { error: e.message }));
    }
  }

  const requireActivePublicTenant = (req, res, next) => {
    if (!req.tenant) return res.status(404).json({ error: 'Peluquería no encontrada' });
    if (req.tenant.status !== 'active') return res.status(403).json({ error: 'Peluquería no disponible' });
    if (!req.tenant.landing_enabled) return res.status(404).json({ error: 'Peluquería no encontrada' });
    next();
  };

  router.get('/:slug/config', identifyTenant, requireActivePublicTenant, (req, res) => {
    const cacheKey = `config:${req.params.slug}`;
    const cached = NodeCache.get(cacheKey);
    if (cached) return res.json(cached);
    const body = {
      tenant: {
        slug: req.tenant.slug,
        business_name: req.tenant.business_name,
        brand_primary_color: req.tenant.brand_primary_color,
        brand_secondary_color: req.tenant.brand_secondary_color,
        brand_logo_url: req.tenant.brand_logo_url,
        business_phone: req.tenant.business_phone,
      },
    };
    NodeCache.put(cacheKey, body, 120000);
    res.json(body);
  });

  router.get('/:slug/services', identifyTenant, requireActivePublicTenant, async (req, res) => {
    const cacheKey = `services:${req.params.slug}`;
    const cached = NodeCache.get(cacheKey);
    if (cached) return res.json(cached);
    try {
      const services = await query(
        'SELECT id, name, duration, price, image FROM services WHERE tenant_id = $1 AND active = true ORDER BY name',
        [req.tenant.id]
      );
      const body = { tenant: req.tenant, services: services.rows };
      NodeCache.put(cacheKey, body, 60000);
      res.json(body);
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar servicios' });
    }
  });

  router.get('/:slug/availability', identifyTenant, requireActivePublicTenant, async (req, res) => {
    try {
      const { date, serviceId } = req.query;
      if (!date || !serviceId) return res.status(400).json({ error: 'Fecha y serviceId requeridos' });
      const service = await queryOne(
        'SELECT * FROM services WHERE id = $1 AND tenant_id = $2 AND active = true',
        [serviceId, req.tenant.id]
      );
      if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
      const existing = await query(
        `SELECT appointment_date, service_duration FROM appointments WHERE tenant_id = $1 AND appointment_date::date = $2 AND status != 'cancelled'`,
        [req.tenant.id, date]
      );

      let hoursConfig = null;
      if (req.tenant.opening_hours) {
        try {
          hoursConfig = typeof req.tenant.opening_hours === 'string'
            ? JSON.parse(req.tenant.opening_hours)
            : req.tenant.opening_hours;
        } catch (e: any) {
          logger.error('Error parsing hours', { error: e.message });
        }
      }

      const blockedDates = await query('SELECT date FROM blocked_dates WHERE tenant_id = $1', [req.tenant.id]);

      const rawSlots = generateAvailableSlots(date, service.duration, existing.rows, hoursConfig, blockedDates.rows);
      const slots = rawSlots.map((iso: string) => {
        const d = new Date(iso);
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return { time, available: true };
      });
      res.json({ slots });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al verificar disponibilidad' });
    }
  });

  /**
   * Crea uno o más turnos (booking público):
   * - Si el servicio tiene deposit_amount > 0, el turno nace como "pending"
   * - Si se envía recurring.frequency, genera hasta 12 turnos recurrentes
   * - Retorna management_link para autogestión y checkout_url si requiere seña
   */
  router.post('/:slug/appointments', appointmentLimiter, identifyTenant, requireActivePublicTenant, [
    body('clientName').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres').escape(),
    body('clientPhone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido').escape(),
    body('clientEmail').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('serviceId').isInt({ min: 1 }).withMessage('serviceId inválido'),
    body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
  ], validate, async (req, res) => {
    try {
      const validated = await validateBookingRequest(req, res, req.tenant);
      if (!validated) return;
      const { clientName, clientPhone, clientEmail, serviceId, staffId, appointmentDate, notes, recurring } = validated;

      const resolved = await resolveServiceAndStaff(serviceId, staffId, req.tenant.id, res);
      if (!resolved) return;
      const { service, validStaffId } = resolved;

      const { clientToken, appointmentStatus, recurringGroup, appointmentDates } = buildAppointmentDates(appointmentDate, recurring, service);

      const newAppointments: any[] = [];

      try {
        for (let i = 0; i < appointmentDates.length; i++) {
          const ad = appointmentDates[i];
          const isFirst = i === 0;
          const result = await query(
            `INSERT INTO appointments (tenant_id, client_name, client_phone, client_email, service, service_duration, appointment_date, notes, staff_id, client_token, status, deposit_amount, recurring_group, recurring_rule)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [req.tenant.id, clientName.trim(), clientPhone.trim(), clientEmail?.trim() || null, service.name, service.duration, ad.date, notes?.trim() || null, validStaffId, ad.token, isFirst ? appointmentStatus : 'confirmed', isFirst ? service.deposit_amount || null : null, recurringGroup, isFirst && recurring ? JSON.stringify(recurring) : null]
          );
          const appt = result.rows[0];
          if (validStaffId) {
            const staffMember = await queryOne('SELECT name, email FROM staff WHERE id = $1', [validStaffId]);
            if (staffMember) {
              appt.staff_name = staffMember.name;
              appt.staff_email = staffMember.email;
            }
          }
          newAppointments.push(appt);
        }
      } catch (dbErr: any) {
        if (dbErr.code === '23505') return res.status(409).json({ error: 'Horario ya reservado' });
        throw dbErr;
      }

      const newAppointment = newAppointments[0];
      newAppointment.recurring_count = newAppointments.length;
      newAppointment.management_link = `${req.protocol}://${req.get('host')}/p/${req.tenant.slug}/manage/${clientToken}`;

      const depositCheckoutUrl = await handleDepositCheckout(service, newAppointment, req, req.tenant);

      sendNotifications(newAppointment, req.tenant, appointmentStatus);

      const recurringInfo = buildRecurringInfo(recurring, newAppointments.length);

      res.status(201).json({
        message: service.deposit_amount > 0 ? 'Turno creado. Se requiere seña para confirmar.' : newAppointments.length > 1 ? `${newAppointments.length} turnos creados` : 'Turno reservado',
        appointment: newAppointment,
        deposit_required: service.deposit_amount > 0,
        deposit_amount: service.deposit_amount || null,
        checkout_url: depositCheckoutUrl,
        ...recurringInfo,
      });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al reservar turno' });
    }
  });

  // GET: Listar peluqueros de una peluquería (público, para landing)
  router.get('/:slug/staff', identifyTenant, requireActivePublicTenant, async (req, res) => {
    try {
      const staff = await query(
        `SELECT id, name, photo_url, bio, specialties, individual_hours
         FROM staff
         WHERE tenant_id = $1 AND role IN ('staff', 'admin') AND active = true
         ORDER BY name`,
        [req.tenant.id]
      );

      const services = await query(
        'SELECT id, name, duration, price FROM services WHERE tenant_id = $1 AND active = true',
        [req.tenant.id]
      );

      const staffWithServices = staff.rows.map(s => ({
        ...s,
        available_services: services.rows.filter(serv =>
          !s.specialties?.length || s.specialties.map(sp => sp.toLowerCase()).includes(serv.name.toLowerCase())
        ),
      }));

      res.json({ staff: staffWithServices });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar peluqueros' });
    }
  });

  // GET: Disponibilidad específica de un peluquero
  router.get('/:slug/staff/:staffId/availability', identifyTenant, requireActivePublicTenant, async (req, res) => {
    try {
      const { staffId } = req.params;
      const { date, serviceId } = req.query;

      if (!date || !serviceId) return res.status(400).json({ error: 'Fecha y serviceId requeridos' });

      const staff = await queryOne(
        'SELECT id, individual_hours FROM staff WHERE id = $1 AND tenant_id = $2 AND active = true',
        [staffId, req.tenant.id]
      );
      if (!staff) return res.status(404).json({ error: 'Peluquero no encontrado' });

      const service = await queryOne(
        'SELECT duration FROM services WHERE id = $1 AND tenant_id = $2 AND active = true',
        [serviceId, req.tenant.id]
      );
      if (!service) return res.status(404).json({ error: 'Servicio no disponible' });

      let hoursConfig = (staff.individual_hours && typeof staff.individual_hours === 'object' && staff.individual_hours.startHour != null)
        ? staff.individual_hours
        : req.tenant.opening_hours;
      if (typeof hoursConfig === 'string') {
        try { hoursConfig = JSON.parse(hoursConfig); }
        catch (e: any) { hoursConfig = { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] }; }
      }

      const existing = await query(
        `SELECT appointment_date, service_duration
         FROM appointments
         WHERE staff_id = $1 AND appointment_date::date = $2 AND status != 'cancelled'`,
        [staffId, date]
      );

      const blockedDates = await query('SELECT date FROM blocked_dates WHERE tenant_id = $1', [req.tenant.id]);

      const rawSlots = generateAvailableSlots(date, service.duration, existing.rows, hoursConfig, blockedDates.rows);
      const slots = rawSlots.map((iso: string) => {
        const d = new Date(iso);
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return { time, available: true };
      });
      res.json({ slots });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al verificar disponibilidad' });
    }
  });

  // GET landing config (allow even when disabled, so it can be activated)
  router.get('/:slug/landing', identifyTenant, async (req, res) => {
    try {
      if (!req.tenant.landing_enabled) {
        await query(`UPDATE tenants SET landing_enabled=true, updated_at=NOW() WHERE id=$1`, [req.tenant.id]);
        req.tenant.landing_enabled = true;
      }
      const services = await query(
        `SELECT id,name,duration,price,image FROM services WHERE tenant_id=$1 AND active=true ORDER BY name`,
        [req.tenant.id]
      );
      res.json({
        tenant: {
          slug: req.tenant.slug,
          business_name: req.tenant.business_name,
          category: req.tenant.category,
          landing_description: req.tenant.landing_description,
          landing_hero_image: req.tenant.landing_hero_image,
          landing_gallery: req.tenant.landing_gallery,
          landing_team: req.tenant.landing_team,
          landing_social_links: req.tenant.landing_social_links,
          landing_custom_css: req.tenant.landing_custom_css,
          brand_primary_color: req.tenant.brand_primary_color,
          brand_secondary_color: req.tenant.brand_secondary_color,
          brand_logo_url: req.tenant.brand_logo_url,
          business_phone: req.tenant.business_phone,
          business_address: req.tenant.business_address,
          opening_hours: req.tenant.opening_hours,
          trial_end_date: req.tenant.trial_end_date,
          landing_layout: req.tenant.landing_layout,
        },
        services: services.rows,
      });
    } catch (err: any) {
      logger.error('Landing error:', err.message);
      res.status(500).json({ error: 'Error al cargar landing' });
    }
  });

  // PUT landing config
  router.put('/:slug/landing', identifyTenant, authenticateStaff, checkTenantActive, checkTrialExpiration, [
    body('landing_description').optional().trim().escape(),
    body('landing_custom_css').optional().trim(),
  ], validate, async (req, res) => {
    try {
      if (req.user.tenant_id !== req.tenant.id) return res.status(403).json({ error: 'Acceso denegado' });
      const {
        landing_description, landing_hero_image, landing_gallery, landing_services_info,
        landing_team, landing_social_links, landing_custom_css, landing_enabled, landing_layout,
      } = req.body;
      const result = await query(
        `UPDATE tenants SET landing_description=COALESCE($1,landing_description),landing_hero_image=COALESCE($2,landing_hero_image),landing_gallery=COALESCE($3::jsonb,landing_gallery),landing_services_info=COALESCE($4::jsonb,landing_services_info),landing_team=COALESCE($5::jsonb,landing_team),landing_social_links=COALESCE($6::jsonb,landing_social_links),landing_custom_css=COALESCE($7,landing_custom_css),landing_enabled=COALESCE($8::boolean,landing_enabled),landing_layout=COALESCE($9::jsonb,landing_layout),updated_at=NOW() WHERE id=$10 RETURNING *`,
        [
          landing_description,
          landing_hero_image,
          landing_gallery ? JSON.stringify(landing_gallery) : null,
          landing_services_info ? JSON.stringify(landing_services_info) : null,
          landing_team ? JSON.stringify(landing_team) : null,
          landing_social_links ? JSON.stringify(landing_social_links) : null,
          landing_custom_css,
          landing_enabled,
          landing_layout ? JSON.stringify(landing_layout) : null,
          req.tenant.id,
        ]
      );
      res.json({ message: 'Landing actualizada', tenant: result.rows[0] });
    } catch (err: any) {
      logger.error('Landing update error:', err.message);
      res.status(500).json({ error: 'Error al guardar landing' });
    }
  });

  // ========== CLIENT SELF-SERVICE (by token) ==========

  /**
   * Obtiene los datos de un turno mediante el token único enviado al cliente.
   * Incluye turnos del mismo recurring_group si existen.
   */
  router.get('/:slug/appointments/manage/:token', identifyTenant, async (req, res) => {
    try {
      const appointment = await queryOne(
        `SELECT a.*, s.name as staff_name
         FROM appointments a
         LEFT JOIN staff s ON a.staff_id = s.id
         WHERE a.client_token = $1 AND a.tenant_id = $2`,
        [req.params.token, req.tenant.id]
      );
      if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });

      let recurringAppointments: any[] = [];
      if (appointment.recurring_group) {
        const groupResult = await query(
          `SELECT id, appointment_date, status, client_token
           FROM appointments
           WHERE recurring_group = $1 AND tenant_id = $2
           ORDER BY appointment_date`,
          [appointment.recurring_group, req.tenant.id]
        );
        recurringAppointments = groupResult.rows;
      }

      res.json({ appointment, recurring_appointments: recurringAppointments });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al obtener turno' });
    }
  });

  /**
   * Cancela un turno mediante el token único del cliente.
   * No permite cancelar turnos ya cancelados, completados o no-show.
   */
  router.put('/:slug/appointments/manage/:token/cancel', identifyTenant, async (req, res) => {
    try {
      const appointment = await queryOne(
        'SELECT id, status FROM appointments WHERE client_token = $1 AND tenant_id = $2',
        [req.params.token, req.tenant.id]
      );
      if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
      if (['cancelled', 'completed', 'no-show'].includes(appointment.status)) {
        return res.status(400).json({ error: 'El turno ya fue cancelado o completado' });
      }
      await query(
        'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2',
        ['cancelled', appointment.id]
      );
      res.json({ message: 'Turno cancelado exitosamente' });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cancelar turno' });
    }
  });

  /**
   * Reprograma un turno mediante el token único del cliente.
   * Valida que la nueva fecha sea futura y que el turno no esté cancelado/completado.
   */
  router.put('/:slug/appointments/manage/:token/reschedule', identifyTenant, [
    body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
    body('staffId').optional({ values: 'null' }).isInt(),
  ], validate, async (req, res) => {
    try {
      const appointment = await queryOne(
        `SELECT a.*, s.name as staff_name
         FROM appointments a
         LEFT JOIN staff s ON a.staff_id = s.id
         WHERE a.client_token = $1 AND a.tenant_id = $2`,
        [req.params.token, req.tenant.id]
      );
      if (!appointment) return res.status(404).json({ error: 'Turno no encontrado' });
      if (['cancelled', 'completed', 'no-show'].includes(appointment.status)) {
        return res.status(400).json({ error: 'No se puede reprogramar un turno cancelado o completado' });
      }

      const newDate = new Date(req.body.appointmentDate);
      if (newDate <= new Date()) {
        return res.status(400).json({ error: 'La nueva fecha debe ser futura' });
      }

      const newStaffId = req.body.staffId != null ? parseInt(req.body.staffId) : appointment.staff_id;

      if (req.body.staffId != null) {
        const staffMember = await queryOne(
          'SELECT id FROM staff WHERE id = $1 AND tenant_id = $2 AND active = true',
          [newStaffId, req.tenant.id]
        );
        if (!staffMember) return res.status(400).json({ error: 'Peluquero no válido' });
      }

      const existing = await query(
        `SELECT appointment_date, service_duration FROM appointments
         WHERE tenant_id = $1 AND appointment_date::date = $2::date
         AND status != 'cancelled' AND id != $3
         ${newStaffId ? 'AND (staff_id = $4 OR staff_id IS NULL)' : ''}`,
        newStaffId
          ? [req.tenant.id, newDate.toISOString(), appointment.id, newStaffId]
          : [req.tenant.id, newDate.toISOString(), appointment.id]
      );

      const { generateAvailableSlots } = await import('../services/slots');
      let hoursConfig = null;
      if (newStaffId) {
        const staff = await queryOne('SELECT individual_hours FROM staff WHERE id = $1', [newStaffId]);
        hoursConfig = staff?.individual_hours;
      }
      if (!hoursConfig && req.tenant.opening_hours) {
        try {
          hoursConfig = typeof req.tenant.opening_hours === 'string'
            ? JSON.parse(req.tenant.opening_hours)
            : req.tenant.opening_hours;
        } catch { /* ignore */ }
      }

      const dateStr = newDate.toISOString().split('T')[0];
      const blockedDates = await query('SELECT date FROM blocked_dates WHERE tenant_id = $1', [req.tenant.id]);
      const rawSlots = generateAvailableSlots(dateStr, appointment.service_duration, existing.rows, hoursConfig, blockedDates.rows);
      const slotFound = rawSlots.some(s => Math.abs(new Date(s).getTime() - newDate.getTime()) < 60000);

      if (!slotFound) {
        return res.status(409).json({ error: 'El horario seleccionado no está disponible' });
      }

      await query(
        'UPDATE appointments SET appointment_date = $1, staff_id = $2, updated_at = NOW() WHERE id = $3',
        [newDate.toISOString(), newStaffId, appointment.id]
      );

      const updated = await queryOne(
        `SELECT a.*, s.name as staff_name
         FROM appointments a
         LEFT JOIN staff s ON a.staff_id = s.id
         WHERE a.id = $1`,
        [appointment.id]
      );

      res.json({ message: 'Turno reprogramado exitosamente', appointment: updated });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al reprogramar turno' });
    }
  });

  return router;
}
