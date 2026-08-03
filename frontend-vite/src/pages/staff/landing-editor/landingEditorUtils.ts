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

export function normalizeEmbedUrl(input: string): string {
  const src = extractEmbedSrc(input);
  if (!src) return '';
  let url: URL;
  try { url = new URL(src); } catch { return src; }
  const host = url.hostname.toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1];
    return id ? `https://www.youtube.com/embed/${id}` : src;
  }
  if (host.includes('youtube.com')) {
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.split('/')[2];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (url.pathname.startsWith('/embed/')) return src;
  }

  if (host.includes('google.') && (url.pathname.startsWith('/maps') || host === 'maps.google.com')) {
    if (url.pathname.includes('/embed') || url.searchParams.get('output') === 'embed') return src;
    const at = src.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return `https://www.google.com/maps?q=${at[1]},${at[2]}&output=embed`;
    if (url.searchParams.get('q')) {
      url.searchParams.set('output', 'embed');
      return url.toString();
    }
  }

  if (host === 'instagram.com' || host === 'www.instagram.com') {
    const m = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (m) return `https://www.instagram.com/${m[1]}/${m[2]}/embed/`;
  }

  if (host.includes('facebook.com')) {
    if (url.pathname.includes('/posts/') || url.pathname.includes('/videos/') || url.pathname.includes('/photos/')) {
      return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(src)}`;
    }
  }

  if (host.includes('tiktok.com')) {
    const m = url.pathname.match(/^\/@[\w.-]+\/video\/(\d+)/);
    if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
  }

  return src;
}
