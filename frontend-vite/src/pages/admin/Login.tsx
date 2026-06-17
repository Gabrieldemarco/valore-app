import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

import '../../styles/auth.css';
import '../../styles/admin.css';

export default function AdminLogin() {
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
      const res = await api.post<{ token: string }>('/api/super-admin/login', { email, password });
      login(res.token, 'superAdmin');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  return (
    <div className="admin-view">
      <div className="auth-body">
        <div className="auth-card glass-panel">
          <h1 className="text-gradient">{t('adminLogin.title')}</h1>
          <p className="auth-subtitle">{t('adminLogin.subtitle')}</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('adminLogin.emailLabel')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" required placeholder={t('adminLogin.emailPlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('adminLogin.passwordLabel')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="glass-input" required placeholder={t('adminLogin.passwordPlaceholder')} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>{t('adminLogin.loginButton')}</button>
          </form>

          <div className="auth-back-link">
            <Link to="/">{t('adminLogin.backLink')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
