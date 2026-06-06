import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

import '../../styles/auth.css';

export default function StaffLogin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post<{ token: string; name: string; role: string }>('/api/staff/login', { email, password });
      login(res.token, 'staff', res.name);
      navigate('/staff/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('staffLogin.loginError'));
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h1 className="text-gradient">{t('staffLogin.title')}</h1>
        <p className="auth-subtitle">{t('staffLogin.subtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('staffLogin.emailLabel')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" required placeholder={t('staffLogin.emailPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('staffLogin.passwordLabel')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="glass-input" required placeholder={t('staffLogin.passwordPlaceholder')} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>{t('staffLogin.loginButton')}</button>

          <div className="auth-forgot-link">
            <Link to="/staff/forgot-password">{t('staffLogin.forgotPassword')}</Link>
          </div>

          <div className="auth-bottom-text">
            {t('staffLogin.noAccount')} <Link to="/staff/register">{t('staffLogin.registerLink')}</Link>
          </div>
        </form>

        <div className="auth-back-link">
          <Link to="/">{t('staffLogin.backLink')}</Link>
        </div>
      </div>
    </div>
  );
}
