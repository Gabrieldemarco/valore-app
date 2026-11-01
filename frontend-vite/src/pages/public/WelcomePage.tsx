import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import WelcomePopup from '../../components/WelcomePopup';

export default function WelcomePage() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lngParam = params.get('lng');
    if (lngParam && ['es', 'en', 'pt'].includes(lngParam)) {
      localStorage.setItem('velsoie_ui_language', lngParam);
    }
  }, [location.search]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0c 0%, #1a130d 100%)',
    }}>
      <WelcomePopup forceShow={true} />
    </div>
  );
}
