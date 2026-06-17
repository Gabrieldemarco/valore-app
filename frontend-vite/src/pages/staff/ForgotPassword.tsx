import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

import '../../styles/auth.css';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/staff/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('staffForgotPassword.error'));
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h1 className="text-gradient">{t('staffForgotPassword.title')}</h1>
        <p className="auth-subtitle">{t('staffForgotPassword.subtitle')}</p>

        {sent && <div className="auth-success">{t('staffForgotPassword.sentMessage')}</div>}
        {error && <div className="auth-error">{error}</div>}

        {!sent && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('staffForgotPassword.emailLabel')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" required placeholder={t('staffForgotPassword.emailPlaceholder')} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>{t('staffForgotPassword.sendButton')}</button>
          </form>
        )}

        <div className="auth-back-link">
          <Link to="/staff/login">{t('staffForgotPassword.backLink')}</Link>
        </div>
      </div>
    </div>
  );
}
