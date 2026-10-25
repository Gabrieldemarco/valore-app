import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { logger } from '../services/logger';

const VAPID_KEY_CACHE = 'velsoie-vapid-key';

async function getVapidKey(): Promise<string | null> {
  const cached = sessionStorage.getItem(VAPID_KEY_CACHE);
  if (cached) return cached;
  try {
    const res = await api.get<{ publicKey: string; configured: boolean }>('/api/push/vapid-public-key');
    if (res?.publicKey) {
      sessionStorage.setItem(VAPID_KEY_CACHE, res.publicKey);
      return res.publicKey;
    }
  } catch { /* ignore */ }
  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unavailable'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setSupported(false); // eslint-disable-line react-hooks/set-state-in-effect
      setPermission('unavailable');
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') {
        setError('pushNotifications.errorPermissionDenied');
        setLoading(false);
        return;
      }

      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        setError('pushNotifications.errorHTTPSRequired');
        setLoading(false);
        return;
      }

      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        setError('pushNotifications.errorNotConfigured');
        setLoading(false);
        return;
      }

      if (!('serviceWorker' in navigator)) {
        setError('pushNotifications.errorSWNotSupported');
        setLoading(false);
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) {
        if (!import.meta.env.PROD) { setLoading(false); return; }
        try {
          reg = await navigator.serviceWorker.register('/sw.js');
        } catch (swErr: unknown) {
          logger.error('SW registration failed:', swErr);
          setError('pushNotifications.errorSWRegistration');
          setLoading(false);
          return;
        }
      }
      reg = await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      await api.post('/api/push/subscribe', {
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
        },
      });

      setSubscribed(true);
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      logger.error('Push subscribe error:', errObj.name, errObj.message, err);
      const msg = errObj.name === 'AbortError'
        ? 'pushNotifications.errorAborted'
        : errObj.name === 'NetworkError'
          ? 'pushNotifications.errorNetwork'
          : errObj.name === 'InvalidStateError'
            ? 'pushNotifications.errorInvalidState'
            : errObj.name === 'NotSupportedError'
              ? 'pushNotifications.errorNotSupported'
              : errObj.message || 'pushNotifications.errorSubscribe';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || 'pushNotifications.errorUnsubscribe');
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}
