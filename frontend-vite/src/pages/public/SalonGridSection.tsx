import { useState, useEffect, type RefObject } from 'react';
import SalonCard, { type Salon } from './SalonCard';

interface SalonGridSectionProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  salons: Salon[];
  gridRef: RefObject<HTMLDivElement | null>;
  defaultServices: string[];
  dotCount: number;
  onDotClick: (idx: number) => void;
  headerStyle?: React.CSSProperties;
  showNewBadge?: boolean;
  variant?: 'default' | 'alt';
}

export default function SalonGridSection({
  eyebrow,
  title,
  subtitle,
  salons,
  gridRef,
  defaultServices,
  dotCount,
  onDotClick,
  headerStyle,
  showNewBadge = false,
  variant = 'default',
}: SalonGridSectionProps) {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || dotCount <= 1) return;

    const onScroll = () => {
      const card = el.querySelector<HTMLElement>('.salon-link');
      if (!card) return;
      const gap = 24;
      const step = card.offsetWidth + gap;
      const idx = Math.round(el.scrollLeft / step);
      setActiveDot(Math.max(0, Math.min(idx, dotCount - 1)));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [gridRef, dotCount, salons.length]);

  return (
    <section className={`salon-section-block${variant === 'alt' ? ' salon-section-block--alt' : ''}`}>
      <div className="section-header" style={headerStyle}>
        {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      <div className="salons-slider-container salons-slider-container--fade">
        <div className="salons-grid" ref={gridRef}>
          {salons.map(salon => (
            <SalonCard key={salon.id} salon={salon} defaultServices={defaultServices} showNewBadge={showNewBadge} />
          ))}
        </div>
      </div>
      {dotCount > 1 && (
        <div className="slider-pagination-dots" role="tablist" aria-label="Paginación de salones">
          {Array.from({ length: dotCount }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={activeDot === idx}
              className={`slider-dot${activeDot === idx ? ' active' : ''}`}
              onClick={() => onDotClick(idx)}
              aria-label={`Ir al grupo ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
