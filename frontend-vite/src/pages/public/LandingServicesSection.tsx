import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, DollarSign } from 'lucide-react';

interface ServiceImage {
  id: number;
  url: string;
  sort_order: number;
}

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number | string | null;
  category: string;
  category_id: number | null;
  category_name: string | null;
  category_parent_id: number | null;
  description: string | null;
  image: string | null;
  images?: ServiceImage[];
}

interface LandingServicesSectionProps {
  services: ServiceItem[];
  fixImageUrl: (url: string | null | undefined) => string;
  onSelectService?: (serviceId: number) => void;
  onOpenServiceLightbox?: (images: ServiceImage[], idx: number) => void;
}

interface CatNode {
  id: number | string;
  name: string;
  children: { id: number; name: string; services: ServiceItem[] }[];
  services: ServiceItem[];
}

const formatPrice = (p: number | string | null): string => {
  if (p === null || p === undefined) return '';
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
};

export default function LandingServicesSection({ services, fixImageUrl, onSelectService, onOpenServiceLightbox }: LandingServicesSectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (services.length === 0) return null;

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const catMap = new Map<number, CatNode>();
  const legacyCats: Record<string, ServiceItem[]> = {};

  for (const s of services) {
    if (s.category_id) {
      if (!catMap.has(s.category_id)) {
        catMap.set(s.category_id, { id: s.category_id, name: s.category_name || s.category, children: [], services: [] });
      }
      const node = catMap.get(s.category_id)!;
      const parentId = s.category_parent_id;
      if (parentId) {
        if (!catMap.has(parentId)) {
          catMap.set(parentId, { id: parentId, name: '', children: [], services: [] });
        }
        catMap.get(parentId)!.name = catMap.get(parentId)!.name || s.category_name || parentId.toString();
        let childGroup = node.children.find(c => c.id === s.category_id);
        if (!childGroup) {
          childGroup = { id: s.category_id, name: s.category_name || s.category, services: [] };
          node.children.push(childGroup);
        }
        childGroup.services.push(s);
      } else {
        node.services.push(s);
      }
    } else {
      const cat = s.category?.trim() || t('landingServices.otherCategory');
      if (!legacyCats[cat]) legacyCats[cat] = [];
      legacyCats[cat].push(s);
    }
  }

  const allGroups: { key: string; label: string; node: CatNode }[] = [];
  for (const node of catMap.values()) {
    if (node.name) allGroups.push({ key: `cat-${node.id}`, label: node.name, node });
  }
  for (const [catName, items] of Object.entries(legacyCats)) {
    allGroups.push({
      key: `legacy-${catName}`,
      label: catName,
      node: { id: catName, name: catName, children: [], services: items },
    });
  }

  allGroups.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h2 className="section-title">{t('landingServices.title')}</h2>
      <p className="section-subtitle">{t('landingServices.subtitle')}</p>
      <div className="services-accordion">
        {allGroups.map(group => {
          const isOpen = expanded.has(group.key);
          const node = group.node;
          const hasChildren = node.children.length > 0;
          const hasDirectServices = node.services.length > 0;

          return (
            <div key={group.key} className={`accordion-item ${isOpen ? 'open' : ''}`}>
              <button className="accordion-header" onClick={() => toggle(group.key)}>
                <ChevronRight size={18} className={`accordion-arrow ${isOpen ? 'rotated' : ''}`} />
                <span className="accordion-title">{group.label}</span>
                <span className="accordion-count">{node.services.length + node.children.reduce((s, c) => s + c.services.length, 0)}</span>
              </button>
              <div className={`accordion-body ${isOpen ? 'open' : ''}`}>
                <div className="accordion-body-inner">
                  {hasChildren && (
                    <div className="services-subcategories">
                      {node.children.map(sub => (
                        <div key={`sub-${sub.id}`} className="subcategory-group">
                          <h4 className="subcategory-title">{sub.name}</h4>
                          <div className="services-grid">
                            {sub.services.map(s => (
                              <div key={s.id} className="service-card"
                                onClick={() => onSelectService?.(s.id)}
                                style={{ cursor: onSelectService ? 'pointer' : 'default' }}>
                                {s.image && (
                                  <div className="service-image"
                                    style={{ backgroundImage: `url(${fixImageUrl(s.image)})` }} />
                                )}
                                {s.images && s.images.length > 0 && (
                                  <div className="service-thumbnails">
                                    {s.images.slice(0, 3).map((img, i) => (
                                      <div key={img.id} className="service-thumb"
                                        onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], i); }}>
                                        <img src={fixImageUrl(img.url)} alt="" />
                                      </div>
                                    ))}
                                    {s.images.length > 3 && (
                                      <div className="service-thumb more"
                                        onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], 3); }}>
                                        <span>+{s.images.length - 3}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="service-content">
                                  <h3 className="service-name">{s.name}</h3>
                                  <div className="service-meta">
                                    <span className="service-duration"><Clock size={14} /> {s.duration} {t('landingServices.minutes')}</span>
                                    <span className="service-price"><DollarSign size={14} /> {t('landingServices.pricePrefix')}{formatPrice(s.price)}</span>
                                  </div>
                                  {s.description && (
                                    <p className="service-description">{s.description}</p>
                                  )}
                                  {onSelectService && (
                                    <button className="service-book-btn"
                                      onClick={e => { e.stopPropagation(); onSelectService(s.id); }}>
                                      {t('landingServices.bookButton')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasDirectServices && (
                    <div className="services-grid">
                      {node.services.map(s => (
                        <div key={s.id} className="service-card"
                          onClick={() => onSelectService?.(s.id)}
                          style={{ cursor: onSelectService ? 'pointer' : 'default' }}>
                          {s.image && (
                            <div className="service-image"
                              style={{ backgroundImage: `url(${fixImageUrl(s.image)})` }} />
                          )}
                          {s.images && s.images.length > 0 && (
                            <div className="service-thumbnails">
                              {s.images.slice(0, 3).map((img, i) => (
                                <div key={img.id} className="service-thumb"
                                  onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], i); }}>
                                  <img src={fixImageUrl(img.url)} alt="" />
                                </div>
                              ))}
                              {s.images.length > 3 && (
                                <div className="service-thumb more"
                                  onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], 3); }}>
                                  <span>+{s.images.length - 3}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="service-content">
                            <h3 className="service-name">{s.name}</h3>
                            <div className="service-meta">
                              <span className="service-duration"><Clock size={14} /> {s.duration} {t('landingServices.minutes')}</span>
                              <span className="service-price"><DollarSign size={14} /> {t('landingServices.pricePrefix')}{formatPrice(s.price)}</span>
                            </div>
                            {s.description && (
                              <p className="service-description">{s.description}</p>
                            )}
                            {onSelectService && (
                              <button className="service-book-btn"
                                onClick={e => { e.stopPropagation(); onSelectService(s.id); }}>
                                {t('landingServices.bookButton')}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
