import React from 'react';
import type { SiteConfig, RenderContext } from '../../lib/templateEngine';
import { renderBlock } from '../../lib/templateEngine';

/* ============================================================
   Elegant Template - Main Export
   ============================================================ */

/**
 * Elegant template renderer.
 * Uses the registered block renderers from the template engine.
 * This template is characterized by:
 * - Serif headings (Playfair Display)
 * - Warm gold/brass accent color
 * - Generous whitespace
 * - Classic centered layouts
 * - Subtle animations
 */

export function ElegantTemplate({ 
  config, 
  context, 
}: { 
  config: SiteConfig; 
  context: RenderContext; 
}) {
  // Apply elegant-specific CSS variables
  const elegantStyles: React.CSSProperties = {
    '--ws-template-spacing': '1.2',
    '--ws-container-max': '1200px',
  } as React.CSSProperties;

  // Sort blocks by order
  const sortedBlocks = [...config.blocks].sort((a, b) => a.order - b.order);

  return (
    <div 
      className="ws-template ws-template--elegant" 
      style={elegantStyles}
      data-template="elegant"
    >
      {/* Global styles for elegant template */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ws-template--elegant {
          --ws-font-heading: 'Playfair Display', serif;
          --ws-font-body: 'Inter', sans-serif;
        }
        .ws-template--elegant .font-heading {
          font-family: var(--ws-font-heading) !important;
        }
        .ws-template--elegant .font-body {
          font-family: var(--ws-font-body) !important;
        }
        .ws-template--elegant .ws-block {
          animation: fadeInUp 0.6s ease-out both;
        }
        .ws-template--elegant .ws-block:nth-child(1) { animation-delay: 0.1s; }
        .ws-template--elegant .ws-block:nth-child(2) { animation-delay: 0.2s; }
        .ws-template--elegant .ws-block:nth-child(3) { animation-delay: 0.3s; }
        .ws-template--elegant .ws-block:nth-child(4) { animation-delay: 0.4s; }
        .ws-template--elegant .ws-block:nth-child(5) { animation-delay: 0.5s; }
        .ws-template--elegant .ws-block:nth-child(6) { animation-delay: 0.6s; }
        .ws-template--elegant .ws-block:nth-child(7) { animation-delay: 0.7s; }
        .ws-template--elegant .ws-block:nth-child(8) { animation-delay: 0.8s; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Elegant specific overrides */
        .ws-template--elegant .ws-services-grid > * {
          border-radius: var(--ws-radius-lg);
        }
        .ws-template--elegant .ws-team-grid > * {
          border-radius: var(--ws-radius-lg);
        }
        .ws-template--elegant .ws-gallery-grid figure {
          border-radius: var(--ws-radius-lg);
        }
      ` }} />
      
      <div className="ws-elegant-site">
        {sortedBlocks.map(block => (
          <div key={block.id} className="ws-block-wrapper" data-block-type={block.type} data-block-id={block.id}>
            {renderBlock(block, context)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Template Variants / Color Schemes for Elegant
   ============================================================ */

export const ELEGANT_COLOR_SCHEMES = {
  default: {
    name: 'Dorado Clásico',
    primary: '#1a1a2e',
    secondary: '#cfa86b',
  },
  midnight: {
    name: 'Midnight Navy',
    primary: '#0a0a1a',
    secondary: '#b8965b',
  },
  champagne: {
    name: 'Champagne',
    primary: '#1f1a17',
    secondary: '#d4bf9a',
  },
  emerald: {
    name: 'Esmeralda',
    primary: '#0a1a12',
    secondary: '#6abf8b',
  },
  burgundy: {
    name: 'Borgoña',
    primary: '#1a0a0f',
    secondary: '#b85c7a',
  },
};

/* ============================================================
   Template Configuration
   ============================================================ */

export const ELEGANT_TEMPLATE_CONFIG = {
  id: 'elegant',
  name: 'Elegante',
  description: 'Diseño clásico y sofisticado con tipografía serif y acentos dorados. Ideal para salones premium y spas.',
  previewImage: '/templates/elegant-preview.jpg',
  colorSchemes: ELEGANT_COLOR_SCHEMES,
  defaultColorScheme: 'default',
  blocks: [
    'hero',
    'about',
    'services',
    'gallery',
    'team',
    'reviews',
    'contact',
    'cta',
  ],
  defaultBlocks: [
    { type: 'hero', order: 0 },
    { type: 'about', order: 1 },
    { type: 'services', order: 2 },
    { type: 'gallery', order: 3 },
    { type: 'team', order: 4 },
    { type: 'reviews', order: 5 },
    { type: 'contact', order: 6 },
    { type: 'cta', order: 7 },
  ],
};

export default ElegantTemplate;