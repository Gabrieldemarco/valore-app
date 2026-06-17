import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

import '../../styles/auth.css';

export default function StaffRegister() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ businessName: '', email: '', password: '', phone: '', address: '', category: 'peluqueria' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/staff/register', form);
      setSuccess(true);
      setTimeout(() => navigate('/staff/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('staffRegister.registerError'));
    }
  };

  if (success) {
    return (
      <div className="auth-body">
        <div className="auth-card glass-panel">
          <h2 className="text-gradient">{t('staffRegister.successTitle')}</h2>
          <p className="auth-subtitle">{t('staffRegister.successSubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h2 className="text-gradient">{t('staffRegister.title')}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('staffRegister.businessNameLabel')}</label>
            <input name="businessName" value={form.businessName} onChange={handleChange} className="glass-input" required placeholder={t('staffRegister.businessNamePlaceholder')} />
          </div>

          <div className="form-group">
            <label>Categoría del Negocio</label>
            <select name="category" value={form.category} onChange={handleChange} className="glass-input" required style={{ appearance: 'auto', cursor: 'pointer' }}>
              <option value="peluqueria">Peluquería / Barbería</option>
              <option value="cejas">Cejas &amp; Pestañas</option>
              <option value="uñas">Manicura &amp; Pedicura</option>
              <option value="maquillaje">Maquillaje</option>
              <option value="facial">Cuidado Facial</option>
              <option value="depilacion">Depilación</option>
              <option value="masajes">Masajes &amp; Bienestar</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('staffRegister.emailLabel')}</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="glass-input" required placeholder={t('staffRegister.emailPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('staffRegister.passwordLabel')}</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="glass-input" required placeholder={t('staffRegister.passwordPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('staffRegister.phoneLabel')}</label>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="glass-input" placeholder={t('staffRegister.phonePlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('staffRegister.addressLabel')}</label>
            <input name="address" value={form.address} onChange={handleChange} className="glass-input" placeholder={t('staffRegister.addressPlaceholder')} />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 20 }}>
            <input type="checkbox" id="acceptTerms" required style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--primary)', width: 'auto', height: 'auto' }} />
            <label htmlFor="acceptTerms" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', fontWeight: 400, marginBottom: 0 }}>
              Acepto los <Link to="/terms#terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Términos y Condiciones</Link>, la <Link to="/terms#privacy" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Política de Privacidad</Link> y la <Link to="/terms#cancellations" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Política de Cancelaciones</Link> de Velsoie.
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>{t('staffRegister.createButton')}</button>
        </form>

        <div className="auth-bottom-text">
          {t('staffRegister.hasAccount')} <Link to="/staff/login">{t('staffRegister.loginLink')}</Link>
        </div>
      </div>
    </div>
  );
}
