import { type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface FeaturedService {
  id: number;
  name: string;
  price: number;
  duration: number;
  salon_name: string;
  slug: string;
  service_image?: string;
  salon_logo?: string;
}

interface FeaturedServicesSectionProps {
  title: string;
  subtitle: string;
  services: FeaturedService[];
  gridRef: RefObject<HTMLDivElement | null>;
}

export default function FeaturedServicesSection({ title, subtitle, services, gridRef }: FeaturedServicesSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleServiceClick = (slug: string) => {
    navigate(`/p/${slug}`);
  };

  return (
    <>
      <div className="section-header" style={{ marginTop: 60 }}>
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      <div className="services-sale-grid" ref={gridRef}>
        {services.map(service => (
          <div key={service.id} className="service-sale-card" onClick={() => handleServiceClick(service.slug)}>
            {service.service_image && (
              <img src={service.service_image} alt={service.name} className="service-sale-image" />
            )}
            {!service.service_image && service.salon_logo && (
              <img src={service.salon_logo} alt={service.salon_name} className="service-sale-image" />
            )}
            <div className="service-sale-content">
              <h3 className="service-sale-name">{service.name}</h3>
              <p className="service-sale-salon">{service.salon_name}</p>
              <div className="service-sale-price">
                <span className="price-prefix">{t('landingServices.pricePrefix')}</span>
                <span className="price-value">{service.price}</span>
              </div>
              {service.duration && (
                <span className="service-sale-duration">{service.duration} min</span>
              )}
              <div className="service-sale-footer">
                <span>{t('publicIndex.viewSalon')}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="service-sale-arrow">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 19 19 12 12 5"></polyline>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
