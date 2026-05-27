import { Router } from 'express';
import { body } from 'express-validator';
import { query } from '../database';
import { authenticateStaff } from '../middleware';
import { getVapidPublicKey, isVapidConfigured } from '../services/web-push';
import logger from '../services/logger';

export default function() {
  const router = Router();

  router.get('/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: getVapidPublicKey(), configured: isVapidConfigured() });
  });

  router.post('/push/subscribe', authenticateStaff, [
    body('endpoint').isString().notEmpty().withMessage('Endpoint requerido'),
    body('keys').isObject().withMessage('Keys requeridas'),
    body('keys.p256dh').isString().notEmpty().withMessage('p256dh requerido'),
    body('keys.auth').isString().notEmpty().withMessage('auth requerido'),
  ], async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      const tenantId = req.user.tenant_id;

      const existing = await query('SELECT id FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
      if (existing.rows.length > 0) {
        await query('UPDATE push_subscriptions SET p256dh = $1, auth = $2 WHERE endpoint = $3', [keys.p256dh, keys.auth, endpoint]);
        return res.json({ success: true, message: 'Suscripción actualizada' });
      }

      await query(
        'INSERT INTO push_subscriptions (tenant_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)',
        [tenantId, endpoint, keys.p256dh, keys.auth]
      );
      res.status(201).json({ success: true, message: 'Suscripto a notificaciones push' });
    } catch (err: any) {
      logger.error('Error al suscribir push:', err.message);
      res.status(500).json({ error: 'Error al suscribir' });
    }
  });

  router.post('/push/unsubscribe', authenticateStaff, [
    body('endpoint').isString().notEmpty().withMessage('Endpoint requerido'),
  ], async (req, res) => {
    try {
      const { endpoint } = req.body;
      await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
      res.json({ success: true, message: 'Suscripción eliminada' });
    } catch (err: any) {
      logger.error('Error al desuscribir push:', err.message);
      res.status(500).json({ error: 'Error al desuscribir' });
    }
  });

  return router;
}
