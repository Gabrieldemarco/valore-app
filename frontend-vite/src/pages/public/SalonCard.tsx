import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fixImageUrl } from '../../utils/imageUtils';

export interface Salon {
  id: number;
  business_name: string;
  slug?: string;
  business_address?: string;
  landing_description?: string;
  brand_logo_url?: string;
  landing_hero_image?: string;
  services?: Array<{ name?: string } | string>;
  staff_names?: string[];
  lat?: number;
  lng?: number;
  distance?: number;
  category?: string;
}

function getInitials(name: string): string {
  if (!name) return 'AP';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// eslint-disable-next-line react-refresh/only-export-components
export function getGenderCategory(salon: Salon): 'hombre' | 'mujer' | 'unisex' {
  const name = (salon.business_name || '').toLowerCase();
  const desc = (salon.landing_description || '').toLowerCase();
  const services = (salon.services || []).map(s => typeof s === 'object' ? (s as { name?: string })?.name || '' : s).join(' ').toLowerCase();
  const allText = `${name} ${desc} ${services}`;
  const menKeywords = ['barber', 'barbería', 'barbero', 'afeitado', 'barba', 'caballero', 'hombre', 'men', 'beard', 'masculino', 'corte de hombre', 'corte masculino'];
  const womenKeywords = ['alisado', 'dama', 'mujer', 'peinado', 'color', 'tintura', 'uñas', 'nails', 'maquillaje', 'makeup', 'balayage', 'mechas', 'femenino', 'corte de dama', 'corte femenino'];
  const hasMen = menKeywords.some(kw => kw === 'men' ? /\bmen\b/.test(allText) : allText.includes(kw));
  const hasWomen = womenKeywords.some(kw => allText.includes(kw));
  if (hasMen && hasWomen) return 'unisex';
  if (hasMen) return 'hombre';
  if (hasWomen) return 'mujer';
  return 'unisex';
}

interface SalonCardProps {
  salon: Salon;
  defaultServices: string[];
}

export default function SalonCard({ salon, defaultServices }: SalonCardProps) {
  const { t } = useTranslation();
  const imageUrl = salon.brand_logo_url || salon.landing_hero_image;
  const services = salon.services || defaultServices;
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
