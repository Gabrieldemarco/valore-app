import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import WebsiteRenderer from '../../features/website-studio/WebsiteRenderer';
import {
  createEmptySiteConfig,
  normalizeSiteConfig,
  TEMPLATE_PRESETS,
  type Block,
  type SiteConfig,
} from '../../features/website-studio/schemas/siteConfig';
import './website-studio-admin.css';

interface TenantData {
  id: number;
  slug: string;
  business_name: string;
  brand_logo_url?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
}

interface ServiceData { id: number; name: string; price: number; duration: number; image?: string; category?: string }
interface StaffData { id: number; name: string; photo?: string; specialties?: string }

interface WebsiteResponse {
  config: SiteConfig | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  updatedAt?: string;
}

type StudioTab = 'design' | 'content' | 'images';

function defaultConfig(tenantId: number): SiteConfig {
  const base = createEmptySiteConfig(tenantId);
  const preset = TEMPLATE_PRESETS.elegant;
  return {
    ...base,
    template: 'elegant',
    theme: preset.theme as SiteConfig['theme'],
    blocks: preset.blocks as SiteConfig['blocks'],
  };
}

function findBlock<T extends Block['type']>(config: SiteConfig, type: T): Extract<Block, { type: T }> | undefined {
  return config.blocks.find((block): block is Extract<Block, { type: T }> => block.type === type);
}

export default function WebsiteStudioAdmin() {
  const { staffToken } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [staff, setStaff] = useState<StaffData[]>([]);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [tab, setTab] = useState<StudioTab>('design');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!staffToken) {
      navigate('/staff/login');
      return;
    }

    Promise.all([
      api.get<WebsiteResponse>('/api/tenant/website'),
      api.get<{ tenant: TenantData }>('/api/tenant/me'),
      api.get<{ services: ServiceData[] }>('/api/tenant/services'),
      api.get<{ staff: StaffData[] }>('/api/tenant/staff'),
    ]).then(([website, tenantResponse, servicesResponse, staffResponse]) => {
      setTenant(tenantResponse.tenant);
      setServices(servicesResponse.services || []);
      setStaff(staffResponse.staff || []);
      setStatus(website.status || 'draft');
      setConfig(normalizeSiteConfig(website.config || defaultConfig(tenantResponse.tenant.id), tenantResponse.tenant.id));
    }).catch(err => {
      setMessage(err instanceof Error ? err.message : 'No se pudo cargar Web Studio');
    });
  }, [navigate, staffToken]);

  const updateConfig = useCallback((updater: (current: SiteConfig) => SiteConfig) => {
    setConfig(current => current ? updater(current) : current);
    setStatus('draft');
  }, []);

  const updateBlock = useCallback((type: Block['type'], updates: Record<string, unknown>) => {
    updateConfig(current => ({
      ...current,
      blocks: current.blocks.map(block => block.type === type ? { ...block, ...updates } as Block : block),
      updatedAt: new Date().toISOString(),
    }));
  }, [updateConfig]);

  const uploadImages = async (files: FileList | File[]) => {
    if (!config) return;
    const selected = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 12);
    if (!selected.length) return;

    setMessage('Subiendo imágenes…');
    try {
      const urls: string[] = [];
      for (const file of selected) {
        if (file.size > 5 * 1024 * 1024) continue;
        const dataUrl = await readFile(file);
        const response = await api.post<{ url: string }>('/api/tenant/website/images', {
          image: dataUrl,
          filename: file.name,
          blockType: 'gallery',
        });
        urls.push(response.url);
      }

      updateConfig(current => ({
        ...current,
        blocks: current.blocks.map(block => {
          if (block.type === 'hero' && urls[0]) return { ...block, backgroundImage: urls[0] };
          if (block.type === 'gallery') return {
            ...block,
            images: [...block.images, ...urls.map(url => ({ url, alt: tenant?.business_name || 'Trabajo' }))],
          };
          return block;
        }) as SiteConfig['blocks'],
        updatedAt: new Date().toISOString(),
      }));
      setMessage(`${urls.length} imagen${urls.length === 1 ? '' : 'es'} cargada${urls.length === 1 ? '' : 's'}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudieron subir las imágenes');
    }
  };

  const save = async (publish = false) => {
    if (!config) return;
    setSaving(true);
    setMessage(publish ? 'Publicando sitio…' : 'Guardando borrador…');
    try {
      await api.post('/api/tenant/website', { config, status: 'draft' });
      if (publish) {
        await api.post('/api/tenant/website/publish');
        setStatus('published');
        setMessage('Sitio publicado correctamente');
      } else {
        setStatus('draft');
        setMessage('Borrador guardado');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar el sitio');
    } finally {
      setSaving(false);
    }
  };

  const previewTenant = useMemo(() => tenant ? {
    id: tenant.id,
    slug: tenant.slug,
    businessName: tenant.business_name,
    logo: tenant.brand_logo_url,
    services,
    staff,
    address: tenant.business_address,
    phone: tenant.business_phone,
    email: tenant.business_email,
  } : null, [services, staff, tenant]);

  if (!config || !tenant || !previewTenant) {
    return <div className="ws-admin-loading">{message || 'Cargando Web Studio…'}</div>;
  }

  const hero = findBlock(config, 'hero');
  const about = findBlock(config, 'about');
  const gallery = findBlock(config, 'gallery');

  return (
    <div className="ws-admin-page">
      <header className="ws-admin-header">
        <div>
          <Link to="/staff/dashboard" className="ws-admin-back">← Volver al panel</Link>
          <h1>Web Studio</h1>
          <p>Creá el sitio público de {tenant.business_name} sin tocar tu landing actual.</p>
        </div>
        <div className="ws-admin-actions">
          <span className={`ws-admin-status ${status}`}>{status === 'published' ? 'Publicado' : 'Borrador'}</span>
          {tenant.slug && <a href={`/p/${tenant.slug}/website`} target="_blank" rel="noreferrer" className="ws-admin-btn secondary">Ver sitio</a>}
          <button className="ws-admin-btn secondary" onClick={() => save(false)} disabled={saving}>Guardar</button>
          <button className="ws-admin-btn primary" onClick={() => save(true)} disabled={saving}>Publicar sitio</button>
        </div>
      </header>

      <main className="ws-admin-layout">
        <section className="ws-admin-editor">
          <div className="ws-admin-tabs" role="tablist">
            {([['design', 'Diseño'], ['content', 'Contenido'], ['images', 'Imágenes']] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          {tab === 'design' && (
            <div className="ws-admin-panel">
              <h2>Elegí la identidad del sitio</h2>
              <p className="ws-admin-help">La plantilla es independiente del editor de landing existente.</p>
              <div className="ws-template-grid">
                {(['elegant', 'modern', 'minimal'] as const).map(template => (
                  <button key={template} className={`ws-template-card ${config.template === template ? 'active' : ''}`} onClick={() => updateConfig(current => ({ ...current, ...TEMPLATE_PRESETS[template], tenantId: current.tenantId, blocks: TEMPLATE_PRESETS[template].blocks as SiteConfig['blocks'], theme: TEMPLATE_PRESETS[template].theme as SiteConfig['theme'] }))}>
                    <span className={`ws-template-swatch ${template}`} />
                    <strong>{template === 'elegant' ? 'Elegante' : template === 'modern' ? 'Moderno' : 'Minimal'}</strong>
                    <small>{template === 'elegant' ? 'Cálido y sofisticado' : template === 'modern' ? 'Contemporáneo y fuerte' : 'Simple y funcional'}</small>
                  </button>
                ))}
              </div>
              <div className="ws-color-grid">
                <label>Color principal<input type="color" value={config.theme.primary} onChange={e => updateConfig(current => ({ ...current, theme: { ...current.theme, primary: e.target.value } }))} /></label>
                <label>Color de acento<input type="color" value={config.theme.secondary} onChange={e => updateConfig(current => ({ ...current, theme: { ...current.theme, secondary: e.target.value } }))} /></label>
              </div>
              <label className="ws-field">Título SEO<input value={config.seo.title} onChange={e => updateConfig(current => ({ ...current, seo: { ...current.seo, title: e.target.value } }))} placeholder={tenant.business_name} /></label>
              <label className="ws-field">Descripción SEO<textarea value={config.seo.description} onChange={e => updateConfig(current => ({ ...current, seo: { ...current.seo, description: e.target.value } }))} placeholder="Contá qué hace especial a tu negocio" rows={3} /></label>
            </div>
          )}

          {tab === 'content' && (
            <div className="ws-admin-panel">
              <h2>Contenido principal</h2>
              {hero && <div className="ws-admin-card"><h3>Portada</h3><label className="ws-field">Título<input value={hero.headline} onChange={e => updateBlock('hero', { headline: e.target.value })} placeholder={tenant.business_name} /></label><label className="ws-field">Subtítulo<textarea value={hero.subheadline} onChange={e => updateBlock('hero', { subheadline: e.target.value })} rows={3} placeholder="Una experiencia de cuidado personal pensada para vos" /></label><label className="ws-field">Texto del botón<input value={hero.ctaText} onChange={e => updateBlock('hero', { ctaText: e.target.value })} /></label></div>}
              {about && <div className="ws-admin-card"><h3>Sobre el negocio</h3><label className="ws-field">Título<input value={about.title} onChange={e => updateBlock('about', { title: e.target.value })} /></label><label className="ws-field">Descripción<textarea value={about.content} onChange={e => updateBlock('about', { content: e.target.value })} rows={5} placeholder="Presentá tu espacio, tu equipo y tu propuesta" /></label></div>}
            </div>
          )}

          {tab === 'images' && (
            <div className="ws-admin-panel">
              <h2>Imágenes del sitio</h2>
              <p className="ws-admin-help">Subí una portada y trabajos de tu portfolio. JPG, PNG o WebP, hasta 5 MB por imagen.</p>
              <label className={`ws-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void uploadImages(e.dataTransfer.files); }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { if (e.target.files) void uploadImages(e.target.files); }} />
                <strong>Arrastrá tus imágenes acá</strong><span>o hacé clic para seleccionarlas</span>
              </label>
              <div className="ws-image-list">
                {hero && hero.backgroundImage && <img src={hero.backgroundImage} alt="Portada" />}
                {gallery && gallery.images.map(image => <img key={image.url} src={image.url} alt={image.alt} />)}
              </div>
            </div>
          )}
          {message && <div className="ws-admin-message" role="status">{message}</div>}
        </section>

        <section className="ws-admin-preview">
          <div className="ws-preview-label"><span>Vista previa en vivo</span><small>Los cambios se guardan cuando confirmás</small></div>
          <div className="ws-preview-frame">
            <WebsiteRenderer config={config} tenant={previewTenant} isPreview />
          </div>
        </section>
      </main>
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}
