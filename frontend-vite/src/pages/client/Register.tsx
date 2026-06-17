import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import '../../styles/auth.css';

export default function ClientRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name || !username || !password) { setError(t('clientRegister.validationError')); return; }
    if (password.length < 6) { setError(t('clientRegister.passwordLengthError')); return; }
    if (password !== confirmPassword) { setError(t('clientRegister.passwordMatchError')); return; }
    setLoading(true);
    try {
      await api.post('/api/register', { username, password, name, phone: phone || undefined });
      setSuccess(t('clientRegister.successMessage'));
      setTimeout(() => navigate('/client/login'), 2000);
    } catch (err: any) {
      setError(err?.message || t('clientRegister.registerError'));
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel" style={{ textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ marginBottom: 4 }}>{t('clientRegister.title')}</h1>
        <p className="auth-subtitle">{t('clientRegister.subtitle')}</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label>{t('clientRegister.nameLabel')}</label>
            <input type="text" className="glass-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('clientRegister.namePlaceholder')} autoFocus />
          </div>
          <div className="form-group">
            <label>{t('clientRegister.usernameLabel')}</label>
            <input type="text" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('clientRegister.usernamePlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('clientRegister.passwordLabel')}</label>
            <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('clientRegister.passwordPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('clientRegister.confirmPasswordLabel')}</label>
            <input type="password" className="glass-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('clientRegister.confirmPasswordPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('clientRegister.phoneLabel')}</label>
            <input type="tel" className="glass-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('clientRegister.phonePlaceholder')} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10, fontSize: 15 }} disabled={loading}>
            {loading ? t('clientRegister.loading') : t('clientRegister.submitButton')}
          </button>

          <div className="auth-bottom-text" style={{ marginTop: 20 }}>
            {t('clientRegister.hasAccount')} <Link to="/client/login">{t('clientRegister.loginLink')}</Link>
          </div>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>O</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
        </div>

        <a href="/api/auth/google" className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, color: '#e2e8f0', textDecoration: 'none', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Registrarse con Google
        </a>

        <div className="auth-back-link" style={{ marginTop: 8 }}>
          <Link to="/">{t('clientRegister.backHome')}</Link>
        </div>
      </div>
    </div>
  );
}
