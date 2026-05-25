
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../database';
import { authenticate, authenticateStaff, checkTenantActive, checkTrialExpiration } from '../middleware';
import logger from '../services/logger';

/**
 * Rutas misceláneas: agenda personal, health check, listado público de tenants, upload
 * @param {import('express').RequestHandler} apiLimiter
 * @returns {import('express').Router}
 */
export default function(apiLimiter) {
  const router = Router();

  // ========== AGENDA PERSONAL (CLIENTES) ==========
  router.get('/agenda', authenticate(['client']), async (req, res) => {
    try {
      const result = await query('SELECT * FROM personal_agenda WHERE user_id = $1 ORDER BY fecha ASC', [req.user.id]);
      res.json(result.rows);
    } catch (err: any) { logger.error('Error al cargar agenda', { error: err.message }); res.status(500).json({ error: 'Error al cargar agenda' }); }
  });

  router.post('/agenda', authenticate(['client']), async (req, res) => {
    try {
      const { titulo, fecha, descripcion } = req.body;
      if (!titulo || !fecha) return res.status(400).json({ error: 'Faltan datos' });
      const result = await query(
        'INSERT INTO personal_agenda (user_id, titulo, fecha, descripcion) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, titulo, fecha, descripcion || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al crear evento' }); }
  });

  router.put('/agenda/:id', authenticate(['client']), async (req, res) => {
    try {
      const { titulo, fecha, descripcion } = req.body;
      const result = await query(
        'UPDATE personal_agenda SET titulo = $1, fecha = $2, descripcion = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
        [titulo, fecha, descripcion || null, req.params.id, req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json(result.rows[0]);
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al actualizar' }); }
  });

  router.delete('/agenda/:id', authenticate(['client']), async (req, res) => {
    try {
      const result = await query('DELETE FROM personal_agenda WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ message: 'Eliminado' });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al eliminar' }); }
  });

  // ========== HEALTH CHECK ==========
  router.get('/health', async (req, res) => {
    try {
      const services = await query('SELECT COUNT(*) FROM services');
      const appointments = await query('SELECT COUNT(*) FROM appointments');
      const tenants = await query('SELECT COUNT(*) FROM tenants');
      res.json({ status: 'ok', database: 'PostgreSQL', services: parseInt(services.rows[0].count), appointments: parseInt(appointments.rows[0].count), tenants: parseInt(tenants.rows[0].count) });
    } catch (err: any) { res.status(500).json({ status: 'error', message: err.message }); }
  });

  // ========== LISTADO PÚBLICO DE TENANTS ==========
  router.get('/tenants', async (req, res) => {
    try {
      const tenants = await query(
        `SELECT t.id, t.slug, t.business_name, t.brand_logo_url, t.business_address, t.landing_hero_image, t.landing_description,
                (SELECT json_agg(s.name) FROM services s WHERE s.tenant_id = t.id AND s.active = true) as services
         FROM tenants t WHERE t.status = 'active' AND t.landing_enabled = true ORDER BY t.created_at DESC`
      );
      res.json({ tenants: tenants.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar peluquerías' }); }
  });

  // ========== UPLOAD DE IMÁGENES ==========
  router.post('/upload-image', authenticateStaff, checkTenantActive, checkTrialExpiration, apiLimiter, async (req, res) => {
    try {
      const { image, filename } = req.body;
      if (!image || !filename) return res.status(400).json({ error: 'Faltan datos' });

      const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ error: 'Formato de imagen inválido' });

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Imagen muy grande (max 5MB)' });

      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueName = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filepath = path.join(uploadsDir, uniqueName);

      fs.writeFileSync(filepath, buffer);

      const imageUrl = `/uploads/${uniqueName}`;
      logger.info('Imagen subida: ' + imageUrl);

      res.json({ success: true, url: imageUrl, message: 'Imagen subida' });
    } catch (err: any) {
      logger.error('Upload error:', err);
      res.status(500).json({ error: 'Error al subir imagen' });
    }
  });

  return router;
};
