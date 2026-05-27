import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

import '../../styles/auth.css';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post<{ token: string; name: string; role: string }>('/api/staff/login', { email, password });
      login(res.token, 'staff', res.name);
      navigate('/staff/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h1 className="text-gradient">Acceso Peluqueros</h1>
        <p className="auth-subtitle">Ingresá para gestionar turnos</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="glass-input" required placeholder="admin@pelu.com" />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="glass-input" required placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>Ingresar</button>

          <div className="auth-forgot-link">
            <Link to="/staff/forgot-password">¿Olvidaste tu contraseña?</Link>
          </div>

          <div className="auth-bottom-text">
            ¿No tenés cuenta? <Link to="/staff/register">Registrate gratis</Link>
          </div>
        </form>

        <div className="auth-back-link">
          <Link to="/">← Volver a reservar turno</Link>
        </div>
      </div>
    </div>
  );
}
