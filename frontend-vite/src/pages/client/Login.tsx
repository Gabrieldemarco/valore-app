import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import '../../styles/auth.css';

export default function ClientLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError(t('clientLogin.validationError')); return; }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; name?: string; username?: string; phone?: string }>('/api/login', { username, password });
      login(res.token, 'client', res.name || res.username);
      if (res.phone) localStorage.setItem('clientPhone', res.phone);
      if (res.name) localStorage.setItem('clientDisplayName', res.name);
      navigate('/client/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('clientLogin.loginError'));
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel text-center">
        <h1 className="text-gradient mb-4">{t('clientLogin.title')}</h1>
        <p className="auth-subtitle">{t('clientLogin.subtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="text-left">
          <div className="form-group">
            <label>{t('clientLogin.usernameLabel')}</label>
            <input type="text" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('clientLogin.usernamePlaceholder')} autoFocus />
          </div>

          <div className="form-group">
            <label>{t('clientLogin.passwordLabel')}</label>
            <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('clientLogin.passwordPlaceholder')} />
            <div className="mt-6 fs-13"><Link to="/client/forgot-password" className="text-secondary no-underline">{t('clientLogin.forgotPassword') || '¿Olvidaste tu contraseña?'}</Link></div>
          </div>

          <button type="submit" className="btn btn-primary w-full p-14 mt-10 fs-15" disabled={loading}>
            {loading ? t('clientLogin.loading') : t('clientLogin.submitButton')}
          </button>

          <div className="auth-bottom-text mt-20">
            {t('clientLogin.noAccount')} <Link to="/client/register">{t('clientLogin.registerLink')}</Link>
          </div>
        </form>

        <div className="flex-center gap-12 my-20">
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
          <span className="text-secondary fs-13">{t('common.or')}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
        </div>

        <div className="flex-center-center">
          <GoogleLoginButton mode="login" />
        </div>

        <div className="auth-back-link mt-8">
          <Link to="/">{t('clientLogin.backHome')}</Link>
        </div>
      </div>
    </div>
  );
}
