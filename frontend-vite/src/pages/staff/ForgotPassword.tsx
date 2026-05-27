import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

import '../../styles/auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/staff/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el email');
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h1 className="text-gradient">Recuperar Contraseña</h1>
        <p className="auth-subtitle">Te enviaremos un enlace para restablecer tu contraseña</p>

        {sent && <div className="auth-success">Si el email está registrado, recibirás un enlace para restablecer tu contraseña.</div>}
        {error && <div className="auth-error">{error}</div>}

        {!sent && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email registrado</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" required placeholder="admin@pelu.com" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>Enviar enlace</button>
          </form>
        )}

        <div className="auth-back-link">
          <Link to="/staff/login">← Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
