import React from 'react';
import type { ReviewsBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, Card, Grid } from './common';

/* ============================================================
   Reviews Block
   ============================================================ */

export function ReviewsBlockRenderer({ 
  block, 
  context, 
}: { 
  block: ReviewsBlock; 
  context: RenderContext; 
}) {
  const { 
    title, 
    reviews = [], 
    layout = 'carousel',
  } = block;

  const [currentIndex, setCurrentIndex] = React.useState(0);

  if (reviews.length === 0) {
    return (
      <BlockWrapper block={block} context={context} isPreview={true}>
        <Section id="reviews" className="ws-reviews">
          <Container>
            <div className="text-center py-16">
              <Heading level={2} className="mb-4">{title || 'Lo que dicen nuestros clientes'}</Heading>
              <Text className="text-white/50">No hay reseñas para mostrar.</Text>
            </div>
          </Container>
        </Section>
      </BlockWrapper>
    );
  }

  const renderReviewCard = (review: { author: string; rating: number; text: string; date: string; service?: string }) => (
    <Card className="h-full">
      <div className="p-6">
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg 
              key={i} 
              className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-white/20'}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.969 0-1.371-1.24-.588-1.81l2.8-2.034a1 1 0 00.364-1.118L7.07 2.927z"/>
            </svg>
          ))}
        </div>
        <p className="text-white/80 mb-4 leading-relaxed">"{review.text}"</p>
        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <div className="w-10 h-10 rounded-full bg-[var(--ws-primary)]/20 flex items-center justify-center text-[var(--ws-primary)]">
            {review.author.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-[var(--ws-primary)]">{review.author}</div>
            <div className="text-white/50 text-sm">{review.service ? `${review.service} · ` : ''}{new Date(review.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section id="reviews" className="ws-reviews">
        <Container>
          {title && (
            <div className="text-center mb-12">
              <Heading level={2} className="mb-4">{title}</Heading>
            </div>
          )}
          
          <div className="ws-reviews-container">
            {layout === 'carousel' ? (
              <div className="relative">
                <div className="overflow-hidden">
                  <div 
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                  >
                    {reviews.map((review: { author: string; rating: number; text: string; date: string; service?: string }) => (
                      <div key={review.author + review.date} className="w-full flex-shrink-0 px-4">
                        {renderReviewCard(review)}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Navigation */}
                <div className="flex justify-center gap-3 mt-8">
                  {reviews.map((_: unknown, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentIndex 
                          ? 'bg-[var(--ws-primary)] w-8' 
                          : 'bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Ir a reseña ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Auto-play */}
                <div className="absolute inset-0" onMouseEnter={() => {}} onMouseLeave={() => {}} />
              </div>
            ) : (
              <Grid columns={3} className="ws-reviews-grid">
                {reviews.map((review: { author: string; rating: number; text: string; date: string; service?: string }) => renderReviewCard(review))}
              </Grid>
            )}
          </div>
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('reviews', ReviewsBlockRenderer as unknown as BlockRenderer);