import { useTranslation } from 'react-i18next';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

interface LandingHeroSectionProps {
  businessName: string;
  description: string | null;
  heroImage: string | null;
  logoUrl: string | null;
  fixImageUrl: (url: string | null | undefined) => string;
  category?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  peluqueria: 'Peluquería / Barbería',
  cejas: 'Cejas & Pestañas',
  uñas: 'Manicura & Pedicura',
  maquillaje: 'Maquillaje',
  facial: 'Cuidado Facial',
  depilacion: 'Depilación',
  masajes: 'Masajes & Bienestar',
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
    <section className="hero">
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
        {category && <span className="hero-category-badge">{CATEGORY_LABELS[category] || category}</span>}
        {description && <p>{description}</p>}
        <a href="#reservar" className="btn btn-primary btn-lg">{t('landingHero.reserveButton')}</a>
        <div className="hero-trust">
          <span>{t('landingHero.trust1')}</span>
          <span>{t('landingHero.trust2')}</span>
        </div>
      </div>
    </section>
  );
}
