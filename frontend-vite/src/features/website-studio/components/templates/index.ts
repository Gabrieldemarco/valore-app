/* ============================================================
   Templates - Index Export
   ============================================================ */

export { ElegantTemplate, ELEGANT_TEMPLATE_CONFIG, ELEGANT_COLOR_SCHEMES } from './ElegantTemplate';
export { ModernTemplate, MODERN_TEMPLATE_CONFIG, MODERN_COLOR_SCHEMES } from './ModernTemplate';
export { MinimalTemplate, MINIMAL_TEMPLATE_CONFIG, MINIMAL_COLOR_SCHEMES } from './MinimalTemplate';

/* ============================================================
   Template Registry
   ============================================================ */

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  colorSchemes: Record<string, { name: string; primary: string; secondary: string }>;
  defaultColorScheme: string;
  blocks: string[];
  defaultBlocks: Array<{ type: string; order: number }>;
}

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  // These will be populated when templates are imported
};

export function registerTemplate(config: TemplateConfig) {
  // This would be called by each template on import
  console.log(`Template registered: ${config.id}`);
}

export const AVAILABLE_TEMPLATES = [
  { id: 'elegant', name: 'Elegante', description: 'Clásico y sofisticado con tipografía serif y acentos dorados' },
  { id: 'modern', name: 'Moderno', description: 'Minimalista y arquitectónico con tipografía geométrica' },
  { id: 'minimal', name: 'Minimal', description: 'Ultra-limpio y funcional, máxima legibilidad' },
] as const;

export type TemplateId = typeof AVAILABLE_TEMPLATES[number]['id'];