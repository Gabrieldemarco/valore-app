import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AboutVelsoieSection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <polyline points="8 14 11 17 16 12" />
        </svg>
      ),
      title: t('about.feature1Title'),
      desc: t('about.feature1Desc'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: t('about.feature2Title'),
      desc: t('about.feature2Desc'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      title: t('about.feature3Title'),
      desc: t('about.feature3Desc'),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 3h3a2 2 0 0 1 2 1.72c.13 1 .37 1.98.72 2.92a2 2 0 0 1-.45 2.11L7.09 10.9a16 16 0 0 0 6 6l1.17-1.17a2 2 0 0 1 2.11-.45c.94.35 1.92.59 2.92.72A2 2 0 0 1 21 18l.92 1.92z" />
        </svg>
      ),
      title: t('about.feature4Title'),
      desc: t('about.feature4Desc'),
    },
  ];

  return (
    <section className="about-velsoie-section">
      {/* Decorative gradient line */}
      <div className="about-velsoie-line" aria-hidden="true" />

      <div className="container about-velsoie-container">
        {/* Left: text content */}
        <div className="about-velsoie-content">
          <span className="about-eyebrow">{t('about.eyebrow')}</span>
          <h2 className="about-title">{t('about.title')}</h2>
          <p className="about-lead">{t('about.lead')}</p>

          <ul className="about-features-list" role="list">
            {features.map((f, i) => (
              <li key={i} className="about-feature-item">
                <div className="about-feature-icon" aria-hidden="true">
                  {f.icon}
                </div>
                <div>
                  <strong className="about-feature-title">{f.title}</strong>
                  <p className="about-feature-desc">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link to="/staff/register" className="about-cta-btn">
            {t('about.cta')}
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        {/* Right: agenda mockup image */}
        <div className="about-velsoie-visual">
          <div className="about-mockup-wrapper">
            <div className="about-mockup-glow" aria-hidden="true" />
            <img
              src="/velsoie_agenda_mockup.jpg"
              alt={t('about.mockupAlt')}
              className="about-mockup-img"
              loading="lazy"
            />
            {/* Floating badge */}
            <div className="about-mockup-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{t('about.badgeText')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
