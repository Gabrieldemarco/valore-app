import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ThemeToggle from '../../components/ThemeToggle';

export default function PublicHeader() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const accessRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setAccessOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accessRef.current && !accessRef.current.contains(e.target as Node)) {
        setAccessOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <a href="/" className="logo">
          <span className="logo-monogram">V</span>
          <span className="logo-text">Velsoie</span>
        </a>
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="public-navigation"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav id="public-navigation" className={`nav-links${menuOpen ? ' is-open' : ''}`}>
          <a href="#salons" onClick={closeMenu} className="nav-link nav-link--upper">
            {t('publicIndex.navSalones')}
          </a>
          <a href="#pricing" onClick={closeMenu} className="nav-link nav-link--upper">
            {t('publicIndex.navPlanes')}
          </a>

          <div className="nav-access-dropdown" ref={accessRef}>
            <button
              type="button"
              className="nav-link nav-link--upper nav-access-trigger"
              aria-expanded={accessOpen}
              aria-haspopup="true"
              onClick={() => setAccessOpen(prev => !prev)}
            >
              {t('publicIndex.navAccess')}
              <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {accessOpen && (
              <div className="nav-access-menu" role="menu">
                <Link to="/client/login" role="menuitem" onClick={closeMenu}>
                  {t('publicIndex.navClientLogin')}
                </Link>
              </div>
            )}
          </div>

          <Link to="/staff/register" onClick={closeMenu} className="btn btn-secondary btn-outline nav-cta nav-cta--outline">
            {t('publicIndex.navSumate')}
          </Link>
          <Link to="/staff/login" onClick={closeMenu} className="btn btn-primary btn-studio-access nav-cta">
            {t('publicIndex.navStudioAccess')}
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
