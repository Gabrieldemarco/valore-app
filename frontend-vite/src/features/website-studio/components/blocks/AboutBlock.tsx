import type { AboutBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text } from './common';

/* ============================================================
   About Block
   ============================================================ */

export function AboutBlockRenderer({ 
  block, 
  context, 
}: { 
  block: AboutBlock; 
  context: RenderContext; 
}) {
  const { 
    title, 
    content, 
    image, 
    imagePosition = 'left',
    stats = [],
  } = block;

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section id="about" className="ws-about">
        <Container>
          <div className={`flex flex-col ${image ? (imagePosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row') : ''} items-center gap-12 lg:gap-20`}>
            {/* Text Content */}
            <div className={`w-full ${image ? 'lg:w-1/2' : ''} text-center lg:text-${imagePosition === 'left' ? 'right' : 'left'}`}>
              {title && <Heading level={2} className="mb-6" align={image ? (imagePosition === 'left' ? 'right' : 'left') : 'center'}>{title}</Heading>}
              {content && <Text size="lg" className="mb-8" align={image ? (imagePosition === 'left' ? 'right' : 'left') : 'center'}>{content}</Text>}
              
              {stats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                  {stats.map((stat: { label: string; value: string }, index: number) => (
                    <div key={index} className="text-center p-4">
                      <div className="font-heading text-3xl sm:text-4xl font-bold text-[var(--ws-secondary)] mb-2">{stat.value}</div>
                      <div className="text-white/60 text-sm font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Image */}
            {image && (
              <div className={`w-full ${image ? 'lg:w-1/2' : ''} relative`}>
                <div className="aspect-[4/5] lg:aspect-[3/4] overflow-hidden rounded-[var(--ws-radius-lg)] bg-white/5">
                  <img 
                    src={image} 
                    alt={title || 'Imagen sobre nosotros'} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('about', AboutBlockRenderer as unknown as BlockRenderer);