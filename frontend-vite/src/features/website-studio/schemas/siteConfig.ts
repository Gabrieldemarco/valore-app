import { z } from 'zod';

/* ============================================================
   Theme / Design Tokens
   ============================================================ */

export const ThemeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1a1a2e'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#cfa86b'),
  fontHeading: z.string().default('Playfair Display'),
  fontBody: z.string().default('Inter'),
  radius: z.enum(['none', 'sm', 'md', 'lg']).default('md'),
});

export type Theme = z.infer<typeof ThemeSchema>;

/* ============================================================
   Block Configurations
   ============================================================ */

// Base block that all blocks extend
export const BaseBlockSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  order: z.number().int().nonnegative(),
  enabled: z.boolean().default(true),
});

// Hero Block
export const HeroBlockSchema = BaseBlockSchema.extend({
  type: z.literal('hero'),
  backgroundImage: z.string().url().or(z.string().startsWith('/')).optional(),
  backgroundOverlay: z.number().min(0).max(1).default(0.4),
  headline: z.string().max(80).default(''),
  subheadline: z.string().max(160).default(''),
  ctaText: z.string().max(30).default('Reservar cita'),
  ctaLink: z.string().default('/book'),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
  minHeight: z.number().default(600),
});

// Gallery Block
export const GalleryBlockSchema = BaseBlockSchema.extend({
  type: z.literal('gallery'),
  title: z.string().max(60).default('Nuestros trabajos'),
  subtitle: z.string().max(120).default(''),
  images: z.array(z.object({
    url: z.string().url().or(z.string().startsWith('/')),
    alt: z.string().max(120).default(''),
    category: z.string().max(30).optional(),
  })).default([]),
  layout: z.enum(['grid', 'masonry', 'carousel']).default('grid'),
  columns: z.number().int().min(2).max(4).default(3),
  showCategoryFilter: z.boolean().default(true),
});

// Services Block
export const ServicesBlockSchema = BaseBlockSchema.extend({
  type: z.literal('services'),
  title: z.string().max(60).default('Servicios'),
  subtitle: z.string().max(120).default(''),
  // If empty, pulls from tenant's services table
  serviceIds: z.array(z.number().int()).default([]),
  displayMode: z.enum(['cards', 'list', 'accordion']).default('cards'),
  showPrices: z.boolean().default(true),
  showDuration: z.boolean().default(true),
  ctaText: z.string().max(30).default('Ver todos'),
  ctaLink: z.string().default('/services'),
});

// About Block
export const AboutBlockSchema = BaseBlockSchema.extend({
  type: z.literal('about'),
  title: z.string().max(60).default('Sobre nosotros'),
  subtitle: z.string().max(120).default(''),
  content: z.string().max(2000).default(''),
  image: z.string().url().or(z.string().startsWith('/')).optional(),
  imagePosition: z.enum(['left', 'right']).default('left'),
  stats: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).default([]),
});

// Team Block
export const TeamBlockSchema = BaseBlockSchema.extend({
  type: z.literal('team'),
  title: z.string().max(60).default('Nuestro equipo'),
  subtitle: z.string().max(120).default(''),
  // If empty, pulls from tenant's staff table
  staffIds: z.array(z.number().int()).default([]),
  layout: z.enum(['grid', 'carousel', 'list']).default('grid'),
  showSocial: z.boolean().default(false),
});

// Contact Block
export const ContactBlockSchema = BaseBlockSchema.extend({
  type: z.literal('contact'),
  title: z.string().max(60).default('Contacto'),
  subtitle: z.string().max(120).default(''),
  showMap: z.boolean().default(true),
  address: z.string().max(200).default(''),
  phone: z.string().max(30).default(''),
  email: z.string().email().optional(),
  whatsapp: z.string().max(30).optional(),
  instagram: z.string().max(50).optional(),
  facebook: z.string().max(50).optional(),
  hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean().default(false),
  })).optional(),
});

// CTA Block
export const CtaBlockSchema = BaseBlockSchema.extend({
  type: z.literal('cta'),
  headline: z.string().max(80).default('¿Listo para tu nuevo look?'),
  subheadline: z.string().max(160).default('Reserva tu cita online en segundos'),
  primaryCtaText: z.string().max(30).default('Reservar ahora'),
  primaryCtaLink: z.string().default('/book'),
  secondaryCtaText: z.string().max(30).optional(),
  secondaryCtaLink: z.string().optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundImage: z.string().url().or(z.string().startsWith('/')).optional(),
});

// Reviews Block
export const ReviewsBlockSchema = BaseBlockSchema.extend({
  type: z.literal('reviews'),
  title: z.string().max(60).default('Lo que dicen nuestros clientes'),
  reviews: z.array(z.object({
    author: z.string(),
    rating: z.number().min(1).max(5),
    text: z.string(),
    date: z.string(),
    service: z.string().optional(),
  })).default([]),
  layout: z.enum(['carousel', 'grid']).default('carousel'),
});

// Union of all block types
export const BlockSchema = z.discriminatedUnion('type', [
  HeroBlockSchema,
  GalleryBlockSchema,
  ServicesBlockSchema,
  AboutBlockSchema,
  TeamBlockSchema,
  ContactBlockSchema,
  CtaBlockSchema,
  ReviewsBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
export type HeroBlock = z.infer<typeof HeroBlockSchema>;
export type GalleryBlock = z.infer<typeof GalleryBlockSchema>;
export type ServicesBlock = z.infer<typeof ServicesBlockSchema>;
export type AboutBlock = z.infer<typeof AboutBlockSchema>;
export type TeamBlock = z.infer<typeof TeamBlockSchema>;
export type ContactBlock = z.infer<typeof ContactBlockSchema>;
export type CtaBlock = z.infer<typeof CtaBlockSchema>;
export type ReviewsBlock = z.infer<typeof ReviewsBlockSchema>;

/* ============================================================
   Site Configuration
   ============================================================ */

export const SiteConfigSchema = z.object({
  // Metadata
  version: z.string().default('1.0.0'),
  tenantId: z.number().int().positive(),
  template: z.enum(['elegant', 'modern', 'minimal']).default('elegant'),
  
  // Theme
  theme: ThemeSchema.default({
    primary: '#1a1a2e',
    secondary: '#cfa86b',
    fontHeading: 'Playfair Display',
    fontBody: 'Inter',
    radius: 'md',
  }),
  
  // Blocks in render order
  blocks: z.array(BlockSchema).default([]),
  
  // SEO
  seo: z.object({
    title: z.string().max(60).default(''),
    description: z.string().max(160).default(''),
    ogImage: z.string().url().optional(),
    favicon: z.string().url().optional(),
  }).default({ title: '', description: '', ogImage: undefined, favicon: undefined }),
  
  // Publication state
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/* ============================================================
   Default / Empty Config Factory
   ============================================================ */

export function createEmptySiteConfig(tenantId: number): SiteConfig {
  return {
    version: '1.0.0',
    tenantId,
    template: 'elegant',
    theme: {
      primary: '#1a1a2e',
      secondary: '#cfa86b',
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
      radius: 'md',
    },
    blocks: [],
    seo: { title: '', description: '', ogImage: undefined, favicon: undefined },
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Makes saved/legacy configurations safe for the renderer. Older drafts may
 * contain blocks with only an id/type or even null entries; the public site
 * must still render while those drafts are being edited.
 */
export function normalizeSiteConfig(input: unknown, tenantId = 1): SiteConfig {
  const candidate = (input && typeof input === 'object' ? input : {}) as Partial<SiteConfig> & { blocks?: unknown[]; theme?: Partial<Theme>; seo?: Partial<SiteConfig['seo']> };
  const template = candidate.template === 'modern' || candidate.template === 'minimal' ? candidate.template : 'elegant';
  const base = createEmptySiteConfig(Number(candidate.tenantId) > 0 ? Number(candidate.tenantId) : tenantId);
  const preset = TEMPLATE_PRESETS[template];
  const defaultBlocks = (preset.blocks || []) as Block[];
  const defaultsByType = new Map(defaultBlocks.map(block => [block.type, block]));
  const rawBlocks: unknown[] = Array.isArray(candidate.blocks) ? candidate.blocks as unknown[] : [];
  const blocks = rawBlocks
    .filter((block): block is Record<string, unknown> => !!block && typeof block === 'object' && typeof (block as Record<string, unknown>).type === 'string')
    .map((block, index) => {
      const fallback = defaultsByType.get(block.type as Block['type']);
      if (!fallback) return null;
      return {
        ...fallback,
        ...block,
        id: typeof block.id === 'string' && block.id ? block.id : fallback.id || makeBlockId(),
        order: Number.isFinite(Number(block.order)) ? Number(block.order) : index,
        enabled: block.enabled !== false,
      } as Block;
    })
    .filter((block): block is Block => block !== null);

  return {
    ...base,
    ...candidate,
    tenantId: base.tenantId,
    template,
    theme: { ...base.theme, ...(candidate.theme || {}) } as Theme,
    blocks: blocks.length ? blocks : defaultBlocks.map(block => ({ ...block })),
    seo: { ...base.seo, ...(candidate.seo || {}) },
    status: candidate.status === 'published' || candidate.status === 'archived' ? candidate.status : 'draft',
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : base.updatedAt,
  };
}

function makeBlockId(): string {
  return globalThis.crypto?.randomUUID?.() || `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ============================================================
   Template Presets (starting configs for each template)
   ============================================================ */

export const TEMPLATE_PRESETS: Record<string, Partial<SiteConfig>> = {
  elegant: {
    template: 'elegant',
    theme: {
      primary: '#1a1a2e',
      secondary: '#cfa86b',
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
      radius: 'md',
    },
    blocks: [
      { id: crypto.randomUUID(), type: 'hero', order: 0, enabled: true, headline: '', subheadline: '', ctaText: 'Reservar cita', ctaLink: '/book', textAlign: 'center', minHeight: 600, backgroundOverlay: 0.4 },
      { id: crypto.randomUUID(), type: 'about', order: 1, enabled: true, title: 'Sobre nosotros', subtitle: '', content: '', imagePosition: 'left', stats: [] },
      { id: crypto.randomUUID(), type: 'services', order: 2, enabled: true, title: 'Servicios', subtitle: '', serviceIds: [], displayMode: 'cards', showPrices: true, showDuration: true, ctaText: 'Ver todos', ctaLink: '/services' },
      { id: crypto.randomUUID(), type: 'gallery', order: 3, enabled: true, title: 'Nuestros trabajos', subtitle: '', images: [], layout: 'grid', columns: 3, showCategoryFilter: true },
      { id: crypto.randomUUID(), type: 'team', order: 4, enabled: true, title: 'Nuestro equipo', subtitle: '', staffIds: [], layout: 'grid', showSocial: false },
      { id: crypto.randomUUID(), type: 'reviews', order: 5, enabled: true, title: 'Lo que dicen nuestros clientes', reviews: [], layout: 'carousel' },
      { id: crypto.randomUUID(), type: 'contact', order: 6, enabled: true, title: 'Contacto', subtitle: '', showMap: true, address: '', phone: '' },
      { id: crypto.randomUUID(), type: 'cta', order: 7, enabled: true, headline: '¿Listo para tu nuevo look?', subheadline: 'Reserva tu cita online en segundos', primaryCtaText: 'Reservar ahora', primaryCtaLink: '/book' },
    ],
  },
  modern: {
    template: 'modern',
    theme: {
      primary: '#0f0f0f',
      secondary: '#ffffff',
      fontHeading: 'Space Grotesk',
      fontBody: 'DM Sans',
      radius: 'none',
    },
    blocks: [
      { id: crypto.randomUUID(), type: 'hero', order: 0, enabled: true, headline: '', subheadline: '', ctaText: 'Reservar', ctaLink: '/book', textAlign: 'left', minHeight: 500, backgroundOverlay: 0.5 },
      { id: crypto.randomUUID(), type: 'services', order: 1, enabled: true, title: 'Servicios', subtitle: '', serviceIds: [], displayMode: 'list', showPrices: true, showDuration: true, ctaText: 'Ver todos', ctaLink: '/services' },
      { id: crypto.randomUUID(), type: 'gallery', order: 2, enabled: true, title: 'Portfolio', subtitle: '', images: [], layout: 'masonry', columns: 3, showCategoryFilter: true },
      { id: crypto.randomUUID(), type: 'team', order: 3, enabled: true, title: 'Equipo', subtitle: '', staffIds: [], layout: 'carousel', showSocial: false },
      { id: crypto.randomUUID(), type: 'cta', order: 4, enabled: true, headline: 'Tu estilo empieza aquí', subheadline: 'Reserva tu cita online en segundos', primaryCtaText: 'Reservar', primaryCtaLink: '/book' },
      { id: crypto.randomUUID(), type: 'contact', order: 5, enabled: true, title: 'Contacto', subtitle: '', showMap: true, address: '', phone: '' },
    ],
  },
  minimal: {
    template: 'minimal',
    theme: {
      primary: '#111111',
      secondary: '#666666',
      fontHeading: 'IBM Plex Sans',
      fontBody: 'IBM Plex Sans',
      radius: 'sm',
    },
    blocks: [
      { id: crypto.randomUUID(), type: 'hero', order: 0, enabled: true, headline: '', subheadline: '', ctaText: 'Reservar', ctaLink: '/book', textAlign: 'center', minHeight: 400, backgroundOverlay: 0.3 },
      { id: crypto.randomUUID(), type: 'services', order: 1, enabled: true, title: 'Servicios', subtitle: '', serviceIds: [], displayMode: 'cards', showPrices: true, showDuration: true, ctaText: 'Ver todos', ctaLink: '/services' },
      { id: crypto.randomUUID(), type: 'about', order: 2, enabled: true, title: 'Nosotros', subtitle: '', content: '', imagePosition: 'left', stats: [] },
      { id: crypto.randomUUID(), type: 'contact', order: 3, enabled: true, title: 'Contacto', subtitle: '', showMap: true, address: '', phone: '' },
    ],
  },
};
