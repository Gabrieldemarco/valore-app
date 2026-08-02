const CACHE_BUST = Date.now();

export const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23334155"/%3E%3Cg transform="translate(68 68) scale(2.6)" fill="none" stroke="%236366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/%3E%3Ccircle cx="12" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E';

export function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return url + '?v=' + CACHE_BUST;
  return url;
}
