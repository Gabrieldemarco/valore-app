import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TenantData } from '../LandingTypes';

export default function useLandingTheme(tenant: TenantData | null) {
  const { t } = useTranslation();
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const fontsToLoad: string[] = [];
    if (tenant?.landing_primary_font && tenant.landing_primary_font !== 'system') fontsToLoad.push(tenant.landing_primary_font);
    if (tenant?.landing_secondary_font && tenant.landing_secondary_font !== 'system' && tenant.landing_secondary_font !== tenant.landing_primary_font) fontsToLoad.push(tenant.landing_secondary_font);
    for (const font of fontsToLoad) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      links.push(link);
    }
    if (tenant?.landing_custom_css) {
      const el = document.createElement('style');
      el.id = 'landing-custom-css';
      el.textContent = tenant.landing_custom_css;
      document.head.appendChild(el);
      return () => {
        el.remove();
        links.forEach(l => l.remove());
      };
    }
    return () => { links.forEach(l => l.remove()); };
  }, [tenant]);

  useEffect(() => {
    if (tenant?.business_name) document.title = `${tenant.business_name} | ${t('app.name')}`;
  }, [tenant, t]);

  useEffect(() => {
    if (!tenant?.brand_primary_color && !tenant?.brand_secondary_color) return;
    const root = document.documentElement;
    if (tenant.brand_primary_color) root.style.setProperty('--primary', tenant.brand_primary_color);
    if (tenant.brand_secondary_color) root.style.setProperty('--accent', tenant.brand_secondary_color);
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
    };
  }, [tenant?.brand_primary_color, tenant?.brand_secondary_color]);
}
