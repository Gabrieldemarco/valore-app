interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number | string | null;
  image: string | null;
}

interface LandingServicesSectionProps {
  services: ServiceItem[];
  fixImageUrl: (url: string | null | undefined) => string;
}

export default function LandingServicesSection({ services, fixImageUrl }: LandingServicesSectionProps) {
  if (services.length === 0) return null;

  return (
    <section id="servicios">
      <h2 className="section-title">Servicios</h2>
      <p className="section-subtitle">Elegí el servicio que mejor se adapte a vos</p>
      <div className="services-grid">
        {services.map(s => (
          <div key={s.id} className="service-card">
            {s.image && (
              <div
                className="service-image"
                style={{ backgroundImage: `url(${fixImageUrl(s.image)})`, height: 180 }}
              />
            )}
            <div className="service-content">
              <h3 className="service-name">{s.name}</h3>
              <div className="service-meta">
                <span className="service-duration">{s.duration} min</span>
                <span className="service-price">${s.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
