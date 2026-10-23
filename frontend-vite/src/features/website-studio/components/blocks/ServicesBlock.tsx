import React from 'react';
import type { ServicesBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, Grid, Card, Button } from './common';

/* ============================================================
   Services Block
   ============================================================ */

export function ServicesBlockRenderer({ 
  block, 
  context, 
}: { 
  block: ServicesBlock; 
  context: RenderContext; 
}) {
  const { 
    title, 
    subtitle, 
    serviceIds = [], 
    displayMode = 'cards', 
    showPrices = true, 
    showDuration = true,
    ctaText, 
    ctaLink,
  } = block;

  // Get services from context (tenant services)
  const services = context.tenant.services
    .filter((s: { id: number }) => serviceIds.length === 0 || serviceIds.includes(s.id))
    .slice(0, 12);

  if (services.length === 0) {
    return (
      <BlockWrapper block={block} context={context} isPreview={true}>
        <Section id="services" className="ws-services">
          <Container>
            <div className="text-center py-16">
              <Heading level={2} className="mb-4">{title || 'Servicios'}</Heading>
              {subtitle && <Text size="lg" className="mb-8 max-w-2xl mx-auto">{subtitle}</Text>}
              <Text className="text-white/50">No hay servicios configurados para mostrar.</Text>
            </div>
          </Container>
        </Section>
      </BlockWrapper>
    );
  }

  const renderServiceCard = (service: { id: number; name: string; price: number; duration: number; image?: string }) => (
      <Card hover href={`/services/${service.id}`} className="h-full flex flex-col">
        {service.image && (
          <div className="aspect-video overflow-hidden rounded-t-[var(--ws-radius)]">
            <img 
              src={service.image} 
              alt={service.name} 
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-6 flex flex-col flex-1">
          <h3 className="font-heading text-xl font-medium text-[var(--ws-primary)] mb-2">{service.name}</h3>
          <p className="text-white/60 text-sm mb-4 flex-1">Duración: {service.duration} min</p>
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {showPrices && (
              <span className="font-heading text-xl font-bold text-[var(--ws-secondary)]">
                ${service.price.toLocaleString()}
              </span>
            )}
            {showDuration && (
              <span className="text-white/50 text-sm">{service.duration} min</span>
            )}
          </div>
        </div>
      </Card>
  );

  const renderServiceList = (service: { id: number; name: string; price: number; duration: number }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[var(--ws-radius)] transition-all hover:border-[var(--ws-primary)]/50">
      <div className="flex-1">
        <h3 className="font-heading text-lg font-medium text-[var(--ws-primary)]">{service.name}</h3>
        <p className="text-white/60 text-sm">Duración: {service.duration} min</p>
      </div>
      <div className="flex items-center gap-4 ml-6">
        {showPrices && (
          <span className="font-heading text-xl font-bold text-[var(--ws-secondary)]">
            ${service.price.toLocaleString()}
          </span>
        )}
        {showDuration && (
          <span className="text-white/50 text-sm">{service.duration} min</span>
        )}
        <Button variant="outline" size="sm" href={`/services/${service.id}`}>Ver</Button>
      </div>
    </div>
  );

  const renderServiceAccordion = (service: { id: number; name: string; price: number; duration: number }) => (
    <ServiceAccordionItem service={service} />
  );

  function ServiceAccordionItem({ service }: { service: { id: number; name: string; price: number; duration: number } }) {
    const [open, setOpen] = React.useState(false);

    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[var(--ws-radius)] overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
          aria-expanded={open}
        >
          <div>
            <h3 className="font-heading text-lg font-medium text-[var(--ws-primary)]">{service.name}</h3>
            <p className="text-white/60 text-sm mt-1">Duración: {service.duration} min</p>
          </div>
          <span className={`font-heading text-xl font-bold text-[var(--ws-secondary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ${service.price.toLocaleString()}
          </span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-6 pb-6 border-t border-white/10">
            <Button variant="primary" href={`/services/${service.id}`} className="w-full sm:w-auto">Reservar este servicio</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section id="services" className="ws-services">
        <Container>
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && <Heading level={2} className="mb-4">{title}</Heading>}
              {subtitle && <Text size="lg" className="max-w-2xl mx-auto">{subtitle}</Text>}
            </div>
          )}
          
          <div className="ws-services-container">
            {displayMode === 'cards' && (
              <Grid columns={3} className="ws-services-grid">
      {services.map((service: { id: number; name: string; price: number; duration: number }) => renderServiceCard(service))}
            </Grid>
          )}
          
          {displayMode === 'list' && (
            <div className="space-y-3 ws-services-list">
              {services.map((service: { id: number; name: string; price: number; duration: number }) => renderServiceList(service))}
            </div>
          )}
          
          {displayMode === 'accordion' && (
            <div className="space-y-3 ws-services-accordion">
              {services.map((service: { id: number; name: string; price: number; duration: number }) => renderServiceAccordion(service))}
            </div>
          )}
          </div>

          {ctaText && ctaLink && (
            <div className="text-center mt-10">
              <Button size="lg" href={ctaLink}>{ctaText}</Button>
            </div>
          )}
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('services', ServicesBlockRenderer as unknown as BlockRenderer);