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
      const res: any = await api.post('/api/login', { username, password });
      login(res.token, 'client', res.name || res.username);
      if (res.phone) localStorage.setItem('clientPhone', res.phone);
      if (res.name) localStorage.setItem('clientDisplayName', res.name);
      navigate('/client/dashboard');
    } catch (err: any) {
      setError(err?.message || t('clientLogin.loginError'));
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel" style={{ textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ marginBottom: 4 }}>{t('clientLogin.title')}</h1>
        <p className="auth-subtitle">{t('clientLogin.subtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label>{t('clientLogin.usernameLabel')}</label>
            <input type="text" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('clientLogin.usernamePlaceholder')} autoFocus />
          </div>

          <div className="form-group">
            <label>{t('clientLogin.passwordLabel')}</label>
            <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('clientLogin.passwordPlaceholder')} />
            <div style={{ marginTop: 6, fontSize: 13 }}><Link to="/client/forgot-password" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('clientLogin.forgotPassword') || '¿Olvidaste tu contraseña?'}</Link></div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10, fontSize: 15 }} disabled={loading}>
            {loading ? t('clientLogin.loading') : t('clientLogin.submitButton')}
          </button>

          <div className="auth-bottom-text" style={{ marginTop: 20 }}>
            {t('clientLogin.noAccount')} <Link to="/client/register">{t('clientLogin.registerLink')}</Link>
          </div>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>O</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLoginButton mode="login" />
        </div>

        <div className="auth-back-link" style={{ marginTop: 8 }}>
          <Link to="/">{t('clientLogin.backHome')}</Link>
        </div>
      </div>
    </div>
  );
}
