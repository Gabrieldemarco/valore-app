import React from 'react';
import type { GalleryBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, OptimizedImage, Badge } from './common';

/* ============================================================
   Gallery Block
   ============================================================ */

export function GalleryBlockRenderer({ 
  block, 
  context, 
}: { 
  block: GalleryBlock; 
  context: RenderContext; 
}) {
  const { 
    title, 
    subtitle, 
    images = [], 
    layout = 'grid', 
    showCategoryFilter = true,
  } = block;

  // Get unique categories from images
  const categories = Array.from(
    new Set(images.map((img: { category?: string }) => img.category).filter(Boolean))
  ) as string[];

  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  
  const filteredImages = activeCategory === 'all' 
    ? images 
    : images.filter((img: { category?: string }) => img.category === activeCategory);

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section id="gallery" className="ws-gallery">
        <Container>
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && <Heading level={2} className="mb-4">{title}</Heading>}
              {subtitle && <Text size="lg" className="max-w-2xl mx-auto">{subtitle}</Text>}
            </div>
          )}
          
          {showCategoryFilter && categories.length > 1 && (
            <div className="flex flex-wrap justify-center gap-3 mb-10" role="tablist">
              <button
                role="tab"
                aria-selected={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === 'all'
                    ? 'bg-[var(--ws-primary)] text-white shadow-lg'
                    : 'bg-white/5 border border-white/10 hover:border-[var(--ws-primary)]/50'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-[var(--ws-primary)] text-white shadow-lg'
                      : 'bg-white/5 border border-white/10 hover:border-[var(--ws-primary)]/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className={`ws-gallery-grid`} style={{ 
            display: layout === 'carousel' ? 'flex' : 'grid',
            gridTemplateColumns: layout === 'grid' ? `repeat(${block.columns}, 1fr)` : undefined,
            gap: '24px',
          }}>
            {filteredImages.map((image: { url: string; alt?: string; category?: string }, index: number) => (
              <figure 
                key={image.url} 
                className="group relative overflow-hidden rounded-[var(--ws-radius)] bg-white/5"
                style={{ 
                  aspectRatio: '4/3',
                  gridColumn: layout === 'masonry' && index % 3 === 0 ? 'span 2' : undefined,
                }}
              >
                <OptimizedImage 
                  src={image.url} 
                  alt={image.alt || 'Imagen de galería'} 
                  fill
                  className="transition-all duration-500 group-hover:scale-105"
                />
                {image.category && (
                  <figcaption className="absolute bottom-4 left-4">
                    <Badge className="bg-black/70 text-white/90">{image.category}</Badge>
                  </figcaption>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </figure>
            ))}
          </div>

          {filteredImages.length === 0 && (
            <div className="text-center py-16 text-white/50">
              <p>No hay imágenes en esta categoría</p>
            </div>
          )}
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('gallery', GalleryBlockRenderer as unknown as BlockRenderer);