import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ThemeToggle from '../../components/ThemeToggle';

export default function PublicHeader() {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="header-content">
        <a href="/" className="logo">
          <span className="logo-monogram">V</span>
          <span className="logo-text">Velsoie</span>
        </a>
        <nav className="nav-links">
          <a href="#salons" style={{ fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 13 }}>
            {t('publicIndex.navSalones')}
          </a>
          <Link to="/staff/register" className="btn btn-secondary btn-outline" style={{ padding: '8px 18px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11 }}>
            {t('publicIndex.navSumate')}
          </Link>
          <Link to="/staff/login" className="btn btn-primary btn-studio-access" style={{ padding: '10px 24px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11 }}>
            {t('publicIndex.navStudioAccess')}
          </Link>
          <Link to="/client/login" className="btn btn-secondary" style={{ padding: '8px 18px', borderRadius: 30, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}>
            {t('publicIndex.navClientLogin')}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
