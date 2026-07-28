import { useTranslation } from 'react-i18next';

export default function HowItWorksSection() {
  const { t } = useTranslation();
  return (
    <section className="container features-section">
      <div className="section-header">
        <h2 className="section-title">{t('publicIndex.howItWorksTitle')}</h2>
        <p className="section-subtitle">{t('publicIndex.howItWorksSubtitle')}</p>
      </div>
      <div className="features-grid">
        <div className="feature-card glass-panel">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3>{t('publicIndex.step1Title')}</h3>
          <p>{t('publicIndex.step1Desc')}</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
              <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
              <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3>{t('publicIndex.step2Title')}</h3>
          <p>{t('publicIndex.step2Desc')}</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <polyline points="8 14 11 17 16 12"></polyline>
            </svg>
          </div>
          <h3>{t('publicIndex.step3Title')}</h3>
          <p>{t('publicIndex.step3Desc')}</p>
        </div>
      </div>
    </section>
  );
}
