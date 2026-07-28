import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../../../../api/client';
import { CSS_FORBIDDEN_PATTERNS, DEBOUNCE_MS } from '../constants';
import type { TenantData, Service, LayoutBlock } from '../types';

interface AutoSaveProps {
  tenant: TenantData;
  services: Service[];
  gallery: string[];
  team: unknown[];
  social: Record<string, string>;
  hours: { startHour: number; endHour: number; workDays: number[] };
  layout: LayoutBlock[];
  showStatus: (msg: string, loading?: boolean) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  updatePreview: () => void;
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  setTenant: React.Dispatch<React.SetStateAction<TenantData>>;
  setLayout: React.Dispatch<React.SetStateAction<LayoutBlock[]>>;
}

export function useLandingAutoSave({
  tenant, services, gallery, team, social, hours, layout,
  showStatus, t, updatePreview,
  setServices, setTenant, setLayout,
}: AutoSaveProps) {
  const [dirty, setDirty] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveChangesRef = useRef<((manual?: boolean) => Promise<void>) | null>(null);

  const collectPayload = useCallback(() => {
    const h = { startHour: hours.startHour, endHour: hours.endHour, workDays: hours.workDays };
    return {
      ...tenant,
      opening_hours: h,
      landing_gallery: gallery,
      landing_team: team,
      landing_social_links: social,
      services: services.filter(s => !s._deleted).map(({ _deleted, ...clean }) => clean),
      servicesToDelete: services.filter(s => s._deleted && s.id).map(s => s.id),
      landing_layout: layout,
    };
  }, [tenant, hours, gallery, team, social, services, layout]);

  const saveChanges = useCallback(async (manual = false) => {
    if (!dirty && !manual) return;
    showStatus(t('staffLandingEditor.statusSaving'), true);
    try {
      const payload = collectPayload();
      const css = ((payload as Record<string, unknown>).landing_custom_css as string || '').toLowerCase();
      if (CSS_FORBIDDEN_PATTERNS.some(f => css.includes(f))) {
        showStatus(t('staffLandingEditor.statusCSSForbidden'), false);
        return;
      }
      const res = await api.put<{ services?: Service[]; tenant?: TenantData }>('/api/tenant/settings', payload);
      if (res.services) {
        setServices(res.services.map(s => ({ ...s, _deleted: false })));
      }
      if (res.tenant) {
        setTenant(res.tenant);
        setLayout((res.tenant.landing_layout as LayoutBlock[]) || layout);
      }
      setDirty(false);
      showStatus(t('staffLandingEditor.statusSaved'), false);
      updatePreview();
    } catch {
      showStatus(t('staffLandingEditor.statusSaveError'), false);
    }
  }, [dirty, collectPayload, layout, updatePreview, showStatus, t, setServices, setTenant, setLayout]);

  useEffect(() => { saveChangesRef.current = saveChanges; });

  const debounceSave = useCallback(() => {
    setDirty(true);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveChangesRef.current?.(false), DEBOUNCE_MS);
  }, []);

  return { dirty, debounceSave, saveChanges, collectPayload };
}
