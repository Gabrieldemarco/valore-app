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
  title: {
    color: 'var(--bg-card)',
    fontSize: '24px',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    textAlign: 'center' as const,
    marginBottom: '24px',
    fontSize: '14px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: 'var(--bg-elevated)',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputFocus: {
    borderColor: 'var(--info)',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'var(--info)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  backLink: {
    textAlign: 'center' as const,
    marginTop: '20px',
    fontSize: '14px',
  },
  backLinkA: {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  error: {
    background: 'var(--danger-light)',
    color: 'var(--danger-dark)',
    border: '1px solid var(--danger-light)',
  },
  success: {
    background: 'var(--success-light)',
    color: 'var(--success)',
    border: '1px solid var(--success-light)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  req: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
  },
};

export default function ResetPassword() {
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
    if (password !== confirm) {
      setError(t('staffResetPassword.passwordMismatch'));
      return;
    }
    try {
      await api.post('/api/staff/reset-password', { token, password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('staffResetPassword.error'));
    }
  };

  const inputStyle = { ...styles.input, ...(error ? { borderColor: 'var(--danger-light)' } : {}) };
  const btnStyle = { ...styles.btn, ...(!password || !confirm ? { opacity: 0.6, cursor: 'not-allowed' as const } : {}) };

  if (!token) {
    return (
      <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, var(--purple-gradient) 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={styles.container}>
          <h1 style={styles.title}>{t('staffResetPassword.invalidLinkTitle')}</h1>
          <p style={styles.subtitle}>{t('staffResetPassword.invalidLinkMessage')}</p>
          <div style={styles.backLink}>
            <Link to="/staff/forgot-password" style={styles.backLinkA}>{t('staffResetPassword.requestNewLink')}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, var(--purple-gradient) 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={styles.container}>
          <div className="fs-48 mb-16 text-center">✓</div>
          <h1 style={styles.title}>{t('staffResetPassword.successTitle')}</h1>
          <p style={{ ...styles.subtitle, color: 'var(--success)' }}>{t('staffResetPassword.successMessage')}</p>
          <Link to="/staff/login" style={{ ...styles.btn, display: 'inline-block', textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>{t('staffResetPassword.loginNow')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, var(--info) 0%, var(--purple-gradient) 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={styles.container}>
        <h1 style={styles.title}>{t('staffResetPassword.title')}</h1>
        <p style={styles.subtitle}>{t('staffResetPassword.subtitle')}</p>

        {error && <div style={{ ...styles.message, ...styles.error }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('staffResetPassword.newPasswordLabel')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder={t('staffResetPassword.newPasswordPlaceholder')} style={inputStyle} />
            <div style={styles.req}>{t('staffResetPassword.passwordRequirement')}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t('staffResetPassword.confirmPasswordLabel')}</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} placeholder={t('staffResetPassword.confirmPasswordPlaceholder')} style={inputStyle} />
          </div>
          <button type="submit" disabled={!password || !confirm} style={btnStyle}>{t('staffResetPassword.submitButton')}</button>
        </form>

        <div style={styles.backLink}>
          <Link to="/staff/login" style={styles.backLinkA}>{t('staffResetPassword.backLink')}</Link>
        </div>
      </div>
    </div>
  );
}
