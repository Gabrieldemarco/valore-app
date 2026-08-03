import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Clock, DollarSign } from 'lucide-react';
import type { ServiceImage, ServiceItem } from './types';

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

interface BookingServiceAccordionProps {
  services: ServiceItem[];
  selectedService: number | null;
  fixImageUrl: (url: string | null | undefined) => string;
  onSelect: (id: number) => void;
  onOpenServiceLightbox?: (images: ServiceImage[], idx: number) => void;
}

const BookingServiceAccordion: React.FC<BookingServiceAccordionProps> = ({
  services,
  selectedService,
  fixImageUrl,
  onSelect,
  onOpenServiceLightbox,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
  const uncategorized: ServiceItem[] = [];

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
      const cat = s.category?.trim();
      if (cat) {
        if (!legacyCats[cat]) legacyCats[cat] = [];
        legacyCats[cat].push(s);
      } else {
        uncategorized.push(s);
      }
    }
  }

  const allGroups: { key: string; label: string; node: CatNode }[] = [];
  for (const node of catMap.values()) {
    if (node.name) allGroups.push({ key: `cat-${node.id}`, label: node.name, node });
  }
  for (const [catName, items] of Object.entries(legacyCats)) {
    allGroups.push({ key: `legacy-${catName}`, label: catName, node: { id: catName, name: catName, children: [], services: items } });
  }
  allGroups.sort((a, b) => a.label.localeCompare(b.label));

  const renderCard = (s: ServiceItem) => (
    <div key={s.id} className={`booking-service-card ${selectedService === s.id ? 'selected' : ''}`} onClick={() => onSelect(s.id)}>
      <div className="booking-service-card-image">
        {s.image && <div className="booking-service-image" style={{ backgroundImage: `url(${fixImageUrl(s.image)})` }} />}
        {s.images && s.images.length > 0 && (
          <div className="service-thumbnails">
            {s.images.slice(0, 3).map((img, i) => (
              <div key={img.id} className="service-thumb" onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], i); }}>
                <img src={fixImageUrl(img.url)} alt="" />
              </div>
            ))}
            {s.images.length > 3 && (
              <div className="service-thumb more" onClick={e => { e.stopPropagation(); onOpenServiceLightbox?.(s.images || [], 3); }}>
                <span>+{s.images.length - 3}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="booking-service-info">
        <div className="booking-service-name">{s.name}</div>
        <div className="booking-service-meta">
          <span className="booking-service-duration"><Clock size={14} /> {s.duration} {t('landingServices.minutes')}</span>
          <span className="booking-service-price"><DollarSign size={14} /> {t('landingServices.pricePrefix')}{formatPrice(s.price)}</span>
        </div>
        {s.description && <p className="service-description">{s.description}</p>}
        <button className="service-book-btn" onClick={e => { e.stopPropagation(); onSelect(s.id); }}>
          {t('landingServices.bookButton')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="services-accordion booking-accordion">
      {allGroups.map(group => {
        const isOpen = expanded.has(group.key);
        const node = group.node;
        return (
          <div key={group.key} className={`accordion-item ${isOpen ? 'open' : ''}`}>
            <button className="accordion-header" onClick={() => toggle(group.key)}>
              <ChevronRight size={16} className={`accordion-arrow ${isOpen ? 'rotated' : ''}`} />
              <span className="accordion-title">{group.label}</span>
              <span className="accordion-count">{node.services.length + node.children.reduce((s, c) => s + c.services.length, 0)}</span>
            </button>
            <div className={`accordion-body ${isOpen ? 'open' : ''}`}>
              <div className="accordion-body-inner">
                {node.children.length > 0 && (
                  <div className="booking-subcategories">
                    {node.children.map(sub => (
                      <div key={`sub-${sub.id}`} className="subcategory-group">
                        <h4 className="subcategory-title">{sub.name}</h4>
                        <div className="booking-services">{sub.services.map(renderCard)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {node.services.length > 0 && <div className="booking-services">{node.services.map(renderCard)}</div>}
              </div>
            </div>
          </div>
        );
      })}
      {uncategorized.length > 0 && (
        <div className="booking-services" style={{ marginTop: 16 }}>
          {uncategorized.map(renderCard)}
        </div>
      )}
    </div>
  );
};

export default BookingServiceAccordion;
