import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PublicHeroProps {
  countryName: string;
}

export default function PublicHero({ countryName }: PublicHeroProps) {
  const { t } = useTranslation();

  return (
    <section className="hero hero--editorial hero--text-only">
      <div className="hero-content hero-content--text-only">
        <span className="hero-eyebrow">{t('publicIndex.heroEyebrow')}</span>
        <h1>{countryName ? t('publicIndex.heroTitle', { country: countryName }) : t('publicIndex.heroTitleNoCountry')}</h1>
        <p>{t('publicIndex.heroSubtitle')}</p>
        <div className="hero-actions">
          <a href="#treatment-categories" className="btn btn-accent hero-cta hero-cta--explore">
            {t('publicIndex.heroExploreServices')}
          </a>
          <Link to="/staff/register" className="hero-register-link">
            {t('publicIndex.registerSalon')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>

      <svg className="hero-ornament" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" aria-hidden="true">
        <path fill="none" stroke="url(#goldGradientHero)" strokeWidth="1.8" d="M0,128 C150,140 300,80 450,110 C600,140 750,280 900,260 C1050,240 1200,120 1350,150 L1440,160" />
        <path fill="none" stroke="url(#goldGradientHero)" strokeWidth="1.0" d="M0,180 C180,150 360,110 540,160 C720,210 900,310 1080,250 C1260,190 1380,120 1440,100" opacity="0.6" />
        <defs>
          <linearGradient id="goldGradientHero" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--gold-light)" />
          </linearGradient>
        </defs>
      </svg>
    </section>
  );
}
