import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import type { SiteConfig, Block } from './lib/templateEngine';
import {
  createTemplateEngine,
  renderBlock
} from './lib/templateEngine';
import './WebsiteRenderer.css';

// Import block renderers (they self-register on import)
import './components/blocks/HeroBlock';
import './components/blocks/GalleryBlock';
import './components/blocks/ServicesBlock';
import './components/blocks/AboutBlock';
import './components/blocks/TeamBlock';
import './components/blocks/ContactBlock';
import './components/blocks/CtaBlock';
import './components/blocks/ReviewsBlock';

/* ============================================================
   WebsiteRenderer - Public Page Renderer
   ============================================================

   This component renders a tenant's public website based on their
   SiteConfig. It uses the template engine to render blocks in order.
   ============================================================ */

interface WebsiteRendererProps {
  config: SiteConfig;
  tenant: {
    id: number;
    slug: string;
    businessName: string;
    logo?: string;
    services: Array<{ id: number; name: string; price: number; duration: number; image?: string; category?: string }>;
    staff: Array<{ id: number; name: string; photo?: string; specialties?: string }>;
    address?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    hours?: Record<string, { open: string; close: string; closed: boolean }>;
  };
  isPreview?: boolean;
  className?: string;
}

export const WebsiteRenderer = React.memo(function WebsiteRenderer({ 
  config, 
  tenant, 
  isPreview = false,
  className = '',
}: WebsiteRendererProps) {
  const engine = React.useMemo(() => 
    createTemplateEngine({ config, tenant, isPreview }), 
    [config, tenant, isPreview]
  );

  const renderedBlocks = React.useMemo(() => 
    engine.sortedBlocks.map((block: Block) => (
      <div key={block.id} className="ws-block-wrapper" data-block-type={block.type} data-block-id={block.id}>
        {renderBlock(block, engine.context)}
      </div>
    )), 
    [engine]
  );

  const seoTitle = config.seo?.title || tenant.businessName;
  const seoDescription = config.seo?.description || `Bienvenido a ${tenant.businessName}. Reserva tu cita online.`;
  const ogImage = config.seo?.ogImage || tenant.logo;
  const favicon = config.seo?.favicon || '/favicon.svg';
  const themeCSS = engine.themeCSS;

  const helmetContent = (
    <React.Fragment>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:type" content="website" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <link rel="icon" href={favicon} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
    </React.Fragment>
  );

  return (
    <div className={`ws-public-site ${className}`} data-tenant-id={tenant.id}>
      <HelmetProvider>
        {helmetContent}
      </HelmetProvider>

      <div className="ws-site-wrapper">
        <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
        <div className="ws-site-content">
          {renderedBlocks}
        </div>

        {!isPreview && (
          <a 
            href="/book" 
            className="ws-float-booking"
            aria-label="Reservar cita"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Reservar</span>
          </a>
        )}
      </div>
    </div>
  );
});

/* ============================================================
   Preview Wrapper (for admin preview)
   ============================================================ */

interface PreviewWrapperProps {
  config: SiteConfig;
  tenant: {
    id: number;
    slug: string;
    businessName: string;
  };
  onClose: () => void;
  onSave: (config: SiteConfig) => void;
  onPublish: (config: SiteConfig) => void;
}

export const PreviewWrapper = React.memo(function PreviewWrapper({ 
  config, 
  tenant, 
  onClose, 
  onSave, 
  onPublish,
}: PreviewWrapperProps) {
  return (
    <div className="ws-preview-wrapper">
      <div className="ws-preview-toolbar">
        <div className="ws-preview-info">
          <span className="ws-preview-badge">Vista previa</span>
          <span className="ws-template-name">Plantilla: {config.template}</span>
        </div>
        <div className="ws-preview-actions">
          <button onClick={onClose} className="ws-btn ws-btn--ghost">Cerrar</button>
          <button onClick={() => onSave(config)} className="ws-btn ws-btn--secondary">Guardar borrador</button>
          <button onClick={() => onPublish({ ...config, status: 'published', publishedAt: new Date().toISOString() })} className="ws-btn ws-btn--primary">Publicar</button>
        </div>
      </div>
      <div className="ws-preview-content">
        <WebsiteRenderer config={config} tenant={tenant as WebsiteRendererProps['tenant']} isPreview={true} />
      </div>
    </div>
  );
});

/* ============================================================
   SEO Helper Functions
   ============================================================ */

export function generateStructuredData(config: SiteConfig, tenant: {
  businessName: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: string;
  logo?: string;
  hours?: Record<string, { open: string; close: string; closed: boolean }>;
}) {
  const hours = tenant.hours;
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: tenant.businessName,
    description: config.seo?.description,
    url: `https://velsoie.com/p/${tenant.slug}`,
    telephone: tenant.phone,
    email: tenant.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: tenant.address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      // latitude/longitude would come from tenant
    },
    openingHoursSpecification: hours ? Object.entries(hours).map(([day, hour]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: day,
      opens: hour.open,
      closes: hour.close,
    })) : undefined,
    priceRange: '$$',
    image: config.seo?.ogImage || tenant.logo,
  };
}

export function generateSitemap(config: SiteConfig, tenant: { slug: string }) {
  const baseUrl = `https://velsoie.com/p/${tenant.slug}`;
  const blocks = config.blocks.filter((b: Block) => b.enabled).map((b: Block) => b.type);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  ${blocks.map((b: string) => `<url><loc>${baseUrl}#${b}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('')}
</urlset>`;
}

/* ============================================================
   Default Export
   ============================================================ */

export default WebsiteRenderer;