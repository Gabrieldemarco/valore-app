import type { LayoutBlock } from './LandingTypes';

export const DEFAULT_LAYOUT: LayoutBlock[] = [
  { id: 'hero', type: 'hero', enabled: true },
  { id: 'servicios', type: 'services', enabled: true },
  { id: 'resenas', type: 'reviews', enabled: true },
  { id: 'galeria', type: 'gallery', enabled: true },
  { id: 'equipo', type: 'team', enabled: true },
  { id: 'reservar', type: 'booking', enabled: true },
  { id: 'hours', type: 'hours', enabled: true },
];

export const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
export const daysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
export const firstDayOfMonth = (m: number, y: number) => (new Date(y, m, 1).getDay() + 6) % 7;
