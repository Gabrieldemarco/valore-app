import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

import '../../styles/auth.css';

export default function StaffRegister() {
  const [form, setForm] = useState({ businessName: '', email: '', password: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    }
  };

  if (success) {
    return (
      <div className="auth-body">
        <div className="auth-card glass-panel">
          <h2 className="text-gradient">Registro exitoso</h2>
          <p className="auth-subtitle">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-body">
      <div className="auth-card glass-panel">
        <h2 className="text-gradient">Crear tu Cuenta</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre de la Peluquería</label>
            <input name="businessName" value={form.businessName} onChange={handleChange} className="glass-input" required placeholder="Ej: Estilo Único" />
          </div>

          <div className="form-group">
            <label>Email de Acceso</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="glass-input" required placeholder="tu@email.com" />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="glass-input" required placeholder="Mínimo 6 caracteres" />
          </div>

          <div className="form-group">
            <label>Teléfono (Opcional)</label>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange} className="glass-input" placeholder="+54 9 11..." />
          </div>

          <div className="form-group">
            <label>Dirección (Opcional)</label>
            <input name="address" value={form.address} onChange={handleChange} className="glass-input" placeholder="Av. Siempre Viva 123" />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 20 }}>
            <input type="checkbox" id="acceptTerms" required style={{ marginTop: 3, cursor: 'pointer', accentColor: 'var(--primary)', width: 'auto', height: 'auto' }} />
            <label htmlFor="acceptTerms" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', fontWeight: 400, marginBottom: 0 }}>
              Acepto los <Link to="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Términos y Condiciones</Link>, la <Link to="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Política de Privacidad</Link> y la <Link to="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Política de Cancelaciones</Link> de Velsoie.
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 10 }}>Crear Cuenta</button>
        </form>

        <div className="auth-bottom-text">
          ¿Ya tenés cuenta? <Link to="/staff/login">Iniciá sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}
