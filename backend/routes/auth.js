// @ts-check
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const { query, queryOne } = require('../database');
const { validate } = require('../middleware');
const logger = require('../services/logger');
const createEmailTransporter = require('../services/email');

/**
 * @param {import('express').RequestHandler} loginLimiter
 * @param {import('express').RequestHandler} passwordResetLimiter
 * @returns {import('express').Router}
 */
module.exports = function (loginLimiter, passwordResetLimiter) {
  const router = Router();

  router.post('/register', loginLimiter, [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Usuario debe tener entre 3 y 50 caracteres').escape(),
    body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
  ], validate, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });
      if (password.length < 6) return res.status(400).json({ error: 'Contraseña muy corta' });
      const exists = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
      if (exists) return res.status(400).json({ error: 'Usuario ya existe' });
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role`,
        [username, hashedPassword, 'client']
      );
      res.status(201).json({ message: 'Usuario creado', user: result.rows[0] });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Error al registrar' });
    }
  });

  router.post('/login', loginLimiter, [
    body('username').trim().notEmpty().withMessage('Usuario requerido').escape(),
    body('password').notEmpty().withMessage('Contraseña requerida')
  ], validate, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
      const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
      if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: 'Contraseña incorrecta' });
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token, username: user.username, role: user.role });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Error de autenticación' });
    }
  });

  router.post('/staff/login', loginLimiter, [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('Contraseña requerida')
  ], validate, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });
      const staff = await queryOne('SELECT * FROM staff WHERE email = $1', [email]);
      if (!staff) return res.status(400).json({ error: 'Credenciales inválidas' });
      const valid = await bcrypt.compare(password, staff.password);
      if (!valid) return res.status(400).json({ error: 'Credenciales inválidas' });
      const token = jwt.sign(
        { id: staff.id, name: staff.name, email: staff.email, role: staff.role, tenant_id: staff.tenant_id },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.json({ token, name: staff.name, email: staff.email, role: staff.role });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: 'Error de autenticación' });
    }
  });

  router.post('/staff/register', loginLimiter, [
    body('businessName').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre del negocio debe tener entre 2 y 100 caracteres').escape(),
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
  ], validate, async (req, res) => {
    try {
      const { businessName, email, password, phone, address } = req.body;
      if (!businessName || !email || !password) return res.status(400).json({ error: 'Faltan datos obligatorios' });
      if (password.length < 6) return res.status(400).json({ error: 'Contraseña muy corta' });
      const existingStaff = await queryOne('SELECT id FROM staff WHERE email = $1', [email]);
      if (existingStaff) return res.status(400).json({ error: 'Email ya registrado' });

      let slug = businessName.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      slug = `${slug}-${uuidv4().slice(0, 6)}`;

      const hashedPassword = await bcrypt.hash(password, 10);

      const tenantResult = await query(
        `INSERT INTO tenants (slug, business_name, business_address, business_phone, notification_email, smtp_email, landing_enabled, status, opening_hours, plan, trial_start_date, trial_end_date) 
         VALUES ($1, $2, $3, $4, $5, $6, true, 'active', $7, $8, NOW(), NOW() + INTERVAL '15 days') RETURNING id`,
        [slug, businessName, address || '', phone || '', email, email, JSON.stringify({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] }), 'free']
      );

      const newTenantId = tenantResult.rows[0].id;
      await query(
        `INSERT INTO staff (tenant_id, email, password, name, role) VALUES ($1, $2, $3, $4, 'admin')`,
        [newTenantId, email, hashedPassword, businessName]
      );

      const defaultServices = [
        { name: 'Corte de Cabello', duration: 30, price: 0 },
        { name: 'Lavado y Secado', duration: 20, price: 0 },
        { name: 'Tinte / Color', duration: 120, price: 0 }
      ];
      for (let service of defaultServices) {
        await query(
          `INSERT INTO services (tenant_id, name, duration, price, active) VALUES ($1, $2, $3, $4, true)`,
          [newTenantId, service.name, service.duration, service.price]
        );
      }
      res.status(201).json({ message: 'Registro exitoso', slug });
    } catch (err) {
      logger.error('Error en registro', { error: err.message });
      res.status(500).json({ error: 'Error al registrar' });
    }
  });

  router.post('/staff/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requerido' });

      const staff = await queryOne('SELECT id, email, name FROM staff WHERE email = $1', [email]);

      if (!staff) {
        return res.json({ message: 'Si el email está registrado, recibirás un enlace de recuperación.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000);

      await query(
        'UPDATE staff SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [resetToken, expiresAt, staff.id]
      );

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const resetLink = `${baseUrl}/staff/reset-password.html?token=${resetToken}`;

      const transporter = createEmailTransporter();

      await transporter.sendMail({
        from: `"Veloré" <${process.env.SMTP_USER}>`,
        to: staff.email,
        subject: 'Recuperá tu contraseña',
        html: `
          <h2>Hola, ${staff.name}</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Hacé clic en el siguiente enlace para crear una nueva contraseña (válido por 1 hora):</p>
          <a href="${resetLink}" style="background:#667eea; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Restablecer contraseña</a>
          <p>Si no solicitaste esto, podés ignorar este mensaje.</p>
          <br>
          <p>Saludos,<br>Equipo Veloré</p>
        `,
      });

      logger.info('Correo de recuperacion enviado', { email: staff.email });
      res.json({ message: 'Si el email está registrado, recibirás un enlace de recuperación.' });
    } catch (err) {
      logger.error('Error en forgot-password', { error: err.message });
      res.status(500).json({ error: 'Error interno. Intentá más tarde.' });
    }
  });

  router.post('/staff/reset-password', passwordResetLimiter, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Faltan datos' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const staff = await queryOne(
        `SELECT id, email, name FROM staff WHERE reset_token = $1 AND reset_token_expires > NOW()`,
        [token]
      );

      if (!staff) {
        return res.status(400).json({ error: 'Enlace inválido o expirado. Solicita un nuevo restablecimiento.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query(
        `UPDATE staff SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
        [hashedPassword, staff.id]
      );

      try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
          from: `"Veloré" <${process.env.SMTP_USER}>`,
          to: staff.email,
          subject: 'Contraseña restablecida',
          html: `<p>Hola ${staff.name}, tu contraseña ha sido cambiada exitosamente.</p><p>Si no fuiste tú, contactanos inmediatamente.</p>`,
        });
        logger.info('Correo de confirmacion enviado', { email: staff.email });
      } catch (err) {
        logger.error('Error enviando correo de confirmacion', { error: err.message });
      }

      res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
    } catch (err) {
      logger.error('Error en reset-password', { error: err.message });
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
};
