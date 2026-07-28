import { useTranslation } from 'react-i18next';
import ScrollReveal from '../../components/ScrollReveal';
import { PLACEHOLDER_IMG } from '../../utils/imageUtils';

interface LandingGallerySectionProps {
  gallery: string[];
  fixImageUrl: (url: string | null | undefined) => string;
  onOpenLightbox: (index: number) => void;
}

export default function LandingGallerySection({ gallery, fixImageUrl, onOpenLightbox }: LandingGallerySectionProps) {
  const { t } = useTranslation();
  if (gallery.length === 0) return null;
  return (
    <>
      <ScrollReveal>
        <div className="section-divider" />
        <h2 className="section-title">{t('landing.galleryTitle')}</h2>
        <p className="section-subtitle">{t('landing.gallerySubtitle')}</p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <div className="gallery-grid">
          {gallery.map((g, i) => (
            <div key={i} className="gallery-item" onClick={() => onOpenLightbox(i)}>
              <img src={fixImageUrl(g)} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} loading="lazy" />
            </div>
          ))}
        </div>
      </ScrollReveal>
    </>
  );
}
