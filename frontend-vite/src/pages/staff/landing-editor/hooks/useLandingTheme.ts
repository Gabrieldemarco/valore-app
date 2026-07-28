import { useCallback } from 'react';
import { api } from '../../../../api/client';
import { logger } from '../../../../services/logger';
import { generateBrandingCSS, generatePresetCSS } from '../landingThemeUtils';
import type { TenantData } from '../types';

interface ThemeProps {
  tenant: TenantData;
  collectPayload: () => Record<string, unknown>;
  updatePreview: () => void;
  showStatus: (msg: string, loading?: boolean) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  setTenant: React.Dispatch<React.SetStateAction<TenantData>>;
}

export function useLandingTheme({
  tenant, collectPayload, updatePreview, showStatus, t, setTenant,
}: ThemeProps) {
  const updateCustomBackgroundAndHero = useCallback((overrides?: Record<string, unknown>) => {
    const bgColor = (overrides?.landing_background_color as string) || (tenant.landing_background_color as string) || '#0f0808';
    const heroHeight = (overrides?.landing_hero_height as number) || (tenant.landing_hero_height as number) || 70;
    const heroWidth = (overrides?.landing_hero_width as number) || (tenant.landing_hero_width as number) || 100;
    const primaryTextColor = (overrides?.landing_primary_text_color as string) || (tenant.landing_primary_text_color as string) || '#1a1a1a';
    const secondaryTextColor = (overrides?.landing_secondary_text_color as string) || (tenant.landing_secondary_text_color as string) || '#666666';
    const primaryFont = (overrides?.landing_primary_font as string) || (tenant.landing_primary_font as string) || 'system';
    const secondaryFont = (overrides?.landing_secondary_font as string) || (tenant.landing_secondary_font as string) || 'system';

    const updatedCss = generateBrandingCSS({
      primary: tenant.brand_primary_color as string || '#c8827d',
      secondary: tenant.brand_secondary_color as string || '#d69c98',
      fonts: { primary: primaryFont, secondary: secondaryFont },
      heroHeight,
      heroWidth,
      primaryTextColor,
      secondaryTextColor,
      bgColor,
    });

    setTenant(prev => ({
      ...prev,
      landing_custom_css: updatedCss,
      landing_background_color: bgColor,
      landing_hero_height: heroHeight,
      landing_hero_width: heroWidth,
      landing_primary_text_color: primaryTextColor,
      landing_secondary_text_color: secondaryTextColor,
      landing_primary_font: primaryFont,
      landing_secondary_font: secondaryFont,
    }));
    showStatus(t('staffLandingEditor.statusSaving'), true);
    const payload = collectPayload();
    api.put('/api/tenant/settings', {
      ...payload,
      landing_background_color: bgColor,
      landing_hero_height: heroHeight,
      landing_hero_width: heroWidth,
      landing_primary_text_color: primaryTextColor,
      landing_secondary_text_color: secondaryTextColor,
      landing_primary_font: primaryFont,
      landing_secondary_font: secondaryFont,
      landing_custom_css: updatedCss,
    }).then(() => {
      showStatus(t('staffLandingEditor.statusDataLoaded'), false);
      updatePreview();
    }).catch((error) => {
      logger.error('Error saving background, hero and text settings:', error);
      showStatus(t('staffLandingEditor.statusSaveError'), false);
    });
  }, [tenant, collectPayload, updatePreview, showStatus, t, setTenant]);

  const applyPresetTheme = useCallback((primary: string, secondary: string, stylePreset: string) => {
    let customCss = generatePresetCSS(stylePreset, primary, secondary);
    if (stylePreset === 'light') {
      const bgColor = (tenant.landing_background_color as string) || '#ffffff';
      const heroHeight = (tenant.landing_hero_height as number) || 70;
      customCss = customCss
        .replace('.landing-view .hero { background: #ffffff !important; }', `.landing-view .hero { background: ${bgColor} !important; min-height: ${heroHeight}vh !important; }`);
    } else if (stylePreset === 'default' || stylePreset === 'velvet') {
      const bgColor = (tenant.landing_background_color as string) || '#0f0808';
      const heroHeight = (tenant.landing_hero_height as number) || 70;
      customCss = `/* Custom Background & Hero Height */
.landing-view { background: ${bgColor} !important; }
.landing-view .hero { min-height: ${heroHeight}vh !important; }`;
    }
    setTenant(prev => ({ ...prev, brand_primary_color: primary, brand_secondary_color: secondary, landing_custom_css: customCss }));
    showStatus(t('staffLandingEditor.statusSaving'), true);
    const payload = collectPayload();
    api.put('/api/tenant/settings', {
      ...payload,
      brand_primary_color: primary,
      brand_secondary_color: secondary,
      landing_custom_css: customCss,
    }).then(() => {
      showStatus(t('staffLandingEditor.statusThemeApplied', { name: stylePreset.toUpperCase() }), false);
      updatePreview();
    }).catch(() => {
      showStatus(t('staffLandingEditor.statusSaveError'), false);
    });
  }, [tenant, collectPayload, updatePreview, showStatus, t, setTenant]);

  return { updateCustomBackgroundAndHero, applyPresetTheme };
}
