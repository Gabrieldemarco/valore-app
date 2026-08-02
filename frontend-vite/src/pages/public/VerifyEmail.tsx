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
    if (!token) { setStatus('error'); setMessage(t('verifyEmail.tokenNotFound')); return; } // eslint-disable-line react-hooks/set-state-in-effect
    api.post('/api/verify-email', { token })
      .then(() => { setStatus('success'); setMessage(t('verifyEmail.successMessage')); })
      .catch(err => { setStatus('error'); setMessage(err instanceof Error ? err.message : t('verifyEmail.errorMessage')); });
  }, [token, t]);

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, var(--purple-gradient) 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', textAlign: 'center' }}>
        {status === 'loading' && <><div className="fs-48 mb-16">⏳</div><h2>{t('verifyEmail.verifying')}</h2></>}
        {status === 'success' && <><div className="fs-48 mb-16">✓</div><h2>{t('verifyEmail.verified')}</h2><p className="text-success mb-16">{message}</p><Link to="/client/login" className="btn btn-primary fs-16 no-underline inline-block" style={{ padding: '12px 24px' }}>{t('verifyEmail.loginButton')}</Link></>}
        {status === 'error' && <><div className="fs-48 mb-16">❌</div><h2>{t('verifyEmail.errorTitle')}</h2><p className="text-danger-dark mb-16">{message}</p><p><Link to="/client/login" className="text-info">{t('verifyEmail.goToLogin')}</Link></p></>}
      </div>
    </div>
  );
}
