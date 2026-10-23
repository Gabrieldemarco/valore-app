import React from 'react';
import type { SiteConfig, RenderContext } from '../../lib/templateEngine';
import { renderBlock } from '../../lib/templateEngine';

/* ============================================================
   Minimal Template
   ============================================================ */

export function MinimalTemplate({ 
  config, 
  context, 
}: { 
  config: SiteConfig; 
  context: RenderContext; 
}) {
  const minimalStyles: React.CSSProperties = {
    '--ws-template-spacing': '1.5',
    '--ws-container-max': '900px',
  } as React.CSSProperties;

  const sortedBlocks = [...config.blocks].sort((a, b) => a.order - b.order);

  return (
    <div 
      className="ws-template ws-template--minimal" 
      style={minimalStyles}
      data-template="minimal"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .ws-template--minimal {
          --ws-font-heading: 'IBM Plex Sans', sans-serif;
          --ws-font-body: 'IBM Plex Sans', sans-serif;
        }
        .ws-template--minimal .font-heading {
          font-family: var(--ws-font-heading) !important;
        }
        .ws-template--minimal .font-body {
          font-family: var(--ws-font-body) !important;
        }
        .ws-template--minimal .ws-block {
          animation: none;
        }
        .ws-template--minimal .ws-block {
          border-radius: 4px !important;
        }
        .ws-template--minimal .ws-block {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
        }
        .ws-template--minimal .ws-block:hover {
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.04);
        }
      ` }} />
      
      <div className="ws-minimal-site">
        <style dangerouslySetInnerHTML={{ __html: `
          .ws-minimal-site .ws-block {
            transition: all 0.2s ease;
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
   Minimal Template Color Schemes
   ============================================================ */

export const MINIMAL_COLOR_SCHEMES = {
  default: {
    name: 'Blanco y Negro',
    primary: '#111111',
    secondary: '#666666',
  },
  warm: {
    name: 'Cálido',
    primary: '#1a1512',
    secondary: '#a89a8a',
  },
  cool: {
    name: 'Frío',
    primary: '#0d1117',
    secondary: '#8b949e',
  },
  mono: {
    name: 'Monocromo',
    primary: '#000000',
    secondary: '#ffffff',
  },
};

export const MINIMAL_TEMPLATE_CONFIG = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Diseño ultra-limpio y funcional. Máxima legibilidad y velocidad. Ideal para salones que buscan simplicidad.',
  previewImage: '/templates/minimal-preview.jpg',
  colorSchemes: MINIMAL_COLOR_SCHEMES,
  defaultColorScheme: 'default',
  blocks: [
    'hero',
    'services',
    'about',
    'contact',
  ],
  defaultBlocks: [
    { type: 'hero', order: 0 },
    { type: 'services', order: 1 },
    { type: 'about', order: 2 },
    { type: 'contact', order: 3 },
  ],
};

export default MinimalTemplate;