
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { body } from 'express-validator';
import { query } from '../database';
import { authenticate, authenticateStaff, checkTenantActive, checkTrialExpiration, validate } from '../middleware';
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

  router.post('/agenda', authenticate(['client']), [
    body('titulo').trim().isLength({ min: 1, max: 200 }).withMessage('Título requerido').escape(),
    body('fecha').isISO8601().withMessage('Fecha inválida'),
  ], validate, async (req, res) => {
    try {
      const { titulo, fecha, descripcion } = req.body;
      const result = await query(
        'INSERT INTO personal_agenda (user_id, titulo, fecha, descripcion) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, titulo, fecha, descripcion || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al crear evento' }); }
  });

  router.put('/agenda/:id', authenticate(['client']), [
    body('titulo').optional().trim().isLength({ min: 1, max: 200 }).escape(),
    body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
  ], validate, async (req, res) => {
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
      await query('SELECT 1');
      res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        sentry: Boolean(process.env.SENTRY_DSN),
        uptime_seconds: Math.round(process.uptime()),
        database: 'PostgreSQL'
      });
    } catch (err: any) {
      logger.error('Health check error', { error: err?.message || err });
      res.status(500).json({ status: 'error', error: err?.message || 'Health check failed' });
    }
  });

  // ========== LISTADO PÚBLICO DE TENANTS ==========
  router.get('/tenants', async (req, res) => {
    try {
      const { lat, lng, category } = req.query;
      let sql;
      let params: any[] = [];

      if (lat && lng) {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);
        if (!isNaN(latNum) && !isNaN(lngNum)) {
          sql = `SELECT t.id, t.slug, t.business_name, t.brand_logo_url, t.business_address,
                        t.landing_hero_image, t.landing_description, t.lat, t.lng, t.category,
                        (SELECT json_agg(s.name) FROM services s WHERE s.tenant_id = t.id AND s.active = true) as services,
                        (6371 * acos(cos(radians($1)) * cos(radians(t.lat)) * cos(radians(t.lng) - radians($2)) + sin(radians($1)) * sin(radians(t.lat)))) AS distance
                 FROM tenants t
                 WHERE t.status = 'active' AND t.landing_enabled = true AND t.lat IS NOT NULL AND t.lng IS NOT NULL
                 ORDER BY distance ASC`;
          params = [latNum, lngNum];
        }
      }

      if (!sql) {
        let whereClause = "t.status = 'active' AND t.landing_enabled = true";
        if (category) {
          whereClause += ` AND t.category = $1`;
          params = [category];
        }
        sql = `SELECT t.id, t.slug, t.business_name, t.brand_logo_url, t.business_address,
                      t.landing_hero_image, t.landing_description, t.lat, t.lng, t.category,
                      (SELECT json_agg(s.name) FROM services s WHERE s.tenant_id = t.id AND s.active = true) as services
               FROM tenants t WHERE ${whereClause} ORDER BY t.created_at DESC`;
      }

      const tenants = await query(sql, params);
      res.json({ tenants: tenants.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al cargar peluquerías' }); }
  });

  // ========== TENANTS CERCA DE UNA UBICACIÓN ==========
  router.get('/tenants/nearby', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseFloat(req.query.radius as string) || 50; // km

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Parámetros lat y lng requeridos' });
      }

      const result = await query(
        `SELECT t.id, t.slug, t.business_name, t.brand_logo_url, t.business_address,
                t.landing_hero_image, t.landing_description, t.lat, t.lng, t.category,
                (SELECT json_agg(s.name) FROM services s WHERE s.tenant_id = t.id AND s.active = true) as services,
                (6371 * acos(cos(radians($1)) * cos(radians(t.lat)) * cos(radians(t.lng) - radians($2)) + sin(radians($1)) * sin(radians(t.lat)))) AS distance
         FROM tenants t
         WHERE t.status = 'active' AND t.landing_enabled = true
           AND t.lat IS NOT NULL AND t.lng IS NOT NULL
           AND (6371 * acos(cos(radians($1)) * cos(radians(t.lat)) * cos(radians(t.lng) - radians($2)) + sin(radians($1)) * sin(radians(t.lat)))) <= $3
         ORDER BY distance ASC`,
        [lat, lng, radius]
      );

      res.json({ tenants: result.rows });
    } catch (err: any) { logger.error(err); res.status(500).json({ error: 'Error al buscar cercanos' }); }
  });

  // ========== UPLOAD DE IMÁGENES ==========
  router.post('/upload-image', authenticateStaff, checkTenantActive, checkTrialExpiration, apiLimiter, [
    body('image').notEmpty().withMessage('Imagen requerida'),
    body('filename').notEmpty().withMessage('Nombre de archivo requerido'),
  ], validate, async (req, res) => {
    try {
      const { image, filename } = req.body;

      const allowedTypes: Record<string, string> = {
        jpeg: 'jpg',
        jpg: 'jpg',
        png: 'png',
        gif: 'gif',
        webp: 'webp'
      };

      const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ error: 'Formato de imagen inválido' });

      const mimeType = matches[1].toLowerCase();
      const ext = allowedTypes[mimeType];
      if (!ext) return res.status(400).json({ error: 'Tipo de imagen no soportado' });

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
}
