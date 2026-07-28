import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

const styles = {
  container: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    maxWidth: '450px',
    width: '100%' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  title: { color: 'var(--bg-card)', fontSize: '24px', marginBottom: '8px', textAlign: 'center' as const },
  subtitle: { color: 'var(--text-secondary)', textAlign: 'center' as const, marginBottom: '24px', fontSize: '14px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--bg-elevated)', fontSize: '14px' },
  input: {
    width: '100%', padding: '12px 16px',     border: '2px solid var(--border-color)', borderRadius: '8px',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
  },
  btn: {
    width: '100%', padding: '14px', background: 'var(--info)', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
  },
  backLink: { textAlign: 'center' as const, marginTop: '20px', fontSize: '14px' },
  backLinkA: { color: 'var(--text-secondary)', textDecoration: 'none' },
  message: { padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' },
  error: { background: 'var(--danger-light)', color: 'var(--danger-dark)', border: '1px solid var(--danger-light)' },
  success: { background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-light)' },
  formGroup: { marginBottom: '20px' },
  req: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' },
};

export default function ClientResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError(t('clientResetPassword.passwordMismatch')); return; }
    try {
      await api.post('/api/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('clientResetPassword.error'));
    }
  };

  const inputStyle = { ...styles.input, ...(error ? { borderColor: 'var(--danger-light)' } : {}) };
  const btnStyle = { ...styles.btn, ...(!password || !confirm ? { opacity: 0.6, cursor: 'not-allowed' as const } : {}) };

  if (!token) {
    return (
      <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={styles.container}>
          <h1 style={styles.title}>{t('clientResetPassword.invalidLinkTitle')}</h1>
          <p style={styles.subtitle}>{t('clientResetPassword.invalidLinkMessage')}</p>
          <div style={styles.backLink}>
            <Link to="/client/forgot-password" style={styles.backLinkA}>{t('clientResetPassword.requestNewLink')}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={styles.container}>
          <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>✅</div>
          <h1 style={styles.title}>{t('clientResetPassword.successTitle')}</h1>
          <p style={{ ...styles.subtitle, color: 'var(--success)' }}>{t('clientResetPassword.successMessage')}</p>
          <Link to="/client/login" style={{ ...styles.btn, display: 'inline-block', textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>{t('clientResetPassword.loginNow')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={styles.container}>
        <h1 style={styles.title}>{t('clientResetPassword.title')}</h1>
        <p style={styles.subtitle}>{t('clientResetPassword.subtitle')}</p>

        {error && <div style={{ ...styles.message, ...styles.error }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('clientResetPassword.newPasswordLabel')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••" style={inputStyle} />
            <div style={styles.req}>{t('clientResetPassword.passwordRequirement')}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('clientResetPassword.confirmPasswordLabel')}</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} placeholder="••••••" style={inputStyle} />
          </div>
          <button type="submit" disabled={!password || !confirm} style={btnStyle}>{t('clientResetPassword.submitButton')}</button>
        </form>

        <div style={styles.backLink}>
          <Link to="/client/login" style={styles.backLinkA}>{t('clientResetPassword.backLink')}</Link>
        </div>
      </div>
    </div>
  );
}
