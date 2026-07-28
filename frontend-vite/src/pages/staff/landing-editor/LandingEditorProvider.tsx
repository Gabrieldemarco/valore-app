import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../services/logger';
import { LandingEditorContext } from './landingEditorContext';
import { generateBrandingCSS, generatePresetCSS } from './landingThemeUtils';
import { fixImageUrl } from '../../../utils/imageUtils';
import type { EditorTab, CategoryItem, Service, StaffMember, LayoutBlock, TenantData } from './types';

function getDefaultLayout(): LayoutBlock[] {
  return [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'servicios', type: 'services', enabled: true },
    { id: 'galeria', type: 'gallery', enabled: true },
    { id: 'equipo', type: 'team', enabled: true },
    { id: 'reservar', type: 'booking', enabled: true },
    { id: 'hours', type: 'hours', enabled: true },
  ];
}

interface LandingEditorProviderProps {
  children: (props: { activeTab: EditorTab; setActiveTab: (tab: EditorTab) => void }) => React.ReactNode;
}

export default function LandingEditorProvider({ children }: LandingEditorProviderProps) {
  const { t } = useTranslation();
  const { staffToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  const [tenant, setTenant] = useState<TenantData>({});
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [team, setTeam] = useState<unknown[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [social, setSocial] = useState<Record<string, string>>({});
  const [hours, setHours] = useState({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] });
  const [layout, setLayout] = useState<LayoutBlock[]>(getDefaultLayout());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropAspect, setCropAspect] = useState(1);
  const [cropTarget, setCropTarget] = useState<{ targetKey?: string; serviceIndex?: number; staffIndex?: number } | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const galleryCropRef = useRef(false);
  const saveChangesRef = useRef<((manual?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!staffToken) navigate('/staff/login');
  }, [staffToken, navigate]);

  const showStatus = useCallback((msg: string, loading = false) => {
    setStatusMsg(msg);
    setStatusLoading(loading);
  }, []);

  const updatePreview = useCallback(() => {
    if (!previewSlug || !iframeRef.current) return;
    const url = `/p/${previewSlug}?t=${Date.now()}`;
    if (iframeRef.current.src !== url) {
      iframeRef.current.src = url;
    } else {
      try { iframeRef.current.contentWindow?.location.assign(url); } catch { iframeRef.current.src = url; }
    }
  }, [previewSlug]);

  const debounceSave = useCallback(() => {
    setDirty(true);
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveChangesRef.current?.(false), 500);
  }, []);

  const loadAllData = useCallback(async () => {
    showStatus(t('staffLandingEditor.statusLoadingData'), true);
    try {
      const data = await api.get<{ tenant: TenantData; services: Service[] }>('/api/tenant/me');
      setTenant(data.tenant);
      setPreviewSlug(data.tenant.slug as string);
      setServices(data.services.map(s => ({ ...s, _deleted: false })));
      try { const cats = await api.get<{ categories: CategoryItem[] }>('/api/tenant/categories'); setCategories(cats.categories); } catch {}
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
  }, [showStatus, t]);

  useEffect(() => { loadAllData(); }, [loadAllData]);
  useEffect(() => { if (loaded) updatePreview(); }, [loaded, updatePreview]);

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
      const forbidden = ['javascript:', 'behavior:', 'expression('];
      const css = ((payload as Record<string, unknown>).landing_custom_css as string || '').toLowerCase();
      if (forbidden.some(f => css.includes(f))) {
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
  }, [dirty, collectPayload, layout, updatePreview, showStatus, t]);
  saveChangesRef.current = saveChanges;

  const handleTenantField = useCallback((key: string, value: unknown) => {
    setTenant(prev => ({ ...prev, [key]: value }));
    debounceSave();
  }, [debounceSave]);

  const handleSocialField = useCallback((key: string, value: string) => {
    setSocial(prev => ({ ...prev, [key]: value }));
    debounceSave();
  }, [debounceSave]);

  const updateService = useCallback((index: number, field: string, value: string | number) => {
    setServices(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: field === 'duration' || field === 'price' ? (Number(value) || 0) : value };
      return next;
    });
    debounceSave();
  }, [debounceSave]);

  const toggleDeleteService = useCallback((index: number) => {
    setServices(prev => {
      const next = [...prev];
      if (next[index].id) {
        next[index] = { ...next[index], _deleted: !next[index]._deleted };
      } else {
        next.splice(index, 1);
      }
      return next;
    });
    debounceSave();
  }, [debounceSave]);

  const addService = useCallback(() => {
    setServices(prev => [...prev, { name: '', duration: 30, price: 0, image: '', _deleted: false }]);
    debounceSave();
  }, [debounceSave]);

  const toggleDay = useCallback((dayIndex: number) => {
    setHours(prev => {
      const wd = prev.workDays.includes(dayIndex) ? prev.workDays.filter(d => d !== dayIndex) : [...prev.workDays, dayIndex];
      return { ...prev, workDays: wd };
    });
    debounceSave();
  }, [debounceSave]);

  const addGalleryUrl = useCallback(() => {
    const input = document.getElementById('newGalleryUrl') as HTMLInputElement;
    if (!input) return;
    const url = input.value.trim();
    if (url) {
      setGallery(prev => [...prev, url]);
      input.value = '';
      debounceSave();
    }
  }, [debounceSave]);

  const removeGallery = useCallback((index: number) => {
    setGallery(prev => { const next = [...prev]; next.splice(index, 1); return next; });
    debounceSave();
  }, [debounceSave]);

  const updateStaff = useCallback((index: number, field: string, value: unknown) => {
    setStaffList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const saveStaff = useCallback(async (index: number) => {
    const s = staffList[index];
    if (!s.name || !s.email) { showStatus(t('staffLandingEditor.statusStaffValidation'), false); return; }
    showStatus(t('staffLandingEditor.statusSavingStaff'), true);
    try {
      const url = s.id ? `/api/tenant/staff/${s.id}` : '/api/tenant/staff';
      const method = s.id ? 'PUT' : 'POST';
      const payload = {
        name: s.name, email: s.email,
        specialties: s.specialties || [],
        active: s.active ?? true,
        photo_url: s.photo_url || null,
        bio: s.bio || null,
        individual_hours: s.individual_hours || null,
      };
      const res = await (method === 'PUT' ? api.put<{ staff: StaffMember }>(url, payload) : api.post<{ staff: StaffMember; tempPassword?: string }>(url, payload));
      if (!s.id && 'tempPassword' in res) {
        alert(t('staffLandingEditor.staffCreatedAlert', { password: (res as { tempPassword: string }).tempPassword }));
      }
      setStaffList(prev => {
        const next = [...prev];
        next[index] = { ...next[index], id: (res as { staff: StaffMember }).staff?.id || s.id };
        return next;
      });
      showStatus(t('staffLandingEditor.statusStaffSaved'), false);
    } catch { showStatus(t('staffLandingEditor.statusStaffSaveError'), false); }
  }, [staffList, showStatus, t]);

  const addStaffUI = useCallback(() => {
    setStaffList(prev => [...prev, { name: '', email: '', specialties: [], active: true }]);
  }, []);

  const toggleLayoutSection = useCallback((index: number, enabled: boolean) => {
    setLayout(prev => {
      const next = [...prev];
      next[index] = { ...next[index], enabled };
      return next;
    });
    debounceSave();
  }, [debounceSave]);

  const removeCustomBlock = useCallback((index: number) => {
    setLayout(prev => { const next = [...prev]; next.splice(index, 1); return next; });
    debounceSave();
  }, [debounceSave]);

  const addCustomBlock = useCallback(() => {
    setModalLabel('');
    setModalTitle('');
    setModalContent('');
    setModalOpen(true);
  }, []);

  const saveCustomBlockModal = useCallback(() => {
    if (!modalLabel && !modalContent) { alert(t('staffLandingEditor.customBlockValidationAlert')); return; }
    const id = 'custom-' + Date.now();
    setLayout(prev => [...prev, { id, type: 'custom', label: modalLabel || t('common.no'), enabled: true, title: modalTitle, content: modalContent }]);
    setModalOpen(false);
    debounceSave();
  }, [modalLabel, modalTitle, modalContent, debounceSave, t]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const item = (e.target as HTMLElement).closest('.layout-item') as HTMLElement;
    if (item) item.style.borderColor = 'var(--primary)';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const item = (e.target as HTMLElement).closest('.layout-item') as HTMLElement;
    if (item) item.style.borderColor = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      setLayout(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      debounceSave();
    }
    dragIndexRef.current = null;
    const item = (e.target as HTMLElement).closest('.layout-item') as HTMLElement;
    if (item) item.style.borderColor = '';
  }, [debounceSave]);

  const handleImageUpload = useCallback(async (targetKey: string, file: File | undefined, serviceIndex?: number, staffIndex?: number) => {
    if (!file || file.size > 5 * 1024 * 1024) {
      showStatus(t('staffLandingEditor.statusImageTooLarge'), false);
      return;
    }
    let aspect = 1;
    if (targetKey === 'landing_hero_image') aspect = 16 / 9;
    else if (targetKey === 'brand_logo_url') aspect = 1;
    else if (serviceIndex !== undefined) aspect = 4 / 3;
    else if (staffIndex !== undefined) aspect = 1;
    setCropAspect(aspect);
    setCropTarget({ targetKey, serviceIndex, staffIndex });
    setCropFile(file);
  }, [showStatus, t]);

  const handleCropApply = useCallback(async (dataUrl: string) => {
    if (!cropTarget) return;
    const { targetKey, serviceIndex, staffIndex } = cropTarget;
    setCropFile(null);
    setCropTarget(null);
    showStatus(t('staffLandingEditor.statusUploadingImage'), true);
    try {
      const res = await api.post<{ url?: string }>('/api/upload-image', { image: dataUrl, filename: `image-${Date.now()}.jpg` });
      const url = res.url;
      if (!url) throw new Error('No se recibió URL');
      if (serviceIndex !== undefined) {
        setServices(prev => { const next = [...prev]; next[serviceIndex] = { ...next[serviceIndex], image: url }; return next; });
      } else if (staffIndex !== undefined) {
        setStaffList(prev => { const next = [...prev]; next[staffIndex] = { ...next[staffIndex], photo_url: url }; return next; });
      } else if (targetKey === 'gallery') {
        setGallery(prev => [...prev, url!]);
      } else if (targetKey) {
        setTenant(prev => ({ ...prev, [targetKey]: url }));
      }
      debounceSave();
      showStatus(t('staffLandingEditor.statusImageUploaded'), false);
    } catch { showStatus(t('staffLandingEditor.statusImageUploadError'), false); }
  }, [cropTarget, showStatus, t, debounceSave]);

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
  }, [tenant, collectPayload, updatePreview, showStatus, t]);

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
  }, [tenant, collectPayload, updatePreview, showStatus, t]);

  return (
    <LandingEditorContext.Provider value={{
      t,
      activeTab, setActiveTab,
      tenant, services, categories, gallery, team, staffList, social, hours, layout,
      dirty, saving, statusMsg, statusLoading, previewSlug, showMobilePreview, setShowMobilePreview, loaded,
      handleTenantField, handleSocialField,
      updateService, toggleDeleteService, addService,
      setHours, toggleDay,
      addGalleryUrl, removeGallery, setGallery,
      updateStaff, saveStaff, addStaffUI, setStaffList,
      toggleLayoutSection, removeCustomBlock, addCustomBlock, setLayout,
      handleImageUpload,
      setTenant,
      saveChanges, debounceSave,
      updateCustomBackgroundAndHero, applyPresetTheme,
      showStatus, updatePreview,
      modalOpen, setModalOpen, modalLabel, setModalLabel, modalTitle, setModalTitle, modalContent, setModalContent, saveCustomBlockModal,
      cropFile, cropAspect, cropTarget,
      dragIndexRef,
      handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    }}>
      {children({ activeTab, setActiveTab })}
    </LandingEditorContext.Provider>
  );
}
