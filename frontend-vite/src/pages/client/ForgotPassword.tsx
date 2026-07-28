import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import '../../styles/auth.css';

export default function ClientForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('clientForgotPassword.error'));
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h1 className="text-gradient">{t('clientForgotPassword.title')}</h1>
        <p className="auth-subtitle">{t('clientForgotPassword.subtitle')}</p>

        {sent && <div className="auth-success">{t('clientForgotPassword.sentMessage')}</div>}
        {error && <div className="auth-error">{error}</div>}

        {!sent && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('clientForgotPassword.emailLabel')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" required placeholder={t('clientForgotPassword.emailPlaceholder')} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>{t('clientForgotPassword.sendButton')}</button>
          </form>
        )}

        <div className="auth-back-link">
          <Link to="/client/login">{t('clientForgotPassword.backLink')}</Link>
        </div>
      </div>
    </div>
  );
}
