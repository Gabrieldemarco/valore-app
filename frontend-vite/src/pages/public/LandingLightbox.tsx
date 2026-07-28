import { PLACEHOLDER_IMG, fixImageUrl } from '../../utils/imageUtils';

interface LandingLightboxProps {
  images: (string | { url: string })[];
  currentIndex: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function LandingLightbox({ images, currentIndex, onClose, onPrev, onNext }: LandingLightboxProps) {

  if (currentIndex === null || images.length === 0) return null;

  const getSrc = (img: string | { url: string }) => (typeof img === 'string' ? img : img.url);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>&times;</button>
      <button className="lightbox-prev" onClick={e => { e.stopPropagation(); onPrev(); }}>&lsaquo;</button>
      <img
        src={fixImageUrl(getSrc(images[currentIndex]))}
        alt=""
        className="lightbox-image"
        onClick={e => e.stopPropagation()}
        onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
      />
      <button className="lightbox-next" onClick={e => { e.stopPropagation(); onNext(); }}>&rsaquo;</button>
      <div className="lightbox-counter">{currentIndex + 1} / {images.length}</div>
    </div>
  );
}
