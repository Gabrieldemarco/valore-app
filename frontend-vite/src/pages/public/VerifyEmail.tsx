import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token de verificación no encontrado.'); return; }
    api.post('/api/verify-email', { token })
      .then(() => { setStatus('success'); setMessage('Email verificado exitosamente. Ya puedes iniciar sesión.'); })
      .catch(err => { setStatus('error'); setMessage(err instanceof Error ? err.message : 'Error al verificar email.'); });
  }, [token]);

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', maxWidth: '450px', width: '100%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', textAlign: 'center' }}>
        {status === 'loading' && <><div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div><h2>Verificando email...</h2></>}
        {status === 'success' && <><div style={{ fontSize: 48, marginBottom: 16 }}>✅</div><h2>¡Email verificado!</h2><p style={{ color: '#166534', marginBottom: 16 }}>{message}</p><Link to="/client/login" style={{ background: '#667eea', color: 'white', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}>Iniciar sesión</Link></>}
        {status === 'error' && <><div style={{ fontSize: 48, marginBottom: 16 }}>❌</div><h2>Error</h2><p style={{ color: '#991b1b', marginBottom: 16 }}>{message}</p><p><Link to="/client/login" style={{ color: '#667eea' }}>Ir al inicio de sesión</Link></p></>}
      </div>
    </div>
  );
}
