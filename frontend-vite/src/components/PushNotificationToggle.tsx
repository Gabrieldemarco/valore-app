import { usePushNotifications } from '../hooks/usePushNotifications';
import { useTranslation } from 'react-i18next';
import { Loader } from 'lucide-react';

export default function PushNotificationToggle() {
  const { t } = useTranslation();
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
      <div className="flex-between gap-12">
        <div>
          <div className="font-600 mb-4">{t('common.pushNotifications')}</div>
          <div className="text-sm opacity-70">
            {subscribed
              ? t('pushNotifications.subscribedText')
              : t('pushNotifications.unsubscribedText')}
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
              : 'linear-gradient(135deg, var(--preset-velvet), var(--info))',
            color: subscribed ? 'var(--danger)' : '#fff',
            opacity: loading ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? <Loader size={16} className="spin-icon" /> : subscribed ? t('pushNotifications.deactivateButton') : t('pushNotifications.activateButton')}
        </button>
      </div>
      {error && (
        <div className="text-danger text-sm mt-8">
          {error}
        </div>
      )}
      {permission === 'denied' && (
        <div className="text-warning text-sm mt-8">
          {t('pushNotifications.blockedWarning')}
        </div>
      )}
    </div>
  );
}
