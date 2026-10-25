import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PublicFooterProps {
  appointmentsCount: number;
}

export default function PublicFooter({ appointmentsCount }: PublicFooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer-brand">
        <a href="/" className="footer-logo">
          <span className="logo-monogram">V</span>
          <span className="logo-text">Velsoie</span>
        </a>
        <p className="footer-tagline">{t('publicIndex.footerTagline')}</p>
      </div>

      <div className="footer-stats-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{t('publicIndex.appointmentsCounter', { count: appointmentsCount })}</span>
      </div>

      <p className="footer-cta">{t('publicIndex.footerCTA')}</p>

      <nav className="footer-nav" aria-label={t('publicIndex.footerNavLabel')}>
        <a href="#salons">{t('publicIndex.navSalones')}</a>
        <a href="#pricing">{t('publicIndex.navPlanes')}</a>
        <Link to="/staff/register">{t('publicIndex.navSumate')}</Link>
        <a href="mailto:soporte@velsoie.uy">{t('publicIndex.footerSupport')}</a>
      </nav>

      <div className="footer-legal">
        <Link to="/terms#terms">{t('publicIndex.termsLink')}</Link>
        <span className="footer-legal-sep" aria-hidden="true">|</span>
        <Link to="/terms#privacy">{t('publicIndex.privacyLink')}</Link>
        <span className="footer-legal-sep" aria-hidden="true">|</span>
        <Link to="/terms#cancellations">{t('publicIndex.cancellationPolicyLink')}</Link>
      </div>

      <p className="footer-copyright">{t('publicIndex.footerCopyright')}</p>
    </footer>
  );
}
