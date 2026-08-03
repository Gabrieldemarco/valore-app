export const CACHE_BUST = Date.now();

export function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return window.location.origin + url + '?v=' + CACHE_BUST;
  return url;
}

export const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23334155"/%3E%3Cg transform="translate(68 68) scale(2.6)" fill="none" stroke="%236366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/%3E%3Ccircle cx="12" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E';

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

export function extractEmbedSrc(value: string): string {
  const trimmed = value.trim();
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
  return srcMatch ? srcMatch[1] : trimmed;
}

export function buildIframeHtml(src: string): string {
  const clean = src.replace(/"/g, '&quot;');
  return `<iframe src="${clean}" width="100%" height="400" style="border:0" frameborder="0" allowfullscreen loading="lazy"></iframe>`;
}

export function isValidEmbedUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
