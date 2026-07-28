import React from 'react';
import { useLandingEditor } from '../landingEditorContext';
import { FONT_OPTIONS, fixImageUrl } from '../landingEditorUtils';
import { THEME_PRESETS, BRAND_DEFAULTS } from '../landingThemeUtils';

export default function BrandingTab() {
  const { t, tenant, handleTenantField, updateCustomBackgroundAndHero, applyPresetTheme, handleImageUpload } = useLandingEditor();

  return (
    <div className="card glass-panel p-24">
      <h3 className="text-gradient mb-24">{t('staffLandingEditor.brandingTitle')}</h3>

      {/* Colores de Marca */}
      <div className="card-base mb-24">
        <h4 className="text-primary font-600 mb-16 text-uppercase">{t('staffLandingEditor.brandingTitle')}</h4>
        <div className="grid-2">
          <div className="form-group m-0">
            <label className="flex-center text-sm" style={{ gap: 6 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.brand_primary_color as string) || BRAND_DEFAULTS.primary, border: '2px solid rgba(255,255,255,0.2)' }}></span>
              {t('staffLandingEditor.primaryColorLabel')}
            </label>
            <input type="color" className="glass-input cursor-pointer" style={{ height: 44, padding: 2 }}
              value={(tenant.brand_primary_color as string) || BRAND_DEFAULTS.primary}
              onChange={e => handleTenantField('brand_primary_color', e.target.value)} />
          </div>
          <div className="form-group m-0">
            <label className="flex-center text-sm" style={{ gap: 6 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.brand_secondary_color as string) || BRAND_DEFAULTS.secondary, border: '2px solid rgba(255,255,255,0.2)' }}></span>
              {t('staffLandingEditor.secondaryColorLabel')}
            </label>
            <input type="color" className="glass-input cursor-pointer" style={{ height: 44, padding: 2 }}
              value={(tenant.brand_secondary_color as string) || BRAND_DEFAULTS.secondary}
              onChange={e => handleTenantField('brand_secondary_color', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Fondo y Hero */}
      <div className="card-base mb-24">
        <h4 className="text-primary font-600 mb-16 text-uppercase">{t('staffLandingEditor.backgroundColorLabel')}</h4>
        <div className="grid-2">
          <div className="form-group m-0">
            <label className="flex-center text-sm" style={{ gap: 6 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.landing_background_color as string) || '#0f0808', border: '2px solid rgba(255,255,255,0.2)' }}></span>
              {t('staffLandingEditor.backgroundColorLabel')}
            </label>
            <input type="color" className="glass-input cursor-pointer" style={{ height: 44, padding: 2 }}
              value={(tenant.landing_background_color as string) || '#0f0808'}
              onChange={e => updateCustomBackgroundAndHero({ landing_background_color: e.target.value })} />
          </div>
          <div className="form-group m-0">
            <label className="text-sm">{t('staffLandingEditor.heroHeightLabel')}</label>
            <div className="flex-center flex-gap-8">
              <input type="range" min="30" max="100" className="flex-1" style={{ accentColor: 'var(--primary)' }}
                value={(tenant.landing_hero_height as number) || 70}
                onChange={e => updateCustomBackgroundAndHero({ landing_hero_height: parseInt(e.target.value) })} />
              <span className="font-600 text-right" style={{ fontSize: '0.9rem', minWidth: 30 }}>{(tenant.landing_hero_height as number) || 70}%</span>
            </div>
            <small className="text-muted">{t('staffLandingEditor.heroHeightHint')}</small>
          </div>
          <div className="form-group m-0">
            <label className="text-sm">{t('staffLandingEditor.heroWidthLabel')}</label>
            <div className="flex-center flex-gap-8">
              <input type="range" min="50" max="200" className="flex-1" style={{ accentColor: 'var(--primary)' }}
                value={(tenant.landing_hero_width as number) || 100}
                onChange={e => updateCustomBackgroundAndHero({ landing_hero_width: parseInt(e.target.value) })} />
              <span className="font-600 text-right" style={{ fontSize: '0.9rem', minWidth: 30 }}>{(tenant.landing_hero_width as number) || 100}%</span>
            </div>
            <small className="text-muted">{t('staffLandingEditor.heroWidthHint')}</small>
          </div>
        </div>
      </div>

      {/* Colores de Texto */}
      <div className="card-base mb-24">
        <h4 className="text-primary font-600 mb-16 text-uppercase">{t('staffLandingEditor.primaryTextColorLabel')}</h4>
        <div className="grid-2">
          <div className="form-group m-0">
            <label className="flex-center text-sm" style={{ gap: 6 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.landing_primary_text_color as string) || '#1a1a1a', border: '2px solid rgba(255,255,255,0.2)' }}></span>
              {t('staffLandingEditor.primaryTextColorLabel')}
            </label>
            <input type="color" className="glass-input cursor-pointer" style={{ height: 44, padding: 2 }}
              value={(tenant.landing_primary_text_color as string) || '#1a1a1a'}
              onChange={e => updateCustomBackgroundAndHero({ landing_primary_text_color: e.target.value })} />
          </div>
          <div className="form-group m-0">
            <label className="flex-center text-sm" style={{ gap: 6 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.landing_secondary_text_color as string) || '#666666', border: '2px solid rgba(255,255,255,0.2)' }}></span>
              {t('staffLandingEditor.secondaryTextColorLabel')}
            </label>
            <input type="color" className="glass-input cursor-pointer" style={{ height: 44, padding: 2 }}
              value={(tenant.landing_secondary_text_color as string) || '#666666'}
              onChange={e => updateCustomBackgroundAndHero({ landing_secondary_text_color: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Tipografía */}
      <div className="card-base mb-24">
        <h4 className="text-primary font-600 mb-16 text-uppercase">{t('staffLandingEditor.typographyTitle')}</h4>
        <div className="form-group">
          <label className="text-sm">{t('staffLandingEditor.primaryFontLabel')}</label>
          <select className="glass-input cursor-pointer" style={{ padding: '10px 12px' }}
            value={(tenant.landing_primary_font as string) || 'system'}
            onChange={e => updateCustomBackgroundAndHero({ landing_primary_font: e.target.value })}>
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value === 'system' ? 'inherit' : f.value }}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group m-0">
          <label className="text-sm">{t('staffLandingEditor.secondaryFontLabel')}</label>
          <select className="glass-input cursor-pointer" style={{ padding: '10px 12px' }}
            value={(tenant.landing_secondary_font as string) || 'system'}
            onChange={e => updateCustomBackgroundAndHero({ landing_secondary_font: e.target.value })}>
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value === 'system' ? 'inherit' : f.value }}>{f.label}</option>
            ))}
          </select>
          <small className="text-muted block" style={{ marginTop: 6 }}>
            {t('staffLandingEditor.fontsHint')}
          </small>
        </div>
      </div>

      {/* Quick Themes */}
      <div className="card-base mb-24">
        <h4 className="text-primary font-600 mb-16 text-uppercase">{t('staffLandingEditor.quickThemesTitle')}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
          {Object.entries(THEME_PRESETS).map(([key, preset]) => (
            <button key={key} type="button" className="btn" style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`, color: 'white', fontSize: 13, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 8, transition: key === 'default' ? 'transform 0.15s' : 'none' }}
              onClick={() => applyPresetTheme(preset.primary, preset.secondary, key)}>{t('staffLandingEditor.theme' + key.charAt(0).toUpperCase() + key.slice(1))}</button>
          ))}
        </div>
        <small className="text-muted block mt-8" style={{ fontSize: 13 }}>{t('staffLandingEditor.quickThemeHint')}</small>
      </div>

      {/* Logo y Hero Image */}
      <div className="card-base mb-24">
        <h4 className="text-primary font-600 mb-16 text-uppercase">{t('staffLandingEditor.imagesTitle')}</h4>
        <div className="form-group">
          <label className="text-sm">{t('staffLandingEditor.logoUrlLabel')}</label>
          <div className="flex-center flex-gap-8">
            {!!tenant.brand_logo_url && (
              <img src={fixImageUrl(tenant.brand_logo_url as string)} alt={t('brandingTab.altLogo')} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <input type="url" className="glass-input flex-1" placeholder="https://..."
              value={(tenant.brand_logo_url as string) || ''}
              onChange={e => handleTenantField('brand_logo_url', e.target.value)} />
          </div>
          <small className="text-muted">{t('staffLandingEditor.logoUploadHint')}</small>
          <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 5, padding: 10 }}
            onChange={e => handleImageUpload('brand_logo_url', e.target.files?.[0])} />
        </div>
        <div className="form-group m-0">
          <label className="text-sm">{t('staffLandingEditor.heroImageLabel')}</label>
          <div className="flex-center flex-gap-8">
            {!!tenant.landing_hero_image && (
              <img src={fixImageUrl(tenant.landing_hero_image as string)} alt={t('brandingTab.altHero')} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <input type="url" className="glass-input flex-1" placeholder="https://..."
              value={(tenant.landing_hero_image as string) || ''}
              onChange={e => handleTenantField('landing_hero_image', e.target.value)} />
          </div>
          <small className="text-muted">{t('staffLandingEditor.heroImageHint')}</small>
          <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 5, padding: 10 }}
            onChange={e => handleImageUpload('landing_hero_image', e.target.files?.[0])} />
        </div>
      </div>
    </div>
  );
}
