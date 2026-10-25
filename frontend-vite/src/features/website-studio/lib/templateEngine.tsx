import React from 'react';
import { SiteConfigSchema } from '../schemas/siteConfig';
import type { SiteConfig, Block, HeroBlock, GalleryBlock, ServicesBlock, AboutBlock, TeamBlock, ContactBlock, CtaBlock, ReviewsBlock } from '../schemas/siteConfig';

// Re-export types for convenience
export type { SiteConfig, Block, HeroBlock, GalleryBlock, ServicesBlock, AboutBlock, TeamBlock, ContactBlock, CtaBlock, ReviewsBlock };

/* ============================================================
   Type Guards
   ============================================================ */

export function isHeroBlock(block: Block): block is HeroBlock {
  return block.type === 'hero';
}

export function isGalleryBlock(block: Block): block is GalleryBlock {
  return block.type === 'gallery';
}

export function isServicesBlock(block: Block): block is ServicesBlock {
  return block.type === 'services';
}

export function isAboutBlock(block: Block): block is AboutBlock {
  return block.type === 'about';
}

export function isTeamBlock(block: Block): block is TeamBlock {
  return block.type === 'team';
}

export function isContactBlock(block: Block): block is ContactBlock {
  return block.type === 'contact';
}

export function isCtaBlock(block: Block): block is CtaBlock {
  return block.type === 'cta';
}

export function isReviewsBlock(block: Block): block is ReviewsBlock {
  return block.type === 'reviews';
}

/* ============================================================
   CSS Variable Generator
   ============================================================ */

export function generateThemeCSS(theme: SiteConfig['theme']): string {
  const radiusMap = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '16px',
  };

  return `
    --ws-primary: ${theme.primary};
    --ws-secondary: ${theme.secondary};
    --ws-font-heading: '${theme.fontHeading}', serif;
    --ws-font-body: '${theme.fontBody}', sans-serif;
    --ws-radius: ${radiusMap[theme.radius]};
    --ws-radius-sm: calc(${radiusMap[theme.radius]} * 0.5);
    --ws-radius-lg: calc(${radiusMap[theme.radius]} * 2);
  `.trim();
}

/* ============================================================
   Block Renderer Registry
   ============================================================ */

export type BlockRenderer = (props: { block: Block; context: RenderContext }) => React.ReactNode;

export interface RenderContext {
  tenant: {
    id: number;
    slug: string;
    businessName: string;
    logo?: string;
    services: Array<{ id: number; name: string; price: number; duration: number; image?: string }>;
    staff: Array<{ id: number; name: string; photo?: string; specialties?: string }>;
    address?: string;
    phone?: string;
    email?: string;
  };
  config: SiteConfig;
  isPreview: boolean;
}

type BlockRendererMap = Record<string, BlockRenderer>;

const blockRenderers: BlockRendererMap = {};

export function registerBlockRenderer(type: string, renderer: BlockRenderer) {
  blockRenderers[type] = renderer;
}

export function getBlockRenderer(type: string): BlockRenderer | undefined {
  return blockRenderers[type];
}

export function renderBlock(block: Block, context: RenderContext): React.ReactNode {
  if (!block.enabled) return null;
  
  const renderer = blockRenderers[block.type];
  if (!renderer) {
    console.warn(`No renderer registered for block type: ${block.type}`);
    return <div className="ws-block ws-block--missing" data-block-id={block.id}>
      Block type "{block.type}" not implemented
    </div>;
  }
  
  // Block renderers are React-style functions that receive one props object.
  // Passing the values as separate arguments leaves `block` undefined inside
  // the renderer and breaks previews for every template.
  return renderer({ block, context });
}

/* ============================================================
   Template Engine - Main Entry Point
   ============================================================ */

export interface TemplateEngineOptions {
  config: SiteConfig;
  tenant: RenderContext['tenant'];
  isPreview?: boolean;
}

export function createTemplateEngine({ config, tenant, isPreview = false }: TemplateEngineOptions) {
  const context: RenderContext = { tenant, config, isPreview: isPreview ?? false };
  
  // Sort blocks by order
  const sortedBlocks = [...config.blocks].sort((a, b) => a.order - b.order);
  
  return {
    config,
    context,
    sortedBlocks,
    themeCSS: generateThemeCSS(config.theme),
    
    // Render all blocks
    renderAll(): React.ReactNode {
      return (
        <div className="ws-site" style={{ '--ws-theme': this.themeCSS } as React.CSSProperties}>
          <style dangerouslySetInnerHTML={{ __html: this.themeCSS }} />
          {this.sortedBlocks.map(block => (
            <div key={block.id} className="ws-block-wrapper" data-block-type={block.type} data-block-id={block.id}>
              {renderBlock(block, this.context)}
            </div>
          ))}
        </div>
      );
    },
    
    // Render single block by ID
    renderBlockById(blockId: string): React.ReactNode {
      const block = this.sortedBlocks.find(b => b.id === blockId);
      if (!block) return null;
      return renderBlock(block, this.context);
    },
    
    // Get block by ID
    getBlock(blockId: string): Block | undefined {
      return this.sortedBlocks.find(b => b.id === blockId);
    },
    
    // Update block (returns new config)
    updateBlock(blockId: string, updates: Partial<Block>): SiteConfig {
      return {
        ...config,
        blocks: config.blocks.map(b => 
          b.id === blockId ? { ...b, ...(updates as object) } as Block : b
        ),
        updatedAt: new Date().toISOString(),
      };
    },
    
    // Reorder blocks
    reorderBlocks(blockIds: string[]): SiteConfig {
      const blockMap = new Map(config.blocks.map(b => [b.id, b]));
      const newBlocks = blockIds.map((id, index) => ({
        ...blockMap.get(id)!,
        order: index,
      })) as Block[];
      
      return {
        ...config,
        blocks: newBlocks,
        updatedAt: new Date().toISOString(),
      };
    },
    
    // Add new block
    addBlock(block: Block): SiteConfig {
      const newOrder = config.blocks.length > 0 
        ? Math.max(...config.blocks.map(b => b.order)) + 1 
        : 0;
      
      return {
        ...config,
        blocks: [...config.blocks, { ...block, order: newOrder } as Block],
        updatedAt: new Date().toISOString(),
      };
    },
    
    // Remove block
    removeBlock(blockId: string): SiteConfig {
      return {
        ...config,
        blocks: config.blocks.filter(b => b.id !== blockId),
        updatedAt: new Date().toISOString(),
      };
    },
  };
}

/* ============================================================
   Validation Helpers
   ============================================================ */

export function validateConfig(config: unknown): { success: boolean; errors?: string[]; data?: SiteConfig } {
  const result = SiteConfigSchema.safeParse(config);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((e: { path: unknown[]; message: string }) => `${e.path.join('.')}: ${e.message}`),
    };
  }
  
  return { success: true, data: result.data };
}

/* ============================================================
   AI-Assisted Block Mapping
   ============================================================ */

export interface ImageClassification {
  url: string;
  category: 'hero' | 'gallery' | 'service' | 'team' | 'about' | 'logo' | 'other';
  confidence: number;
  suggestedBlockType: string;
  suggestedAlt?: string;
}

export function mapImagesToBlocks(
  classifications: ImageClassification[],
  existingBlocks: Block[]
): Partial<Block>[] {
  const updates: Partial<Block>[] = [];
  
  // Group by suggested block type
  const byType = new Map<string, ImageClassification[]>();
  for (const c of classifications) {
    if (!byType.has(c.suggestedBlockType)) byType.set(c.suggestedBlockType, []);
    byType.get(c.suggestedBlockType)!.push(c);
  }
  
  // Update existing blocks or prepare new ones
  for (const [blockType] of byType) {
    const existingBlock = existingBlocks.find(b => b.type === blockType);
    if (existingBlock) {
      updates.push({
        id: existingBlock.id,
        // Type-specific updates would go here
      });
    }
  }
  
  return updates;
}
