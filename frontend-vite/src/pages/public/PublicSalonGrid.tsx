import { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fixImageUrl } from '../../utils/imageUtils';

interface Salon {
  id: number;
  business_name: string;
  slug?: string;
  business_address?: string;
  landing_description?: string;
  brand_logo_url?: string;
  landing_hero_image?: string;
  services?: Array<{ name?: string } | string>;
  distance?: number;
  category?: string;
}

interface CategorizedSalons {
  featured: Salon[];
  trending: Salon[];
  new: Salon[];
}

interface PublicSalonGridProps {
  categorizedSalons: CategorizedSalons;
  loading: boolean;
  error: string;
  filteredCount: number;
  getGenderCategory: (salon: Salon) => 'hombre' | 'mujer' | 'unisex';
  currentServiceFilter: string;
  searchQuery: string;
}

function getInitials(name: string): string {
  if (!name) return 'AP';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function SalonCard({ salon, t, getGenderCategory }: { salon: Salon; t: (key: string) => string; getGenderCategory: (s: Salon) => 'hombre' | 'mujer' | 'unisex' }) {
  const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
  const services = salon.services || [t('publicIndex.defaultService1'), t('publicIndex.defaultService2'), t('publicIndex.defaultService3')];
  const gender = getGenderCategory(salon);

  return (
    <Link to={`/p/${salon.slug}`} className="salon-link">
      <div className="salon-card glass-panel">
        <div className="salon-image-wrapper">
          {imageUrl
            ? <img src={fixImageUrl(imageUrl)} alt={salon.business_name} loading="lazy" width="400" height="300" />
            : <div className="salon-image-fallback"><span className="salon-initials">{getInitials(salon.business_name)}</span></div>
          }
          <span className="salon-badge">
            {gender === 'hombre' ? t('publicIndex.badgeCaballeros') : gender === 'mujer' ? t('publicIndex.badgeDamas') : t('publicIndex.badgeUnisex')}
          </span>
        </div>
        <div className="salon-content">
          <h3 className="salon-name text-gradient">{salon.business_name}</h3>
          <div className="salon-location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, stroke: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {salon.business_address || t('publicIndex.locationUnknown')}
            {salon.distance != null && (
              <span className="distance-badge">{salon.distance < 1 ? '< 1 km' : `${Math.round(salon.distance)} km`}</span>
            )}
          </div>
          <div className="salon-services">
            {services.slice(0, 3).map((s, i) => (
              <span key={i} className="service-tag">{typeof s === 'object' ? (s as { name?: string }).name : s}</span>
            ))}
          </div>
          <div className="salon-footer">
            <div className="salon-rating">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13, fill: 'var(--primary)', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              {t('publicIndex.ratingValue')} <small>({t('publicIndex.ratingLabel')})</small>
            </div>
            <span className="btn btn-primary">{t('publicIndex.reserveButton')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface SalonSectionProps {
  title: string;
  subtitle: string;
  salons: Salon[];
  t: (key: string) => string;
  getGenderCategory: (s: Salon) => 'hombre' | 'mujer' | 'unisex';
}

function SalonSection({ title, subtitle, salons, t, getGenderCategory }: SalonSectionProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const scrollToSalon = useCallback((idx: number) => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>('.salon-link');
    if (cards[idx]) cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, []);

  const getDotCount = useCallback(() => {
    if (!gridRef.current) return Math.min(salons.length, 10);
    const cardWidth = gridRef.current.querySelector<HTMLElement>('.salon-link')?.offsetWidth || 350;
    const containerWidth = gridRef.current.offsetWidth || 1200;
    const visible = Math.max(1, Math.floor(containerWidth / cardWidth));
    return Math.max(0, Math.ceil(salons.length / visible));
  }, [salons.length]);

  if (salons.length === 0) return null;

  return (
    <>
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      <div className="salons-grid" ref={gridRef}>
        {salons.map(salon => (
          <SalonCard key={salon.id} salon={salon} t={t} getGenderCategory={getGenderCategory} />
        ))}
      </div>
      <div className="slider-pagination-dots">
        {Array.from({ length: getDotCount() }).map((_, idx) => (
          <span key={idx} className="slider-dot" onClick={() => scrollToSalon(idx)}></span>
        ))}
      </div>
    </>
  );
}

export default function PublicSalonGrid({
  categorizedSalons,
  loading,
  error,
  filteredCount,
  getGenderCategory,
  currentServiceFilter,
  searchQuery,
}: PublicSalonGridProps) {
  const { t } = useTranslation();

  const serviceCategories: Record<string, string> = {
    cejas: 'Cejas & Pestañas',
    uñas: 'Manicura & Pedicura',
    maquillaje: 'Maquillaje',
    facial: 'Cuidado Facial',
    depilacion: 'Depilación',
    masajes: 'Masajes & Bienestar',
  };

  return (
    <main className="container salons-section" id="salons">
      {!loading && !error && categorizedSalons.featured.length > 0 && (
        <SalonSection
          title={t('publicIndex.featuredTitle')}
          subtitle={t('publicIndex.featuredSubtitle')}
          salons={categorizedSalons.featured}
          t={t}
          getGenderCategory={getGenderCategory}
        />
      )}

      {!loading && !error && categorizedSalons.trending.length > 0 && (
        <div style={{ marginTop: 60 }}>
          <SalonSection
            title={t('publicIndex.trendingTitle')}
            subtitle={t('publicIndex.trendingSubtitle')}
            salons={categorizedSalons.trending}
            t={t}
            getGenderCategory={getGenderCategory}
          />
        </div>
      )}

      {!loading && !error && categorizedSalons.new.length > 0 && (
        <div style={{ marginTop: 60 }}>
          <SalonSection
            title={t('publicIndex.newSalonsTitle')}
            subtitle={t('publicIndex.newSalonsSubtitle')}
            salons={categorizedSalons.new}
            t={t}
            getGenderCategory={getGenderCategory}
          />
        </div>
      )}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          {t('publicIndex.loadingSalons')}
        </div>
      )}
      {error && (
        <div className="empty-state glass-panel">
          <h3 className="text-gradient">{t('publicIndex.noConnection')}</h3>
          <p>{error}</p>
          <Link to="/staff/register" className="btn btn-accent">{t('publicIndex.registerSalon')}</Link>
        </div>
      )}
      {!loading && !error && filteredCount === 0 && (
        <div className="empty-state glass-panel" style={{ width: '100%' }}>
          <h3 className="text-gradient">
            {currentServiceFilter
              ? `No se encontraron establecimientos de ${serviceCategories[currentServiceFilter] || currentServiceFilter}`
              : searchQuery.trim()
                ? `No se encontraron resultados para "${searchQuery}"`
                : t('publicIndex.noSalonsFound')}
          </h3>
          <p>{t('publicIndex.noSalonsFoundHint')}</p>
        </div>
      )}
    </main>
  );
}
