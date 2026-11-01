import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const STORAGE_KEY = 'velsoie_welcome_popup_dismissed';

export default function WelcomePopup({ forceShow = false }: { forceShow?: boolean }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const showFromUrl = params.get('welcome') === 'true';
    const lngParam = params.get('lng');

    if (lngParam && ['es', 'en', 'pt'].includes(lngParam)) {
      i18n.changeLanguage(lngParam);
    }

    const dismissed = localStorage.getItem(STORAGE_KEY);

    if (forceShow || showFromUrl) {
      setVisible(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [location.search, forceShow]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const handleCta = () => {
    dismiss();
    navigate('/staff/register');
  };

  if (!visible) return null;

  return (
    <>
      <div className="velsoie-popup-overlay" onClick={dismiss}>
        <div className="velsoie-popup-card" onClick={e => e.stopPropagation()}>
          <button
            className="velsoie-popup-close"
            onClick={dismiss}
            aria-label={t('welcomePopup.closeLabel')}
          >
            <X size={18} />
          </button>

          <div className="velsoie-popup-header">
            <img
              src="/velso.png"
              alt="Velsoie"
              className="velsoie-popup-logo"
              style={{ width: '320px', maxWidth: '90%', height: 'auto' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <h2 className="velsoie-popup-subtitle">{t('welcomePopup.subtitle')}</h2>
          </div>

          <div className="velsoie-popup-body">
            <h1 className="velsoie-popup-title">{t('welcomePopup.title')}</h1>
            <p className="velsoie-popup-text">{t('welcomePopup.description')}</p>

            <div className="velsoie-popup-tags">
              {(t('welcomePopup.tags', { returnObjects: true }) as string[] || []).map((tag, i) => (
                <span key={i} className="velsoie-popup-tag">{tag}</span>
              ))}
            </div>

            <button
              className="velsoie-popup-cta"
              onClick={handleCta}
            >
              {t('welcomePopup.cta')}
            </button>

            <button className="velsoie-popup-dismiss" onClick={dismiss}>
              {t('welcomePopup.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
