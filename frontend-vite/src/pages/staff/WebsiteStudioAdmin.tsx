import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { BlockAction } from '../../features/website-studio/lib/templateEngine';
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

type DefaultTranslation = (key: string) => string;

function localizedTemplateBlocks(template: 'elegant' | 'modern' | 'minimal', translate: DefaultTranslation): Block[] {
  const blocks = TEMPLATE_PRESETS[template].blocks as Block[];
  return blocks.map(block => {
    const base = { ...block, id: globalThis.crypto.randomUUID() };
    switch (block.type) {
      case 'hero':
        return { ...base, ctaText: translate('book') };
      case 'about':
        return { ...base, title: translate('about') };
      case 'services':
        return { ...base, title: translate('services'), ctaText: translate('viewAll') };
      case 'gallery':
        return { ...base, title: translate('gallery') };
      case 'team':
        return { ...base, title: translate('team') };
      case 'reviews':
        return { ...base, title: translate('reviews') };
      case 'contact':
        return { ...base, title: translate('contact') };
      case 'cta':
        return {
          ...base,
          headline: translate('ctaHeadline'),
          subheadline: translate('ctaSubtitle'),
          primaryCtaText: translate('bookNow'),
        };
      default:
        return base;
    }
  });
}

function defaultConfig(tenantId: number, translate: DefaultTranslation): SiteConfig {
  const base = createEmptySiteConfig(tenantId);
  const preset = TEMPLATE_PRESETS.elegant;
  return {
    ...base,
    template: 'elegant',
    theme: preset.theme as SiteConfig['theme'],
    blocks: localizedTemplateBlocks('elegant', translate),
  };
}

function findBlock<T extends Block['type']>(config: SiteConfig, type: T): Extract<Block, { type: T }> | undefined {
  return config.blocks.find((block): block is Extract<Block, { type: T }> => block.type === type);
}

export default function WebsiteStudioAdmin() {
  const { t, i18n } = useTranslation();
  const translateDefault = useCallback((key: string) => i18n.t(`websiteStudio.defaults.${key}`), [i18n]);
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
      setConfig(normalizeSiteConfig(website.config || defaultConfig(tenantResponse.tenant.id, translateDefault), tenantResponse.tenant.id));
    }).catch(err => {
      setMessage(err instanceof Error ? err.message : i18n.t('websiteStudio.loadError'));
    });
  }, [i18n, navigate, staffToken, translateDefault]);

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

  const handleBlockAction = useCallback((blockId: string, action: BlockAction) => {
    updateConfig(current => {
      const ordered = [...current.blocks].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(block => block.id === blockId);
      if (index < 0) return current;

      if (action === 'delete') {
        ordered.splice(index, 1);
      } else if (action === 'duplicate') {
        const block = ordered[index];
        ordered.splice(index + 1, 0, { ...block, id: globalThis.crypto.randomUUID() });
      } else {
        const nextIndex = action === 'move-up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= ordered.length) return current;
        [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
      }

      return {
        ...current,
        blocks: ordered.map((block, order) => ({ ...block, order })),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [updateConfig]);

  const uploadImages = async (files: FileList | File[]) => {
    if (!config) return;
    const selected = Array.from(files).filter(file => file.type.startsWith('image/')).slice(0, 12);
    if (!selected.length) return;

    setMessage(t('websiteStudio.uploadingImages'));
    try {
      const urls: string[] = [];
      for (const file of selected) {
        if (file.size > 5 * 1024 * 1024) continue;
        const dataUrl = await readFile(file, t('websiteStudio.imageReadError'));
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
            images: [...block.images, ...urls.map(url => ({ url, alt: tenant?.business_name || t('websiteStudio.workImageAlt') }))],
          };
          return block;
        }) as SiteConfig['blocks'],
        updatedAt: new Date().toISOString(),
      }));
      setMessage(t('websiteStudio.imagesUploaded', { count: urls.length }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('websiteStudio.uploadError'));
    }
  };

  const save = async (publish = false) => {
    if (!config) return;
    setSaving(true);
    setMessage(publish ? t('websiteStudio.publishing') : t('websiteStudio.savingDraft'));
    try {
      await api.post('/api/tenant/website', { config, status: 'draft' });
      if (publish) {
        await api.post('/api/tenant/website/publish');
        setStatus('published');
        setMessage(t('websiteStudio.published'));
      } else {
        setStatus('draft');
        setMessage(t('websiteStudio.draftSaved'));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('websiteStudio.saveError'));
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
    return     <div className="ws-admin-loading">{message || t('websiteStudio.loading')}</div>;
  }

  const hero = findBlock(config, 'hero');
  const about = findBlock(config, 'about');
  const gallery = findBlock(config, 'gallery');

  return (
    <div className="ws-admin-page">
      <header className="ws-admin-header">
        <div>
          <Link to="/staff/dashboard" className="ws-admin-back">{t('websiteStudio.backToDashboard')}</Link>
          <h1>Web Studio</h1>
          <p>{t('websiteStudio.description', { name: tenant.business_name })}</p>
        </div>
        <div className="ws-admin-actions">
          <span className={`ws-admin-status ${status}`}>{status === 'published' ? t('websiteStudio.publishedStatus') : t('websiteStudio.draftStatus')}</span>
          {tenant.slug && <a href={`/website/${tenant.slug}`} target="_blank" rel="noreferrer" className="ws-admin-btn secondary">{t('websiteStudio.viewSite')}</a>}
          <button className="ws-admin-btn secondary" onClick={() => save(false)} disabled={saving}>{t('websiteStudio.save')}</button>
          <button className="ws-admin-btn primary" onClick={() => save(true)} disabled={saving}>{t('websiteStudio.publish')}</button>
        </div>
      </header>

      <main className="ws-admin-layout">
        <section className="ws-admin-editor">
          <div className="ws-admin-tabs" role="tablist">
            {([
              ['design', t('websiteStudio.tabDesign')],
              ['content', t('websiteStudio.tabContent')],
              ['images', t('websiteStudio.tabImages')],
            ] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          {tab === 'design' && (
            <div className="ws-admin-panel">
              <h2>{t('websiteStudio.designHeading')}</h2>
              <p className="ws-admin-help">{t('websiteStudio.designHelp')}</p>
              <div className="ws-template-grid">
                {(['elegant', 'modern', 'minimal'] as const).map(template => (
                  <button key={template} className={`ws-template-card ${config.template === template ? 'active' : ''}`} onClick={() => updateConfig(current => ({ ...current, ...TEMPLATE_PRESETS[template], tenantId: current.tenantId, blocks: localizedTemplateBlocks(template, translateDefault), theme: TEMPLATE_PRESETS[template].theme as SiteConfig['theme'] }))}>
                    <span className={`ws-template-swatch ${template}`} />
                    <strong>{t(`websiteStudio.templates.${template}`)}</strong>
                    <small>{t(`websiteStudio.templateDescriptions.${template}`)}</small>
                  </button>
                ))}
              </div>
              <div className="ws-color-grid">
                <label>{t('websiteStudio.primaryColor')}<input type="color" value={config.theme.primary} onChange={e => updateConfig(current => ({ ...current, theme: { ...current.theme, primary: e.target.value } }))} /></label>
                <label>{t('websiteStudio.accentColor')}<input type="color" value={config.theme.secondary} onChange={e => updateConfig(current => ({ ...current, theme: { ...current.theme, secondary: e.target.value } }))} /></label>
              </div>
              <label className="ws-field">{t('websiteStudio.seoTitle')}<input value={config.seo.title} onChange={e => updateConfig(current => ({ ...current, seo: { ...current.seo, title: e.target.value } }))} placeholder={tenant.business_name} /></label>
              <label className="ws-field">{t('websiteStudio.seoDescription')}<textarea value={config.seo.description} onChange={e => updateConfig(current => ({ ...current, seo: { ...current.seo, description: e.target.value } }))} placeholder={t('websiteStudio.seoDescriptionPlaceholder')} rows={3} /></label>
            </div>
          )}

          {tab === 'content' && (
            <div className="ws-admin-panel">
              <h2>{t('websiteStudio.contentHeading')}</h2>
              {hero && <div className="ws-admin-card"><h3>{t('websiteStudio.cover')}</h3><label className="ws-field">{t('websiteStudio.title')}<input value={hero.headline} onChange={e => updateBlock('hero', { headline: e.target.value })} placeholder={tenant.business_name} /></label><label className="ws-field">{t('websiteStudio.subtitle')}<textarea value={hero.subheadline} onChange={e => updateBlock('hero', { subheadline: e.target.value })} rows={3} placeholder={t('websiteStudio.coverSubtitlePlaceholder')} /></label><label className="ws-field">{t('websiteStudio.buttonText')}<input value={hero.ctaText} onChange={e => updateBlock('hero', { ctaText: e.target.value })} /></label></div>}
              {about && <div className="ws-admin-card"><h3>{t('websiteStudio.aboutBusiness')}</h3><label className="ws-field">{t('websiteStudio.title')}<input value={about.title} onChange={e => updateBlock('about', { title: e.target.value })} /></label><label className="ws-field">{t('websiteStudio.descriptionLabel')}<textarea value={about.content} onChange={e => updateBlock('about', { content: e.target.value })} rows={5} placeholder={t('websiteStudio.aboutPlaceholder')} /></label></div>}
            </div>
          )}

          {tab === 'images' && (
            <div className="ws-admin-panel">
              <h2>{t('websiteStudio.imagesHeading')}</h2>
              <p className="ws-admin-help">{t('websiteStudio.imagesHelp')}</p>
              <label className={`ws-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void uploadImages(e.dataTransfer.files); }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { if (e.target.files) void uploadImages(e.target.files); }} />
                <strong>{t('websiteStudio.dropImages')}</strong><span>{t('websiteStudio.chooseImages')}</span>
              </label>
              <div className="ws-image-list">
                {hero && hero.backgroundImage && <img src={hero.backgroundImage} alt={t('websiteStudio.coverAlt')} />}
                {gallery && gallery.images.map(image => <img key={image.url} src={image.url} alt={image.alt} />)}
              </div>
            </div>
          )}
          {message && <div className="ws-admin-message" role="status">{message}</div>}
        </section>

        <section className="ws-admin-preview">
          <div className="ws-preview-label"><span>{t('websiteStudio.livePreview')}</span><small>{t('websiteStudio.previewSaveHint')}</small></div>
          <div className="ws-preview-frame">
            <WebsiteRenderer config={config} tenant={previewTenant} isPreview onBlockAction={handleBlockAction} />
          </div>
        </section>
      </main>
    </div>
  );
}

function readFile(file: File, errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(file);
  });
}
