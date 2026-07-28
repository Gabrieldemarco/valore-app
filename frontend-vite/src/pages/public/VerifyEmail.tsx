import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage(t('verifyEmail.tokenNotFound', 'Token de verificación no encontrado.')); return; }
    api.post('/api/verify-email', { token })
      .then(() => { setStatus('success'); setMessage(t('verifyEmail.successMessage', 'Email verificado exitosamente. Ya puedes iniciar sesión.')); })
      .catch(err => { setStatus('error'); setMessage(err instanceof Error ? err.message : t('verifyEmail.errorMessage', 'Error al verificar email.')); });
  }, [token]);

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', textAlign: 'center' }}>
        {status === 'loading' && <><div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div><h2>{t('verifyEmail.verifying', 'Verificando email...')}</h2></>}
        {status === 'success' && <><div style={{ fontSize: 48, marginBottom: 16 }}>✅</div><h2>{t('verifyEmail.verified', '¡Email verificado!')}</h2><p style={{ color: 'var(--success)', marginBottom: 16 }}>{message}</p><Link to="/client/login" style={{ background: 'var(--info)', color: 'white', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}>{t('verifyEmail.loginButton', 'Iniciar sesión')}</Link></>}
        {status === 'error' && <><div style={{ fontSize: 48, marginBottom: 16 }}>❌</div><h2>{t('verifyEmail.errorTitle', 'Error')}</h2><p style={{ color: 'var(--danger-dark)', marginBottom: 16 }}>{message}</p><p><Link to="/client/login" style={{ color: 'var(--info)' }}>{t('verifyEmail.goToLogin', 'Ir al inicio de sesión')}</Link></p></>}
      </div>
    </div>
  );
}
