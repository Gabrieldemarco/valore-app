import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import PhoneInput from '../../components/PhoneInput';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import '../../styles/auth.css';

export default function ClientRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
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
      await api.post('/api/register', { username, password, name, phone: phone || undefined, email: email || undefined });
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
            <PhoneInput value={phone} onChange={setPhone} placeholder={t('clientRegister.phonePlaceholder')} className="glass-input" />
          </div>

          <div className="form-group">
            <label>{t('clientRegister.emailOptionalLabel')}</label>
            <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('clientRegister.emailOptionalPlaceholder')} />
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
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('common.or')}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.2)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLoginButton mode="register" />
        </div>

        <div className="auth-back-link" style={{ marginTop: 8 }}>
          <Link to="/">{t('clientRegister.backHome')}</Link>
        </div>
      </div>
    </div>
  );
}
