import { useTranslation } from 'react-i18next';
import { PLACEHOLDER_IMG } from '../../utils/imageUtils';

interface LandingHeroSectionProps {
  businessName: string;
  description: string | null;
  heroImage: string | null;
  logoUrl: string | null;
  fixImageUrl: (url: string | null | undefined) => string;
  category?: string;
}

const getCategoryLabel = (category: string, t: (key: string) => string): string => {
  const labels: Record<string, string> = {
    peluqueria: t('landingHero.categoryLabels.barber'),
    cejas: t('landingHero.categoryLabels.eyebrows'),
    uñas: t('landingHero.categoryLabels.nails'),
    maquillaje: t('landingHero.categoryLabels.makeup'),
    facial: t('landingHero.categoryLabels.facial'),
    depilacion: t('landingHero.categoryLabels.depilation'),
    masajes: t('landingHero.categoryLabels.massages'),
  };
  return labels[category] || category;
};

export default function LandingHeroSection({
  businessName,
  description,
  heroImage,
  logoUrl,
  fixImageUrl,
  category,
}: LandingHeroSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="hero">
      {heroImage && (
        <div
          className="hero-image"
          style={{ backgroundImage: `url(${fixImageUrl(heroImage)})` }}
        />
      )}
      <div className="hero-content">
        {logoUrl && (
          <img
            src={fixImageUrl(logoUrl)}
            alt={businessName}
            className="hero-logo"
            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
          />
        )}
        <h1>{businessName}</h1>
        {category && <span className="hero-category-badge">{getCategoryLabel(category, t)}</span>}
        {description && <p>{description}</p>}
        <a href="#reservar" className="btn btn-primary btn-lg">{t('landingHero.reserveButton')}</a>
        <div className="hero-trust">
          <span>{t('landingHero.trust1')}</span>
          <span>{t('landingHero.trust2')}</span>
        </div>
      </div>
    </div>
  );
}
