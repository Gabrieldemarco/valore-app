import type { TeamBlock, BlockRenderer, RenderContext } from '../../lib/templateEngine';
import { BlockWrapper, Section, Container, Heading, Text, Grid, Card } from './common';

/* ============================================================
   Team Block
   ============================================================ */

export function TeamBlockRenderer({ 
  block, 
  context, 
}: { 
  block: TeamBlock; 
  context: RenderContext; 
}) {
  const { 
    title, 
    subtitle, 
    staffIds = [], 
    layout = 'grid', 
  } = block;

  // Get staff from context
  const staff = context.tenant.staff
    .filter((s: { id: number }) => staffIds.length === 0 || staffIds.includes(s.id))
    .slice(0, 12);

  if (staff.length === 0) {
    return (
      <BlockWrapper block={block} context={context} isPreview={true}>
        <Section id="team" className="ws-team">
          <Container>
            <div className="text-center py-16">
              <Heading level={2} className="mb-4">{title || 'Nuestro equipo'}</Heading>
              {subtitle && <Text size="lg" className="mb-8 max-w-2xl mx-auto">{subtitle}</Text>}
              <p className="text-white/50">No hay miembros del equipo configurados.</p>
            </div>
          </Container>
        </Section>
      </BlockWrapper>
    );
  }

  const renderTeamCard = (member: { id: number; name: string; photo?: string; specialties?: string }) => (
    <Card hover className="text-center">
      {member.photo && (
        <div className="aspect-square overflow-hidden rounded-t-[var(--ws-radius)]">
          <img 
            src={member.photo} 
            alt={member.name} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="font-heading text-xl font-medium text-[var(--ws-primary)] mb-1">{member.name}</h3>
        {member.specialties && (
          <p className="text-white/60 text-sm mb-4">{member.specialties}</p>
        )}
        {/* Social links would go here if showSocial */}
      </div>
    </Card>
  );

  return (
    <BlockWrapper block={block} context={context} isPreview={true}>
      <Section id="team" className="ws-team">
        <Container>
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {title && <Heading level={2} className="mb-4">{title}</Heading>}
              {subtitle && <Text size="lg" className="max-w-2xl mx-auto">{subtitle}</Text>}
            </div>
          )}
          
          <div className="ws-team-container">
            {layout === 'carousel' ? (
              <div className="overflow-x-auto pb-4 snap-x snap-mandatory flex gap-6">
                {staff.map((member: { id: number; name: string; photo?: string; specialties?: string }) => (
                  <div key={member.id} className="flex-shrink-0 snap-center w-64 sm:w-72" style={{ flexShrink: 0 }}>
                    {renderTeamCard(member)}
                  </div>
                ))}
              </div>
            ) : (
              <Grid columns={layout === 'list' ? 1 : 3} className="ws-team-grid">
                {staff.map((member: { id: number; name: string; photo?: string; specialties?: string }) => renderTeamCard(member))}
              </Grid>
            )}
          </div>
        </Container>
      </Section>
    </BlockWrapper>
  );
}

import { registerBlockRenderer } from '../../lib/templateEngine';
registerBlockRenderer('team', TeamBlockRenderer as unknown as BlockRenderer);