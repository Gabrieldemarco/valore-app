import React from 'react';
import type { HeroBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, Button } from './common';

/* ============================================================
   Hero Block
   ============================================================ */

export function HeroBlockRenderer({ 
  block, 
  context, 
}: { 
  block: HeroBlock; 
  context: RenderContext; 
}) {
  const { 
    backgroundImage, 
    backgroundOverlay = 0.4,
    headline, 
    subheadline, 
    ctaText, 
    ctaLink, 
    textAlign = 'center',
    minHeight = 600,
  } = block;

  const styles: React.CSSProperties = {
    minHeight: `${minHeight}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `rgba(0, 0, 0, ${backgroundOverlay})`,
    zIndex: 1,
  };

  const contentStyles: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    maxWidth: '800px',
    padding: '0 24px',
    textAlign,
  };

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section 
        id="hero" 
        background={backgroundImage}
        padding="0"
        style={styles}
      >
        <div style={overlayStyles} />
        <Container style={contentStyles}>
          {headline && <Heading level={1} align={textAlign} className="mb-6">{headline}</Heading>}
          {subheadline && <Text align={textAlign} size="lg" className="mb-8 max-w-2xl mx-auto">{subheadline}</Text>}
          {ctaText && ctaLink && (
            <div style={{ display: 'flex', gap: '16px', justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center', flexWrap: 'wrap' }}>
              <Button size="lg" href={ctaLink}>{ctaText}</Button>
            </div>
          )}
        </Container>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/60">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </Section>
    </BlockWrapper>
  );
}

/* ============================================================
   Register Renderer
   ============================================================ */

import { registerBlockRenderer } from '../../lib/templateEngine';

registerBlockRenderer('hero', HeroBlockRenderer as unknown as BlockRenderer);