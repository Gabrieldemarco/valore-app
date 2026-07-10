import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  mode: 'login' | 'register';
}

export default function GoogleLoginButton({ mode }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSuccess = async (response: any) => {
    try {
      const res: any = await api.post('/api/auth/google/token', { credential: response.credential });
      login(res.token, 'client', res.name || res.username || '', res.phone);
      if (res.phone) localStorage.setItem('clientPhone', res.phone);
      if (res.name) localStorage.setItem('clientDisplayName', res.name);
      navigate('/client/dashboard');
    } catch (err: any) {
      console.error('Google login error:', err);
    }
  };

  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.error('Google login failed')}
        text={mode === 'login' ? 'signin_with' : 'signup_with'}
        shape="rectangular"
        theme="outline"
        size="large"
      />
    </div>
  );
}
