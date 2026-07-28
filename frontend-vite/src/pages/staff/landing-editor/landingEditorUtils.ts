export const CACHE_BUST = Date.now();

export function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return window.location.origin + url + '?v=' + CACHE_BUST;
  return url;
}

export const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

export const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export const FONT_OPTIONS = [
  { value: 'system', label: 'Sistema (predeterminada)' },
  { value: 'Playfair Display', label: 'Playfair Display (serif)' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (sans-serif)' },
  { value: 'Inter', label: 'Inter (sans-serif)' },
  { value: 'Poppins', label: 'Poppins (sans-serif)' },
  { value: 'Roboto', label: 'Roboto (sans-serif)' },
  { value: 'Lora', label: 'Lora (serif)' },
  { value: 'Merriweather', label: 'Merriweather (serif)' },
  { value: 'Montserrat', label: 'Montserrat (sans-serif)' },
  { value: 'Open Sans', label: 'Open Sans (sans-serif)' },
  { value: 'Raleway', label: 'Raleway (sans-serif)' },
  { value: 'DM Sans', label: 'DM Sans (sans-serif)' },
  { value: 'DM Serif Display', label: 'DM Serif Display (serif)' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond (serif)' },
  { value: 'Josefin Sans', label: 'Josefin Sans (sans-serif)' },
  { value: 'Quicksand', label: 'Quicksand (sans-serif)' },
  { value: 'Bodoni Moda', label: 'Bodoni Moda (serif)' },
  { value: 'Abril Fatface', label: 'Abril Fatface (display)' },
  { value: 'Archivo Black', label: 'Archivo Black (display)' },
  { value: 'Bebas Neue', label: 'Bebas Neue (display)' },
];

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (Portada)',
  servicios: 'Servicios',
  galeria: 'Galería',
  equipo: 'Equipo',
  reservar: 'Reserva de Turnos',
  hours: 'Horarios de Atención',
};
