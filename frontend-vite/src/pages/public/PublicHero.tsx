import { useTranslation } from 'react-i18next';

interface PublicHeroProps {
  countryName: string;
  currentGenderFilter: string;
  onSelectGender: (filter: string) => void;
}

export default function PublicHero({ countryName, currentGenderFilter, onSelectGender }: PublicHeroProps) {
  const { t } = useTranslation();

  const handleFilter = (key: string) => {
    onSelectGender(key);
    document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="hero-unisex-collage">
        <div className="collage-card card-1" onClick={() => handleFilter('mujer')}>
          <img src="/uploads/velsoie_hero_model.png" alt={t('publicIndex.altFemale')} loading="lazy" />
          <div className="collage-label">
            <span className="collage-label-title">{t('publicIndex.salonCollection')}</span>
            <span className="collage-label-sub">{t('publicIndex.salonCollectionSub')}</span>
          </div>
        </div>
        <div className="collage-card card-2" onClick={() => handleFilter('hombre')}>
          <img src="/uploads/velsoie_gentleman_hero.png" alt={t('publicIndex.altMale')} loading="lazy" />
          <div className="collage-label">
            <span className="collage-label-title">{t('publicIndex.groomingCollection')}</span>
            <span className="collage-label-sub">{t('publicIndex.groomingCollectionSub')}</span>
          </div>
        </div>
      </div>

      <div className="hero-content">
        <h1>{countryName ? t('publicIndex.heroTitle', { country: countryName }) : t('publicIndex.heroTitleNoCountry')}</h1>
        <p>{t('publicIndex.heroSubtitle')}</p>
        <div className="gender-filter-bar">
          {[
            { key: 'all', label: () => t('publicIndex.filterAll') },
            { key: 'hombre', label: () => t('publicIndex.filterCaballeros') },
            { key: 'mujer', label: () => t('publicIndex.filterDamas') },
            { key: 'unisex', label: () => t('publicIndex.filterUnisex') },
          ].map(g => (
            <button
              key={g.key}
              className={`filter-btn${currentGenderFilter === g.key ? ' active' : ''}`}
              onClick={() => handleFilter(g.key)}
            >
              {g.label()}
            </button>
          ))}
        </div>
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" style={{ position: 'absolute', bottom: -50, right: -50, width: '65%', height: 'auto', opacity: 0.18, zIndex: 1, pointerEvents: 'none' }}>
        <path fill="none" stroke="url(#goldGradientHero)" strokeWidth="1.8" d="M0,128 C150,140 300,80 450,110 C600,140 750,280 900,260 C1050,240 1200,120 1350,150 L1440,160" />
        <path fill="none" stroke="url(#goldGradientHero)" strokeWidth="1.0" d="M0,180 C180,150 360,110 540,160 C720,210 900,310 1080,250 C1260,190 1380,120 1440,100" opacity="0.6" />
        <defs>
          <linearGradient id="goldGradientHero" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cfa86b" />
            <stop offset="100%" stopColor="#dfc293" />
          </linearGradient>
        </defs>
      </svg>
    </section>
  );
}
