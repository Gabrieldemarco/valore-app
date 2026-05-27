import webPush from 'web-push';
import logger from './logger';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@velore.com.uy';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  logger.info('🔔 VAPID configurado para push notifications');
} else {
  logger.warn('🔔 VAPID keys no configuradas. Push notifications deshabilitadas. Generalas con: npx web-push generate-vapid-keys');
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

export function isVapidConfigured() {
  return !!(vapidPublicKey && vapidPrivateKey);
}

export async function sendPushNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: { title: string; body: string; icon?: string; url?: string; tag?: string }) {
  if (!isVapidConfigured()) {
    logger.warn('Push no enviado: VAPID no configurado');
    return { success: false, skipped: 'VAPID not configured' };
  }
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload), { TTL: 86400 });
    return { success: true };
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      logger.warn('Push subscription expirada/inválida, debería eliminarse');
      return { success: false, expired: true };
    }
    logger.error('Error enviando push:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendPushToTenant(tenantId: number, payload: { title: string; body: string; url?: string }) {
  if (!isVapidConfigured()) return { success: false, skipped: 'VAPID not configured' };
  const { query } = await import('../database');
  try {
    const subs = await query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE tenant_id = $1', [tenantId]);
    const results = [];
    for (const row of subs.rows) {
      const notificationPayload = {
        ...payload,
        icon: '/icons/icon-192.svg',
        tag: 'velore-notification',
      };
      const sub = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
      const result = await sendPushNotification(sub, notificationPayload);
      results.push(result);
      if (result.expired) {
        await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
      }
    }
    return { success: true, sent: results.filter(r => r.success).length, expired: results.filter(r => r.expired).length };
  } catch (err: any) {
    logger.error('Error enviando push a tenant:', err.message);
    return { success: false, error: err.message };
  }
}
