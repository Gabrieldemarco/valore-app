const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

interface LandingHeroSectionProps {
  businessName: string;
  description: string | null;
  heroImage: string | null;
  logoUrl: string | null;
  fixImageUrl: (url: string | null | undefined) => string;
}

export default function LandingHeroSection({
  businessName,
  description,
  heroImage,
  logoUrl,
  fixImageUrl,
}: LandingHeroSectionProps) {
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
        {description && <p>{description}</p>}
        <a href="#reservar" className="btn btn-primary btn-lg">Reservar turno</a>
        <div className="hero-trust">
          <span>Atención personalizada</span>
          <span>Resultados garantizados</span>
        </div>
      </div>
    </section>
  );
}
