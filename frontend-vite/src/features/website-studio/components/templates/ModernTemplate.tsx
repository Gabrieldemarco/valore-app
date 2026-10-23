import React from 'react';
import type { SiteConfig, RenderContext } from '../../lib/templateEngine';
import { renderBlock } from '../../lib/templateEngine';

/* ============================================================
   Modern Template
   ============================================================ */

export function ModernTemplate({ 
  config, 
  context, 
}: { 
  config: SiteConfig; 
  context: RenderContext; 
}) {
  const modernStyles: React.CSSProperties = {
    '--ws-template-spacing': '1',
    '--ws-container-max': '1400px',
  } as React.CSSProperties;

  const sortedBlocks = [...config.blocks].sort((a, b) => a.order - b.order);

  return (
    <div 
      className="ws-template ws-template--modern" 
      style={modernStyles}
      data-template="modern"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .ws-template--modern {
          --ws-font-heading: 'Space Grotesk', sans-serif;
          --ws-font-body: 'DM Sans', sans-serif;
        }
        .ws-template--modern .font-heading {
          font-family: var(--ws-font-heading) !important;
        }
        .ws-template--modern .font-body {
          font-family: var(--ws-font-body) !important;
        }
        .ws-template--modern .ws-block {
          animation: fadeIn 0.4s ease-out both;
        }
        .ws-template--modern .ws-block:nth-child(1) { animation-delay: 0.05s; }
        .ws-template--modern .ws-block:nth-child(2) { animation-delay: 0.1s; }
        .ws-template--modern .ws-block:nth-child(3) { animation-delay: 0.15s; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .ws-template--modern .ws-block {
          border-radius: 0 !important;
        }
        .ws-template--modern .ws-btn-icon {
          border-radius: 0 !important;
        }
      ` }} />
      
      <div className="ws-modern-site">
        <style dangerouslySetInnerHTML={{ __html: `
          .ws-modern-site .ws-block {
            border: 1px solid rgba(255,255,255,0.1);
          }
          .ws-modern-site .ws-block:hover {
            border-color: var(--ws-primary);
            box-shadow: 0 0 0 1px var(--ws-primary);
          }
        ` }} />
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
   Modern Template Color Schemes
   ============================================================ */

export const MODERN_COLOR_SCHEMES = {
  default: {
    name: 'Blanco y Negro',
    primary: '#0f0f0f',
    secondary: '#ffffff',
  },
  mono: {
    name: 'Monocromo',
    primary: '#1a1a1a',
    secondary: '#e5e5e5',
  },
  dark: {
    name: 'Oscuro',
    primary: '#000000',
    secondary: '#f5f5f5',
  },
  accent: {
    name: 'Acento Cian',
    primary: '#0a0a0a',
    secondary: '#00d4ff',
  },
};

export const MODERN_TEMPLATE_CONFIG = {
  id: 'modern',
  name: 'Moderno',
  description: 'Diseño minimalista y arquitectónico con tipografía geométrica. Ideal para barberías y salones contemporáneos.',
  previewImage: '/templates/modern-preview.jpg',
  colorSchemes: MODERN_COLOR_SCHEMES,
  defaultColorScheme: 'default',
  blocks: [
    'hero',
    'services',
    'gallery',
    'team',
    'cta',
    'contact',
  ],
  defaultBlocks: [
    { type: 'hero', order: 0 },
    { type: 'services', order: 1 },
    { type: 'gallery', order: 2 },
    { type: 'team', order: 3 },
    { type: 'cta', order: 4 },
    { type: 'contact', order: 5 },
  ],
};

export default ModernTemplate;