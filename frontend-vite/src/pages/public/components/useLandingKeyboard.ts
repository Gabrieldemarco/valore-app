import { useEffect } from 'react';

interface UseLandingKeyboardParams {
  lightboxIdx: number | null;
  setLightboxIdx: (v: number | ((prev: number | null) => number | null)) => void;
  serviceLightboxIdx: number | null;
  setServiceLightboxIdx: (v: number | ((prev: number | null) => number | null)) => void;
  galleryLength: number;
  serviceLightboxImagesLength: number;
}

export default function useLandingKeyboard(params: UseLandingKeyboardParams) {
  const { lightboxIdx, setLightboxIdx, serviceLightboxIdx, setServiceLightboxIdx, galleryLength, serviceLightboxImagesLength } = params;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightboxIdx(null); setServiceLightboxIdx(null); }
      if (lightboxIdx !== null) {
        if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null && i < galleryLength - 1 ? i + 1 : i);
        if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i);
      }
      if (serviceLightboxIdx !== null) {
        if (e.key === 'ArrowRight') setServiceLightboxIdx(i => i !== null && i < serviceLightboxImagesLength - 1 ? i + 1 : i);
        if (e.key === 'ArrowLeft') setServiceLightboxIdx(i => i !== null && i > 0 ? i - 1 : i);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, serviceLightboxIdx, galleryLength, serviceLightboxImagesLength, setLightboxIdx, setServiceLightboxIdx]);
}
