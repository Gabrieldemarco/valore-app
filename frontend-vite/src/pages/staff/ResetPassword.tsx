import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
    color: '#1e293b',
    fontSize: '24px',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    color: '#64748b',
    textAlign: 'center' as const,
    marginBottom: '24px',
    fontSize: '14px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: '#334155',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputFocus: {
    borderColor: '#667eea',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: '#667eea',
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
    color: '#64748b',
    textDecoration: 'none',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #86efac',
  },
  formGroup: {
    marginBottom: '20px',
  },
  req: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '6px',
  },
};

export default function ResetPassword() {
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
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      await api.post('/api/staff/reset-password', { token, password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    }
  };

  const inputStyle = { ...styles.input, ...(error ? { borderColor: '#fca5a5' } : {}) };
  const btnStyle = { ...styles.btn, ...(!password || !confirm ? { opacity: 0.6, cursor: 'not-allowed' as const } : {}) };

  if (!token) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={styles.container}>
          <h1 style={styles.title}>Enlace inválido</h1>
          <p style={styles.subtitle}>El enlace de restablecimiento no es válido o ha expirado.</p>
          <div style={styles.backLink}>
            <Link to="/staff/forgot-password" style={styles.backLinkA}>Solicitar nuevo enlace</Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={styles.container}>
          <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>✅</div>
          <h1 style={styles.title}>Contraseña actualizada</h1>
          <p style={{ ...styles.subtitle, color: '#166534' }}>¡Tu contraseña fue actualizada!</p>
          <Link to="/staff/login" style={{ ...styles.btn, display: 'inline-block', textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>Iniciar sesión ahora</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={styles.container}>
        <h1 style={styles.title}>Nueva Contraseña</h1>
        <p style={styles.subtitle}>Ingresá tu nueva contraseña</p>

        {error && <div style={{ ...styles.message, ...styles.error }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nueva contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" style={inputStyle} />
            <div style={styles.req}>• Mínimo 6 caracteres</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} placeholder="Repetí tu contraseña" style={inputStyle} />
          </div>
          <button type="submit" disabled={!password || !confirm} style={btnStyle}>Actualizar contraseña</button>
        </form>

        <div style={styles.backLink}>
          <Link to="/staff/login" style={styles.backLinkA}>← Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
