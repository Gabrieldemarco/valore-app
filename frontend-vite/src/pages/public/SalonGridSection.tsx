import { type RefObject } from 'react';
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
}

export default function SalonGridSection({ eyebrow, title, subtitle, salons, gridRef, defaultServices, dotCount, onDotClick, headerStyle }: SalonGridSectionProps) {
  return (
    <>
      <div className="section-header" style={headerStyle}>
        {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      <div className="salons-grid" ref={gridRef}>
        {salons.map(salon => (
          <SalonCard key={salon.id} salon={salon} defaultServices={defaultServices} />
        ))}
      </div>
      {dotCount > 1 && (
        <div className="slider-pagination-dots">
          {Array.from({ length: dotCount }).map((_, idx) => (
            <span key={idx} className="slider-dot" onClick={() => onDotClick(idx)}></span>
          ))}
        </div>
      )}
    </>
  );
}
