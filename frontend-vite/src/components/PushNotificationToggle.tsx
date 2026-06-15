import { usePushNotifications } from '../hooks/usePushNotifications';
import { Loader } from 'lucide-react';

export default function PushNotificationToggle() {
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.1)',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Notificaciones push</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            {subscribed
              ? 'Recibís alertas de nuevos turnos al instante'
              : 'Activá para recibir alertas cuando reserven un turno'}
          </div>
        </div>
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading || permission === 'denied'}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            background: subscribed
              ? 'rgba(239,68,68,0.2)'
              : 'linear-gradient(135deg, #7c3aed, #2563eb)',
            color: subscribed ? '#ef4444' : '#fff',
            opacity: loading ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? <Loader size={16} className="spin-icon" /> : subscribed ? 'Desactivar' : 'Activar'}
        </button>
      </div>
      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 8 }}>
          {error}
        </div>
      )}
      {permission === 'denied' && (
        <div style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: 8 }}>
          Notificaciones bloqueadas en el navegador. Cambiá esto en la configuración de tu navegador.
        </div>
      )}
    </div>
  );
}
