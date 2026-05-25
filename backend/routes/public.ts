
import { Router } from 'express';
import { body } from 'express-validator';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { sendClientConfirmation, notifyStaff } from '../services/notifications';
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
export default function(generateAvailableSlots, appointmentLimiter) {
  const router = Router();

  router.get('/:slug/config', identifyTenant, (req, res) => {
    res.json({
      tenant: {
        slug: req.tenant.slug,
        business_name: req.tenant.business_name,
        brand_primary_color: req.tenant.brand_primary_color,
        brand_secondary_color: req.tenant.brand_secondary_color,
        brand_logo_url: req.tenant.brand_logo_url,
        business_phone: req.tenant.business_phone,
      },
    });
  });

  router.get('/:slug/services', identifyTenant, async (req, res) => {
    try {
      const services = await query(
        'SELECT id, name, duration, price, image FROM services WHERE tenant_id = $1 AND active = true ORDER BY name',
        [req.tenant.id]
      );
      res.json({ tenant: req.tenant, services: services.rows });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al cargar servicios' });
    }
  });

  router.get('/:slug/availability', identifyTenant, async (req, res) => {
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

      const rawSlots = generateAvailableSlots(date, service.duration, existing.rows, hoursConfig);
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

  router.post('/:slug/appointments', appointmentLimiter, identifyTenant, [
    body('clientName').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres').escape(),
    body('clientPhone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido').escape(),
    body('clientEmail').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('serviceId').isInt({ min: 1 }).withMessage('serviceId inválido'),
    body('appointmentDate').isISO8601().withMessage('Fecha inválida'),
  ], validate, async (req, res) => {
    try {
      if (req.tenant.plan === 'free' && req.tenant.trial_end_date && new Date() > new Date(req.tenant.trial_end_date)) {
        return res.status(403).json({ error: 'El período de prueba ha finalizado. No se pueden reservar nuevos turnos.' });
      }
      if (!(await checkPlanLimits(req.tenant.id, 'appointments'))) {
        return res.status(403).json({ error: 'Límite de plan alcanzado. Contactá al administrador.' });
      }

      const { clientName, clientPhone, clientEmail, serviceId, staffId, appointmentDate, notes } = req.body;
      if (!clientName || !clientPhone || !serviceId || !appointmentDate) {
        return res.status(400).json({ error: 'Datos obligatorios faltantes' });
      }
      const service = await queryOne(
        'SELECT * FROM services WHERE id = $1 AND tenant_id = $2 AND active = true',
        [serviceId, req.tenant.id]
      );
      if (!service) return res.status(404).json({ error: 'Servicio no disponible' });

      try {
        const result = await query(
          `INSERT INTO appointments (tenant_id, client_name, client_phone, client_email, service, service_duration, appointment_date, notes, staff_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [req.tenant.id, clientName.trim(), clientPhone.trim(), clientEmail?.trim() || null, service.name, service.duration, appointmentDate, notes?.trim() || null, staffId || null]
        );
        const newAppointment = result.rows[0];

        if (staffId) {
          const staffMember = await queryOne('SELECT name FROM staff WHERE id = $1', [staffId]);
          if (staffMember) newAppointment.staff_name = staffMember.name;
        }

        sendClientConfirmation(newAppointment, req.tenant).catch(e => logger.error('Error notificacion cliente', { error: e.message }));
        notifyStaff(newAppointment, req.tenant).catch(e => logger.error('Error notificacion staff', { error: e.message }));
        res.status(201).json({ message: 'Turno reservado', appointment: newAppointment });
      } catch (dbErr: any) {
        if (dbErr.code === '23505') return res.status(409).json({ error: 'Horario ya reservado' });
        throw dbErr;
      }
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ error: 'Error al reservar turno' });
    }
  });

  // GET: Listar peluqueros de una peluquería (público, para landing)
  router.get('/:slug/staff', identifyTenant, async (req, res) => {
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
  router.get('/:slug/staff/:staffId/availability', identifyTenant, async (req, res) => {
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

      const rawSlots = generateAvailableSlots(date, service.duration, existing.rows, hoursConfig);
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

  // GET landing config
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
  router.put('/:slug/landing', identifyTenant, authenticateStaff, checkTenantActive, checkTrialExpiration, async (req, res) => {
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

  return router;
};
