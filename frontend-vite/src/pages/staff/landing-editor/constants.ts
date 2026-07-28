import type { LayoutBlock } from './types';

export const DEFAULT_HOURS = { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] };
export const DEBOUNCE_MS = 500;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const CSS_FORBIDDEN_PATTERNS = ['javascript:', 'behavior:', 'expression('];

export function getDefaultLayout(): LayoutBlock[] {
  return [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'servicios', type: 'services', enabled: true },
    { id: 'galeria', type: 'gallery', enabled: true },
    { id: 'equipo', type: 'team', enabled: true },
    { id: 'reservar', type: 'booking', enabled: true },
    { id: 'hours', type: 'hours', enabled: true },
  ];
}
