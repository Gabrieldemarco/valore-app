import type { CtaBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, Button } from './common';

/* ============================================================
   CTA Block
   ============================================================ */

export function CtaBlockRenderer({ 
  block, 
  context, 
}: { 
  block: CtaBlock; 
  context: RenderContext; 
}) {
  const { 
    headline, 
    subheadline, 
    primaryCtaText, 
    primaryCtaLink, 
    secondaryCtaText, 
    secondaryCtaLink,
    backgroundColor,
    backgroundImage,
  } = block;

  const sectionStyles: React.CSSProperties = {
    backgroundColor: backgroundColor,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  };

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section 
        id="cta" 
        className="ws-cta"
        padding="py-16 sm:py-24"
        style={sectionStyles}
      >
        <div style={overlayStyles} />
        <Container style={{ position: 'relative', zIndex: 2 }}>
          <div className="text-center max-w-3xl mx-auto">
            {headline && <Heading level={2} className="mb-4">{headline}</Heading>}
            {subheadline && <Text size="lg" className="mb-8">{subheadline}</Text>}
            <div className="flex flex-wrap justify-center gap-4">
              {primaryCtaText && primaryCtaLink && (
                <Button size="lg" href={primaryCtaLink} variant="primary">
                  {primaryCtaText}
                </Button>
              )}
              {secondaryCtaText && secondaryCtaLink && (
                <Button size="lg" href={secondaryCtaLink} variant="outline">
                  {secondaryCtaText}
                </Button>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('cta', CtaBlockRenderer as unknown as BlockRenderer);