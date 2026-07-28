import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../api/client';
import { logger } from '../../../../services/logger';
import type { TenantData, Service, CategoryItem, StaffMember, LayoutBlock } from '../types';
import { getDefaultLayout } from '../constants';

interface DataLoaderProps {
  t: (key: string, opts?: Record<string, unknown>) => string;
  showStatus: (msg: string, loading?: boolean) => void;
  navigate: (path: string) => void;
  setTenant: React.Dispatch<React.SetStateAction<TenantData>>;
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  setTeam: React.Dispatch<React.SetStateAction<unknown[]>>;
  setSocial: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHours: React.Dispatch<React.SetStateAction<{ startHour: number; endHour: number; workDays: number[] }>>;
  setLayout: React.Dispatch<React.SetStateAction<LayoutBlock[]>>;
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
}

export function useLandingDataLoader({
  t, showStatus, navigate,
  setTenant, setServices, setGallery, setTeam, setSocial, setHours, setLayout, setStaffList,
}: DataLoaderProps) {
  const { staffToken } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    if (!staffToken) navigate('/staff/login');
  }, [staffToken, navigate]);

  const loadAllData = useCallback(async () => {
    showStatus(t('staffLandingEditor.statusLoadingData'), true);
    try {
      const data = await api.get<{ tenant: TenantData; services: Service[] }>('/api/tenant/me');
      setTenant(data.tenant);
      setPreviewSlug(data.tenant.slug as string);
      setServices(data.services.map(s => ({ ...s, _deleted: false })));
      try { const cats = await api.get<{ categories: CategoryItem[] }>('/api/tenant/categories'); setCategories(cats.categories); } catch { /* categories optional */ }
      setGallery((data.tenant.landing_gallery as string[]) || []);
      setTeam((data.tenant.landing_team as unknown[]) || []);
      setSocial((data.tenant.landing_social_links as Record<string, string>) || {});
      const savedLayout = (data.tenant.landing_layout as LayoutBlock[]) || [];
      const defaultLayout = getDefaultLayout();
      const savedIds = new Set(savedLayout.map(b => b.id));
      const merged = [...savedLayout, ...defaultLayout.filter(b => !savedIds.has(b.id))];
      setLayout(merged);
      if (data.tenant.opening_hours) {
        try {
          const h = typeof data.tenant.opening_hours === 'string'
            ? JSON.parse(data.tenant.opening_hours as string)
            : data.tenant.opening_hours;
          setHours({ startHour: h.startHour ?? 9, endHour: h.endHour ?? 19, workDays: h.workDays ?? [1, 2, 3, 4, 5] });
        } catch { logger.warn('Error al parsear opening_hours'); }
      }
      const staffRes = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff').catch(() => ({ staff: [] }));
      setStaffList(staffRes.staff || []);
      showStatus(t('staffLandingEditor.statusDataLoaded'), false);
      setLoaded(true);
    } catch {
      showStatus(t('staffLandingEditor.statusDataError'), false);
    }
  }, [showStatus, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAllData(); }, [loadAllData]); // eslint-disable-line react-hooks/set-state-in-effect

  return { loaded, previewSlug, categories, setCategories, loadAllData };
}
