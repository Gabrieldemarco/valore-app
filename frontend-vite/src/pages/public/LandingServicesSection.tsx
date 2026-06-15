import { useTranslation } from 'react-i18next';

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
  onSelectService?: (serviceId: number) => void;
}

export default function LandingServicesSection({ services, fixImageUrl, onSelectService }: LandingServicesSectionProps) {
  const { t } = useTranslation();
  if (services.length === 0) return null;

  return (
    <section id="servicios">
      <h2 className="section-title">{t('landingServices.title')}</h2>
      <p className="section-subtitle">{t('landingServices.subtitle')}</p>
      <div className="services-grid">
        {services.map(s => (
          <div 
            key={s.id} 
            className="service-card"
            onClick={() => onSelectService?.(s.id)}
            style={{ cursor: onSelectService ? 'pointer' : 'default' }}
          >
            {s.image && (
              <div
                className="service-image"
                style={{ backgroundImage: `url(${fixImageUrl(s.image)})`, height: 180 }}
              />
            )}
            <div className="service-content">
              <h3 className="service-name">{s.name}</h3>
              <div className="service-meta">
                <span className="service-duration">{s.duration} {t('landingServices.minutes')}</span>
                <span className="service-price">{t('landingServices.pricePrefix')}{s.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
