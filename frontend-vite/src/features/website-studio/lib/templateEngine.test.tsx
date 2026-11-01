import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactBlockSchema, createEmptySiteConfig } from '../schemas/siteConfig';
import { renderBlock, type RenderContext } from './templateEngine';
import '../components/blocks/ContactBlock';
import { resolveWebsiteHref } from '../components/blocks/common';

describe('website studio rendering', () => {
  it('renders block renderers as React components so their hooks work', () => {
    const block = ContactBlockSchema.parse({
      id: '59f1b630-6a44-4ba7-98cd-5acfe18db2b3',
      type: 'contact',
      order: 0,
    });
    const config = createEmptySiteConfig(1);
    const context: RenderContext = {
      tenant: { id: 1, slug: 'test-salon', businessName: 'Test Salon', services: [], staff: [] },
      config,
      isPreview: true,
    };

    const { container } = render(renderBlock(block, context));
    expect(container.querySelector('.ws-contact')).toBeInTheDocument();
  });

  it('sends built-in booking and service links to the salon booking flow', () => {
    expect(resolveWebsiteHref('/book', 'test-salon')).toBe('/p/test-salon#reservar');
    expect(resolveWebsiteHref('/services/42', 'test-salon')).toBe('/p/test-salon#reservar');
    expect(resolveWebsiteHref('https://example.com', 'test-salon')).toBe('https://example.com');
  });
});
