import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Sparkles, Image, Users, Calendar, RotateCcw, Trash2, X, User, GripVertical, Clock } from 'lucide-react';
import { logger } from '../../services/logger';
import ImageCropModal from '../../components/ImageCropModal';


type EditorTab = 'general' | 'branding' | 'services' | 'hours' | 'gallery' | 'team' | 'social' | 'css' | 'layout';

interface Service {
  id?: number | null;
  name: string;
  duration: number;
  price: number;
  deposit_amount?: number | null;
  image?: string;
  _deleted?: boolean;
}

interface StaffMember {
  id?: number | null;
  name: string;
  email: string;
  specialties?: string[];
  active?: boolean;
  photo_url?: string | null;
  bio?: string | null;
  individual_hours?: { startHour: number; endHour: number; workDays: number[] } | null;
}

interface LayoutBlock {
  id: string;
  type: string;
  enabled: boolean;
  label?: string;
  title?: string;
  content?: string;
}

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (Portada)',
  servicios: 'Servicios',
  galeria: 'Galería',
  equipo: 'Equipo',
  reservar: 'Reserva de Turnos',
  hours: 'Horarios de Atención',
};

function sectionIcon(id: string) {
  switch (id) {
    case 'hero': return <Home size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />;
    case 'servicios': return <Sparkles size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />;
    case 'galeria': return <Image size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />;
    case 'equipo': return <Users size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />;
    case 'reservar': return <Calendar size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />;
    case 'hours': return <Clock size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />;
    default: return null;
  }
}

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

const FONT_OPTIONS = [
  { value: 'system', label: 'Sistema (predeterminada)' },
  { value: 'Playfair Display', label: 'Playfair Display (serif)' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (sans-serif)' },
  { value: 'Inter', label: 'Inter (sans-serif)' },
  { value: 'Poppins', label: 'Poppins (sans-serif)' },
  { value: 'Roboto', label: 'Roboto (sans-serif)' },
  { value: 'Lora', label: 'Lora (serif)' },
  { value: 'Merriweather', label: 'Merriweather (serif)' },
  { value: 'Montserrat', label: 'Montserrat (sans-serif)' },
  { value: 'Open Sans', label: 'Open Sans (sans-serif)' },
  { value: 'Raleway', label: 'Raleway (sans-serif)' },
  { value: 'DM Sans', label: 'DM Sans (sans-serif)' },
  { value: 'DM Serif Display', label: 'DM Serif Display (serif)' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond (serif)' },
  { value: 'Josefin Sans', label: 'Josefin Sans (sans-serif)' },
  { value: 'Quicksand', label: 'Quicksand (sans-serif)' },
  { value: 'Bodoni Moda', label: 'Bodoni Moda (serif)' },
  { value: 'Abril Fatface', label: 'Abril Fatface (display)' },
  { value: 'Archivo Black', label: 'Archivo Black (display)' },
  { value: 'Bebas Neue', label: 'Bebas Neue (display)' },
];

const CACHE_BUST = Date.now();
function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return window.location.origin + url + '?v=' + CACHE_BUST;
  return url;
}

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

export default function LandingEditor() {
  const { t } = useTranslation();
  const { staffToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  // State
  const [tenant, setTenant] = useState<Record<string, unknown>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [team, setTeam] = useState<unknown[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [social, setSocial] = useState<Record<string, string>>({});
  const [hours, setHours] = useState({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] });
  const [layout, setLayout] = useState<LayoutBlock[]>(getDefaultLayout());
  const [dirty, setDirty] = useState(false);
  const [saving, _setSaving] = useState(false);
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
    saveTimeoutRef.current = setTimeout(() => saveChangesRef.current(false), 2000);
  }, []);

  const loadAllData = useCallback(async () => {
    showStatus(t('staffLandingEditor.statusLoadingData'), true);
    try {
      const data = await api.get<{ tenant: Record<string, unknown>; services: Service[] }>('/api/tenant/me');
      setTenant(data.tenant);
      setPreviewSlug(data.tenant.slug as string);
      setServices(data.services.map(s => ({ ...s, _deleted: false })));
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
            ? JSON.parse(data.tenant.opening_hours)
            : data.tenant.opening_hours;
          setHours({ startHour: h.startHour ?? 9, endHour: h.endHour ?? 19, workDays: h.workDays ?? [1, 2, 3, 4, 5] });
        } catch { logger.warn('Error al parsear opening_hours') }
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
    const h = {
      startHour: hours.startHour,
      endHour: hours.endHour,
      workDays: hours.workDays,
    };
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
      const res = await api.put<{ services?: Service[]; tenant?: Record<string, unknown> }>('/api/tenant/settings', payload);
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
    const currentCss = (tenant.landing_custom_css as string) || '';

    const fontImport = primaryFont !== 'system'
      ? `@import url('https://fonts.googleapis.com/css2?family=${primaryFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap');\n`
      : '';
    const secondaryFontImport = secondaryFont !== 'system' && secondaryFont !== primaryFont
      ? `@import url('https://fonts.googleapis.com/css2?family=${secondaryFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap');\n`
      : '';
    const primaryFontFamily = primaryFont !== 'system' ? `'${primaryFont}', serif` : 'inherit';
    const secondaryFontFamily = secondaryFont !== 'system' ? `'${secondaryFont}', sans-serif` : 'inherit';

    let updatedCss = currentCss.replace(/\/\* Velsoie Branding \*\/[\s\S]*?\/\* End Velsoie Branding \*\//g, '');

    updatedCss += `/* Velsoie Branding */
${fontImport}${secondaryFontImport}
.landing-view { background: ${bgColor} !important; color: ${primaryTextColor} !important; }
.landing-view .hero { height: auto !important; min-height: ${heroHeight}vh !important; width: ${heroWidth}% !important; margin: 0 auto !important; }
.landing-view h1, .landing-view h2, .landing-view h3, .landing-view h4, .landing-view h5, .landing-view h6 { color: ${primaryTextColor} !important; font-family: ${primaryFontFamily} !important; }
.landing-view .service-name, .landing-view .team-name { color: ${primaryTextColor} !important; }
.landing-view .service-desc, .landing-view .team-bio { color: ${secondaryTextColor} !important; }
.landing-view body, .landing-view p, .landing-view span, .landing-view div, .landing-view input, .landing-view textarea, .landing-view button { font-family: ${secondaryFontFamily} !important; }
/* End Velsoie Branding */`;

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
      console.error('Error saving background, hero and text settings:', error);
      showStatus(t('staffLandingEditor.statusSaveError'), false);
    });
  }, [tenant, collectPayload, updatePreview, showStatus, t]);

  const applyPresetTheme = useCallback((primary: string, secondary: string, stylePreset: string) => {
    let customCss = '';
    if (stylePreset === 'barber') {
      customCss = `/* 🧡 ESTILO BARBERIA CLASICA: Split Hero & Lista de Precios */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
:root { --font-heading: 'Playfair Display', serif; }
h1, h2, h3, h4, h5, h6, .navbar-brand { font-family: var(--font-heading) !important; letter-spacing: 1px; font-weight: 800; }
.glass-panel, .service-card, .team-card, .btn, .glass-input, .slot-btn { border-radius: 4px !important; box-shadow: none !important; border: 1px solid rgba(217, 119, 6, 0.2) !important; }
.team-photo, .service-image { border-radius: 4px !important; }
.landing-view { display: flex !important; flex-direction: column !important; }
.landing-view > section { order: 99 !important; }
footer { order: 100 !important; }
#hero { order: 1 !important; }
#servicios { order: 2 !important; }
#equipo { order: 3 !important; }
#galeria { order: 4 !important; }
#reservar { order: 5 !important; }
@media (min-width: 769px) {
  .hero { display: grid !important; grid-template-columns: 1.2fr 0.8fr !important; height: 70vh !important; min-height: 550px !important; padding: 0 !important; text-align: left !important; }
  .hero::before { display: none !important; }
  .hero-image { position: relative !important; width: 100% !important; height: 100% !important; opacity: 0.95 !important; grid-column: 2 !important; grid-row: 1 !important; }
  .hero-content { position: relative !important; max-width: 100% !important; padding: 60px 5% !important; grid-column: 1 !important; grid-row: 1 !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: flex-start !important; }
}
.services-grid { display: flex !important; flex-direction: column !important; gap: 16px !important; }
.service-card { flex-direction: row !important; height: 130px !important; background: rgba(255,255,255,0.02) !important; }
.service-image { width: 160px !important; height: 100% !important; }
.service-content { padding: 16px 24px !important; }
@media (max-width: 768px) { .service-card { flex-direction: column !important; height: auto !important; } .service-image { width: 100% !important; height: 180px !important; } }`;
    } else if (stylePreset === 'zen') {
      customCss = `/* 💚 ESTILO SPA & WELLNESS: Ultra-Suave & Conversión Inmediata */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
:root { --font-heading: 'Plus Jakarta Sans', sans-serif; }
* { font-family: 'Plus Jakarta Sans', sans-serif !important; }
.glass-panel, .service-card, .team-card { border-radius: 28px !important; border: 1px solid rgba(16, 185, 129, 0.15) !important; }
.btn, .glass-input, .slot-btn { border-radius: 50px !important; }
.team-photo, .service-image { border-radius: 24px !important; }
.landing-view { display: flex !important; flex-direction: column !important; }
.landing-view > section { order: 99 !important; }
footer { order: 100 !important; }
#hero { order: 1 !important; }
#reservar { order: 2 !important; }
#servicios { order: 3 !important; }
#equipo { order: 4 !important; }
#galeria { order: 5 !important; }
.booking-section { padding: 50px 20px !important; }
.booking-form { max-width: 750px !important; margin: 0 auto !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important; background: rgba(255, 255, 255, 0.04) !important; }`;
    } else if (stylePreset === 'light') {
      const bgColor = (tenant.landing_background_color as string) || '#ffffff';
      const heroHeight = (tenant.landing_hero_height as number) || 70;
      customCss = `/* ☀️ ESTILO CLARO: Fondo Blanco & Diseño Limpio */
.landing-view { background: ${bgColor} !important; color: #1a1a1a !important; }
.landing-view .hero { background: ${bgColor} !important; min-height: ${heroHeight}vh !important; }
.landing-view .glass-panel { background: rgba(255, 255, 255, 0.9) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important; }
.landing-view .service-card { background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; color: #1a1a1a !important; }
.landing-view .team-card { background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; color: #1a1a1a !important; }
.landing-view .btn-primary { background: linear-gradient(135deg, var(--primary), var(--accent)) !important; color: #ffffff !important; }
.landing-view .glass-input { background: rgba(255, 255, 255, 0.9) !important; border: 1px solid rgba(0, 0, 0, 0.15) !important; color: #1a1a1a !important; }
.landing-view .slot-btn { background: rgba(255, 255, 255, 0.9) !important; border: 1px solid rgba(0, 0, 0, 0.15) !important; color: #1a1a1a !important; }
.landing-view .slot-btn.selected { background: linear-gradient(135deg, var(--primary), var(--accent)) !important; color: #ffffff !important; }
.landing-view h1, .landing-view h2, .landing-view h3, .landing-view h4, .landing-view h5, .landing-view h6 { color: #1a1a1a !important; }
.landing-view .service-name, .landing-view .team-name { color: #1a1a1a !important; }
.landing-view .service-desc, .landing-view .team-bio { color: #666666 !important; }
.landing-view .booking-section { background: #f9f9f9 !important; }
.landing-view .booking-form { background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important; }
.landing-view footer { background: #f9f9f9 !important; color: #1a1a1a !important; border-top: 1px solid rgba(0, 0, 0, 0.1) !important; }`;
    } else {
      const bgColor = (tenant.landing_background_color as string) || '#0f0808';
      const heroHeight = (tenant.landing_hero_height as number) || 70;
      customCss += `/* Custom Background & Hero Height */
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
  }, [collectPayload, updatePreview, showStatus, t]);

  const tabs: { key: EditorTab; label: string }[] = [
    { key: 'general', label: t('staffLandingEditor.tabGeneral') },
    { key: 'branding', label: t('staffLandingEditor.tabBranding') },
    { key: 'services', label: t('staffDashboard.tabServices') },
    { key: 'hours', label: t('staffLandingEditor.tabHours') },
    { key: 'gallery', label: t('staffLandingEditor.tabGallery') },
    { key: 'team', label: t('staffLandingEditor.tabTeam') },
    { key: 'social', label: t('staffLandingEditor.tabSocial') },
    { key: 'css', label: t('staffLandingEditor.tabCSS') },
    { key: 'layout', label: t('staffLandingEditor.tabLayout') },
  ];

  const trialDaysLeft = (() => {
    const end = tenant.trial_end_date as string;
    if (tenant.plan === 'free' && end) {
      const diff = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diff;
    }
    return null;
  })();

  return (
    <div style={{
      background: 'var(--bg-deep)', color: 'var(--text-main)',
      height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Inline styles from original */}
      <style>{`
        body { margin: 0; }
        .app-header { background: rgba(15,23,42,0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 1rem 2rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; z-index: 10; }
        .main-container { display: flex; flex: 1; overflow: hidden; }
        .editor-pane { width: 45%; min-width: 400px; background: var(--bg-deep); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; overflow: hidden; }
        .tabs-nav { padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; gap: 0.5rem; overflow-x: auto; background: rgba(0,0,0,0.2); flex-shrink: 0; }
        .tab-btn { padding: 0.5rem 0.75rem; border: 1px solid transparent; background: transparent; border-radius: 6px; cursor: pointer; font-size: 1.9rem; font-weight: 500; color: var(--text-muted); transition: all 0.2s; white-space: nowrap; flex: 1; min-width: 0; text-align: center; }
        .tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.1); }
        .editor-content { padding: 2rem; flex: 1; overflow-y: auto; }
        .preview-pane { flex: 1; background: var(--bg-deep); display: flex; flex-direction: column; position: relative; }
        .preview-toolbar { background: rgba(0,0,0,0.5); color: var(--text-main); padding: 0.5rem 1rem; font-size: 1.8rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); }
        iframe { width: 100%; height: 100%; border: none; background: var(--bg-deep); }
        .flex-row { display: flex; align-items: center; }
        .flex-row-gap { display: flex; align-items: center; gap: 10px; }
        .flex-row-gap-lg { display: flex; align-items: center; gap: 15px; }
        .flex-gap-sm { display: flex; gap: 5px; }
        .hidden { display: none !important; }
        .text-muted-sm { color: var(--text-muted); font-size: 1.85rem; }
        .card { margin-bottom: 1.5rem; }
        .card h3 { margin-bottom: 1rem; font-size: 2.1rem; color: var(--text-main); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.4rem; font-size: 1.9rem; font-weight: 500; color: var(--text-muted); }
        .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-secondary { background: rgba(255,255,255,0.1); color: var(--text-main); border: 1px solid var(--glass-border); }
        .btn-secondary:hover { background: rgba(255,255,255,0.2); }
        .btn-primary { background: linear-gradient(135deg, var(--primary), var(--accent)); color: var(--text-dark); font-weight: 600; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-danger { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid #ef4444; }
        .btn-danger:hover { background: rgba(239,68,68,0.4); }
        .status-bar { position: fixed; bottom: 20px; right: 20px; background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--glass-border); color: var(--text-main); padding: 10px 20px; border-radius: 50px; font-size: 1.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275); z-index: 100; display: flex; align-items: center; gap: 10px; }
        .status-bar.visible { transform: translateY(0); }
        .status-bar:not(.visible) { transform: translateY(100px); }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .service-item { display: flex; gap: 1rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--glass-border); }
        .service-item.deleted { opacity: 0.5; text-decoration: line-through; border-color: var(--danger); }
        .service-fields { flex: 1; display: grid; gap: 0.5rem; }
        .service-actions { display: flex; flex-direction: column; justify-content: center; }
        .hours-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; }
        .day-check { display: flex; flex-direction: column; align-items: center; font-size: 1.8rem; gap: 4px; color: var(--text-muted); }
        .layout-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; cursor: grab; transition: opacity 0.2s; }
        .layout-item:active { cursor: grabbing; }
        .drag-handle { cursor: grab; color: var(--text-muted); font-size: 19px; user-select: none; }
        .layout-label { flex: 1; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 1.95rem; }
        .btn-icon { padding: 4px 10px; font-size: 1.8rem; }
        .centered-content { max-width: 800px; margin: 0 auto; text-align: center; }
        .section-padding { padding: 60px 24px; }
        .modal-overlay { display: none; position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); align-items: center; justify-content: center; }
        .modal-overlay.open { display: flex; }
        .gallery-item { position: relative; aspect-ratio: 1; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: block; }
        .gallery-item .remove-btn { position: absolute; top: 2px; right: 2px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; line-height: 20px; text-align: center; }
        @media (max-width: 992px), (max-height: 650px) { .main-container { flex-direction: column; overflow-y: auto; } .editor-pane { width: 100%; min-width: 100%; border-right: none; border-bottom: 1px solid var(--glass-border); overflow-y: visible; } .preview-pane { display: none !important; } .preview-pane.mobile-visible { display: flex !important; position: fixed; inset: 0; z-index: 50; } .editor-content { padding: 1.5rem 1rem; } .status-bar { left: 20px; right: 20px; bottom: 10px; justify-content: center; font-size: 1.8rem; padding: 8px 16px; } .mobile-preview-btn { display: flex !important; } }
        @media (max-width: 576px) { .app-header { flex-direction: column; gap: 0.8rem; padding: 1rem; align-items: stretch; text-align: center; } .app-header div { justify-content: center; } .tabs-nav { flex-wrap: wrap; } .tab-btn { flex: 1 1 calc(33.33% - 0.5rem); min-width: 80px; font-size: 1.8rem; padding: 0.4rem 0.25rem; } .form-row { flex-direction: column !important; } .service-item { flex-direction: column !important; } .service-actions { flex-direction: row !important; justify-content: flex-end; margin-top: 0.5rem; } .mobile-preview-btn { display: flex !important; } }
        .mobile-preview-btn { display: none; position: fixed; bottom: 80px; right: 20px; z-index: 60; background: var(--primary); color: white; border: none; border-radius: 50%; width: 56px; height: 56px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); cursor: pointer; align-items: center; justify-content: center; transition: transform 0.2s; } .mobile-preview-btn:hover { transform: scale(1.1); } .mobile-preview-close { display: none; position: fixed; top: 20px; right: 20px; z-index: 61; background: rgba(0,0,0,0.8); color: white; border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; align-items: center; justify-content: center; } .mobile-preview-close.mobile-visible { display: flex !important; }
        select.glass-input { appearance: auto; background: var(--glass-bg); color: var(--text-main); border: 1px solid var(--glass-border); border-radius: 6px; font-size: 1.9rem; width: 100%; }
      `}</style>

      {/* Header */}
      <header className="app-header">
        <div className="flex-row-gap">
          <span style={{ fontSize: '1.5rem' }}>{t('staffLandingEditor.headerIcon')}</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('staffLandingEditor.headerTitle')}</h1>
        </div>
        <div className="flex-row-gap-lg">
          {trialDaysLeft !== null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              borderRadius: '20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
              background: trialDaysLeft > 5 ? 'rgba(197,168,128,0.08)' : trialDaysLeft > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
              border: trialDaysLeft > 5 ? '1px solid rgba(197,168,128,0.3)' : trialDaysLeft > 0 ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(239,68,68,0.4)',
              color: trialDaysLeft > 5 ? 'var(--primary)' : trialDaysLeft > 0 ? '#f59e0b' : '#fca5a5',
            }}>
              {trialDaysLeft > 5 ? t('staffLandingEditor.trialMany', { days: trialDaysLeft })
                : trialDaysLeft > 0 ? t('staffLandingEditor.trialFew', { days: trialDaysLeft })
                : t('staffLandingEditor.trialExpired')}
            </div>
          )}
          <Link to="/staff/dashboard" className="btn btn-secondary">{t('staffLandingEditor.dashboardLink')}</Link>
          <button onClick={() => saveChanges(true)} disabled={saving} className="btn btn-primary">{t('staffLandingEditor.saveButton')}</button>
        </div>
      </header>

      {/* Main */}
      <div className="main-container">
        {/* Editor Pane */}
        <aside className="editor-pane">
          <nav className="tabs-nav">
            {tabs.map(tab => (
              <button key={tab.key} className={`tab-btn${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="editor-content" id="editorForms">

            {/* Tab: General */}
            {activeTab === 'general' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.generalTitle')}</h3>
                <div className="form-group">
                  <label>{t('staffDashboard.businessNameLabel')}</label>
                  <input type="text" className="glass-input" value={(tenant.business_name as string) || ''}
                    onChange={e => handleTenantField('business_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('staffLandingEditor.descriptionLabel')}</label>
                  <textarea className="glass-input" rows={3} value={(tenant.landing_description as string) || ''}
                    onChange={e => handleTenantField('landing_description', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('staffDashboard.addressLabel')}</label>
                  <input type="text" className="glass-input" value={(tenant.business_address as string) || ''}
                    onChange={e => handleTenantField('business_address', e.target.value)} />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Latitud</label>
                    <input type="number" step="any" className="glass-input" value={(tenant.lat as number | undefined) ?? ''}
                      onChange={e => handleTenantField('lat', e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="-34.90" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Longitud</label>
                    <input type="number" step="any" className="glass-input" value={(tenant.lng as number | undefined) ?? ''}
                      onChange={e => handleTenantField('lng', e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="-56.18" />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('staffLandingEditor.phoneLabel')}</label>
                  <input type="tel" className="glass-input" value={(tenant.business_phone as string) || ''}
                    onChange={e => handleTenantField('business_phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={(tenant.landing_enabled as boolean) || false}
                      onChange={e => handleTenantField('landing_enabled', e.target.checked)} />{' '}
                    {t('staffLandingEditor.landingEnabledLabel')}
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Branding */}
            {activeTab === 'branding' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>{t('staffLandingEditor.brandingTitle')}</h3>

                {/* Group: Colores de Marca */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('staffLandingEditor.brandingTitle')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.brand_primary_color as string) || '#c8827d', border: '2px solid rgba(255,255,255,0.2)' }}></span>
                        {t('staffLandingEditor.primaryColorLabel')}
                      </label>
                      <input type="color" className="glass-input" style={{ height: 44, padding: 2, cursor: 'pointer' }}
                        value={(tenant.brand_primary_color as string) || '#c8827d'}
                        onChange={e => handleTenantField('brand_primary_color', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.brand_secondary_color as string) || '#d69c98', border: '2px solid rgba(255,255,255,0.2)' }}></span>
                        {t('staffLandingEditor.secondaryColorLabel')}
                      </label>
                      <input type="color" className="glass-input" style={{ height: 44, padding: 2, cursor: 'pointer' }}
                        value={(tenant.brand_secondary_color as string) || '#d69c98'}
                        onChange={e => handleTenantField('brand_secondary_color', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Group: Fondo y Hero */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('staffLandingEditor.backgroundColorLabel')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.landing_background_color as string) || '#0f0808', border: '2px solid rgba(255,255,255,0.2)' }}></span>
                        Color de Fondo
                      </label>
                      <input type="color" className="glass-input" style={{ height: 44, padding: 2, cursor: 'pointer' }}
                        value={(tenant.landing_background_color as string) || '#0f0808'}
                        onChange={e => {
                          setTenant(prev => ({ ...prev, landing_background_color: e.target.value }));
                          updateCustomBackgroundAndHero({ landing_background_color: e.target.value });
                        }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>{t('staffLandingEditor.heroHeightLabel')}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="range" min="30" max="100" style={{ flex: 1, accentColor: 'var(--primary)' }}
                          value={(tenant.landing_hero_height as number) || 70}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            setTenant(prev => ({ ...prev, landing_hero_height: v }));
                            updateCustomBackgroundAndHero({ landing_hero_height: v });
                          }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{(tenant.landing_hero_height as number) || 70}%</span>
                      </div>
                        <small style={{ color: 'var(--text-muted)' }}>{t('staffLandingEditor.heroHeightHint')}</small>
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>{t('staffLandingEditor.heroWidthLabel')}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="range" min="50" max="200" style={{ flex: 1, accentColor: 'var(--primary)' }}
                          value={(tenant.landing_hero_width as number) || 100}
                          onChange={e => {
                            const v = parseInt(e.target.value);
                            setTenant(prev => ({ ...prev, landing_hero_width: v }));
                            updateCustomBackgroundAndHero({ landing_hero_width: v });
                          }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{(tenant.landing_hero_width as number) || 100}%</span>
                      </div>
                      <small style={{ color: 'var(--text-muted)' }}>{t('staffLandingEditor.heroWidthHint')}</small>
                    </div>
                </div>

                {/* Group: Colores de Texto */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('staffLandingEditor.primaryTextColorLabel')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.landing_primary_text_color as string) || '#1a1a1a', border: '2px solid rgba(255,255,255,0.2)' }}></span>
                        {t('staffLandingEditor.primaryTextColorLabel')}
                      </label>
                      <input type="color" className="glass-input" style={{ height: 44, padding: 2, cursor: 'pointer' }}
                        value={(tenant.landing_primary_text_color as string) || '#1a1a1a'}
                        onChange={e => {
                          setTenant(prev => ({ ...prev, landing_primary_text_color: e.target.value }));
                          updateCustomBackgroundAndHero({ landing_primary_text_color: e.target.value });
                        }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: (tenant.landing_secondary_text_color as string) || '#666666', border: '2px solid rgba(255,255,255,0.2)' }}></span>
                        {t('staffLandingEditor.secondaryTextColorLabel')}
                      </label>
                      <input type="color" className="glass-input" style={{ height: 44, padding: 2, cursor: 'pointer' }}
                        value={(tenant.landing_secondary_text_color as string) || '#666666'}
                        onChange={e => {
                          setTenant(prev => ({ ...prev, landing_secondary_text_color: e.target.value }));
                          updateCustomBackgroundAndHero({ landing_secondary_text_color: e.target.value });
                        }} />
                    </div>
                  </div>
                </div>

                {/* Group: Tipografía */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Tipografía</h4>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Fuente Principal (títulos)</label>
                      <select className="glass-input" style={{ padding: '10px 12px', cursor: 'pointer' }}
                        value={(tenant.landing_primary_font as string) || 'system'}
                        onChange={e => {
                          setTenant(prev => ({ ...prev, landing_primary_font: e.target.value }));
                          updateCustomBackgroundAndHero({ landing_primary_font: e.target.value });
                        }}>
                        {FONT_OPTIONS.map(f => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.value === 'system' ? 'inherit' : f.value }}>{f.label}</option>
                        ))}
                      </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Fuente Secundaria (cuerpo)</label>
                      <select className="glass-input" style={{ padding: '10px 12px', cursor: 'pointer' }}
                        value={(tenant.landing_secondary_font as string) || 'system'}
                        onChange={e => {
                          setTenant(prev => ({ ...prev, landing_secondary_font: e.target.value }));
                          updateCustomBackgroundAndHero({ landing_secondary_font: e.target.value });
                        }}>
                        {FONT_OPTIONS.map(f => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.value === 'system' ? 'inherit' : f.value }}>{f.label}</option>
                        ))}
                      </select>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                      Las fuentes se cargan desde Google Fonts automáticamente.
                    </small>
                  </div>
                </div>

                {/* Quick Themes */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('staffLandingEditor.quickThemesTitle')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #c8827d, #d69c98)', color: 'white', fontSize: 12, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 8, transition: 'transform 0.15s' }}
                      onClick={() => applyPresetTheme('#c8827d', '#d69c98', 'default')}>{t('staffLandingEditor.themeDefault')}</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: 'white', fontSize: 12, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 8 }}
                      onClick={() => applyPresetTheme('#7C3AED', '#A78BFA', 'velvet')}>{t('staffLandingEditor.themeVelvet')}</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', color: 'white', fontSize: 12, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 8 }}
                      onClick={() => applyPresetTheme('#B45309', '#D97706', 'barber')}>{t('staffLandingEditor.themeBarber')}</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #059669, #10B981)', color: 'white', fontSize: 12, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 8 }}
                      onClick={() => applyPresetTheme('#059669', '#10B981', 'zen')}>{t('staffLandingEditor.themeZen')}</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)', color: 'white', fontSize: 12, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 8 }}
                      onClick={() => applyPresetTheme('#3B82F6', '#60A5FA', 'light')}>{t('staffLandingEditor.themeLight')}</button>
                  </div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 8, fontSize: 12 }}>{t('staffLandingEditor.quickThemeHint')}</small>
                </div>

                {/* Group: Logo y Hero Image */}
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                   <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Imágenes</h4>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>{t('staffLandingEditor.logoUrlLabel')}</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!!tenant.brand_logo_url && (
                        <img src={fixImageUrl(tenant.brand_logo_url as string)} alt="logo" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <input type="url" className="glass-input" style={{ flex: 1 }} placeholder="https://..."
                        value={(tenant.brand_logo_url as string) || ''}
                        onChange={e => handleTenantField('brand_logo_url', e.target.value)} />
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{t('staffLandingEditor.logoUploadHint')}</small>
                    <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 5, padding: 10 }}
                      onChange={e => handleImageUpload('brand_logo_url', e.target.files?.[0])} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>{t('staffLandingEditor.heroImageLabel')}</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!!tenant.landing_hero_image && (
                        <img src={fixImageUrl(tenant.landing_hero_image as string)} alt="hero" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <input type="url" className="glass-input" style={{ flex: 1 }} placeholder="https://..."
                        value={(tenant.landing_hero_image as string) || ''}
                        onChange={e => handleTenantField('landing_hero_image', e.target.value)} />
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>{t('staffLandingEditor.heroImageHint')}</small>
                    <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 5, padding: 10 }}
                      onChange={e => handleImageUpload('landing_hero_image', e.target.files?.[0])} />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Servicios */}
            {activeTab === 'services' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.servicesTitle')}</h3>
                <div id="servicesList">
                  {services.map((s, i) => (
                    <div key={i} className={`service-item${s._deleted ? ' deleted' : ''}`}>
                      <div className="service-fields">
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                            {t('staffLandingEditor.serviceNameLabel')}
                          </label>
                          <input type="text" className="glass-input" placeholder={t('staffLandingEditor.serviceNamePlaceholder')} value={s.name}
                            onChange={e => updateService(i, 'name', e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                              {t('staffLandingEditor.serviceDurationLabel')}
                            </label>
                            <input type="number" className="glass-input" placeholder={t('staffLandingEditor.serviceDurationPlaceholder')} value={s.duration}
                              onChange={e => updateService(i, 'duration', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                              {t('staffLandingEditor.servicePriceLabel')}
                            </label>
                            <input type="number" className="glass-input" placeholder={t('staffLandingEditor.servicePricePlaceholder')} value={s.price}
                              onChange={e => updateService(i, 'price', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ width: '100px', marginBottom: 0 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                              {t('staffLandingEditor.serviceDepositLabel')}
                            </label>
                            <input type="number" className="glass-input" placeholder={t('staffLandingEditor.serviceDepositPlaceholder')} value={s.deposit_amount ?? ''}
                              onChange={e => updateService(i, 'deposit_amount', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                            {t('staffLandingEditor.serviceImageLabel')}
                          </label>
                          <input type="url" className="glass-input" placeholder={t('staffLandingEditor.serviceImagePlaceholder')} value={s.image || ''}
                            onChange={e => updateService(i, 'image', e.target.value)} />
                          <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 4, padding: 6, fontSize: 13 }}
                            onChange={e => handleImageUpload('service_image', e.target.files?.[0], i)} />
                        </div>
                        {s.image && (
                          <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={fixImageUrl(s.image)} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                          </div>
                        )}
                      </div>
                      <div className="service-actions">
                        <button className="btn btn-danger" onClick={() => toggleDeleteService(i)}>
                          {s._deleted ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={addService}>{t('staffLandingEditor.serviceNewButton')}</button>
              </div>
            )}

            {/* Tab: Horarios */}
            {activeTab === 'hours' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffDashboard.hoursTitle')}</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>{t('staffLandingEditor.hoursHint')}</p>
                <div className="form-group">
                  <label>{t('staffDashboard.workDaysLabel')}</label>
                  <div className="hours-grid">
                    {DAY_LABELS.map((day, i) => (
                      <label key={i} className="day-check" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={hours.workDays.includes(i)}
                          onChange={() => toggleDay(i)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>{t('staffDashboard.openingHourLabel')}</label>
                    <input type="number" className="glass-input" min={0} max={23} value={hours.startHour}
                      onChange={e => { setHours(p => ({ ...p, startHour: Number(e.target.value) })); debounceSave(); }} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>{t('staffDashboard.closingHourLabel')}</label>
                    <input type="number" className="glass-input" min={0} max={23} value={hours.endHour}
                      onChange={e => { setHours(p => ({ ...p, endHour: Number(e.target.value) })); debounceSave(); }} />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Galería */}
            {activeTab === 'gallery' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.galleryTitle')}</h3>
                <div className="form-group">
                  <input type="url" id="newGalleryUrl" className="glass-input" placeholder={t('staffLandingEditor.galleryUrlPlaceholder')} />
                  <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                    <input type="file" id="newGalleryFile" accept="image/*" className="glass-input"
                      style={{ flex: 1, padding: 10 }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          showStatus(t('staffLandingEditor.statusImageTooLarge'), false);
                          return;
                        }
                        setCropAspect(1);
                        galleryCropRef.current = true;
                        setCropTarget({ targetKey: 'gallery' });
                        setCropFile(file);
                      }} />
                    <button className="btn btn-secondary" onClick={addGalleryUrl}>{t('staffLandingEditor.galleryAddUrlButton')}</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {gallery.map((url, i) => (
                    <div key={i} className="gallery-item">
                      <img src={fixImageUrl(url)} alt="Gallery" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                      <button className="remove-btn" onClick={() => removeGallery(i)}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Equipo */}
            {activeTab === 'team' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.teamTitle')}</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>
                  {t('staffLandingEditor.teamHint')}
                </p>
                <div id="staffListContainer">
                  {staffList.map((s, i) => {
                    const hasCustomHours = !!s.individual_hours;
                    const workDays = (s.individual_hours?.workDays || []).map(Number);
                    const startH = s.individual_hours?.startHour ?? 9;
                    const endH = s.individual_hours?.endHour ?? 19;
                    return (
                      <div key={i} className="service-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 15 }}>
                        <div style={{ display: 'flex', gap: 15, width: '100%' }}>
                          <div className="service-fields" style={{ flex: 1 }}>
                            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.staffNamePlaceholder')} value={s.name}
                              onChange={e => updateStaff(i, 'name', e.target.value)} />
                            <input type="email" className="glass-input" placeholder={t('staffLandingEditor.staffEmailPlaceholder')}
                              value={s.email}
                              onChange={e => updateStaff(i, 'email', e.target.value)}
                              readOnly={!!s.id} />
                            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.staffSpecialtiesPlaceholder')}
                              value={(s.specialties || []).join(', ')}
                              onChange={e => updateStaff(i, 'specialties', e.target.value.split(',').map(x => x.trim()))} />
                            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.staffBioPlaceholder')}
                              value={s.bio || ''}
                              onChange={e => updateStaff(i, 'bio', e.target.value)} />
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                              {s.photo_url ? (
                                <img src={fixImageUrl(s.photo_url)} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                              ) : (
                                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)' }}><User size={20} /></div>
                              )}
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('staffLandingEditor.staffPhotoLabel')}</label>
                                <input type="file" accept="image/*" className="glass-input" style={{ fontSize: 12, padding: 5 }}
                                  onChange={e => handleImageUpload('photo_url', e.target.files?.[0], undefined, i)} />
                              </div>
                            </div>
                            <label style={{ fontSize: '0.8rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                              <input type="checkbox" checked={s.active !== false}
                                onChange={e => updateStaff(i, 'active', e.target.checked)} />{' '}
                              {t('staffLandingEditor.staffActiveLabel')}
                            </label>
                          </div>
                          <div className="service-actions" style={{ alignSelf: 'flex-start' }}>
                            <button className="btn btn-primary" onClick={() => saveStaff(i)}>{t('staffLandingEditor.staffSaveButton')}</button>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 5 }}>
                          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                            <input type="checkbox" checked={hasCustomHours}
                              onChange={e => {
                                updateStaff(i, 'individual_hours', e.target.checked ? { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] } : null);
                                setStaffList(prev => [...prev]);
                              }} />
                            {t('staffLandingEditor.staffCustomHoursLabel')}
                          </label>
                          {hasCustomHours && (
                            <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>
                              <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('staffLandingEditor.staffWorkDaysLabel')}</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                  {DAY_LABELS.map((day, dIdx) => (
                                    <label key={dIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                      <input type="checkbox" checked={workDays.includes(dIdx)}
                                        onChange={e => {
                                          const wd = e.target.checked
                                            ? [...(s.individual_hours?.workDays || []), dIdx]
                                            : (s.individual_hours?.workDays || []).filter(d => d !== dIdx);
                                          updateStaff(i, 'individual_hours', { ...s.individual_hours!, workDays: wd });
                                        }}
                                        style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{day}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('staffLandingEditor.staffStartHourLabel')}</label>
                                  <input type="number" className="glass-input" min={0} max={23} value={startH}
                                    onChange={e => {
                                      updateStaff(i, 'individual_hours', { ...s.individual_hours!, startHour: parseInt(e.target.value) });
                                      setStaffList(prev => [...prev]);
                                    }} />
                                </div>
                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('staffLandingEditor.staffEndHourLabel')}</label>
                                  <input type="number" className="glass-input" min={0} max={23} value={endH}
                                    onChange={e => {
                                      updateStaff(i, 'individual_hours', { ...s.individual_hours!, endHour: parseInt(e.target.value) });
                                      setStaffList(prev => [...prev]);
                                    }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn-primary" onClick={addStaffUI}>{t('staffDashboard.staffNewButton')}</button>
              </div>
            )}

            {/* Tab: Redes */}
            {activeTab === 'social' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.socialTitle')}</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>
                  {t('staffLandingEditor.socialHint')}
                </p>
                {[
                  { key: 'instagram', label: t('staffLandingEditor.socialInstagram'), placeholder: 'https://instagram.com/tu_cuenta' },
                  { key: 'facebook', label: t('staffLandingEditor.socialFacebook'), placeholder: 'https://facebook.com/tu_pagina' },
                  { key: 'whatsapp', label: t('staffLandingEditor.socialWhatsApp'), placeholder: 'https://wa.me/123456789' },
                  { key: 'tiktok', label: t('staffLandingEditor.socialTikTok'), placeholder: 'https://tiktok.com/@tu_cuenta' },
                  { key: 'twitter', label: t('staffLandingEditor.socialTwitter'), placeholder: 'https://twitter.com/tu_cuenta' },
                ].map(sm => (
                  <div key={sm.key} className="form-group">
                    <label>{sm.label}</label>
                    <input type="url" className="glass-input" placeholder={sm.placeholder}
                      value={social[sm.key] || ''}
                      onChange={e => handleSocialField(sm.key, e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {/* Tab: CSS */}
            {activeTab === 'css' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.cssTitle')}</h3>
                <div className="form-group">
                  <textarea className="glass-input" rows={10} placeholder={t('staffLandingEditor.cssPlaceholder')}
                    value={(tenant.landing_custom_css as string) || ''}
                    onChange={e => handleTenantField('landing_custom_css', e.target.value)} />
                  <small style={{ color: 'var(--danger)' }}>{t('staffLandingEditor.cssWarning')}</small>
                </div>
              </div>
            )}

            {/* Tab: Layout */}
            {activeTab === 'layout' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">{t('staffLandingEditor.layoutTitle')}</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>
                  {t('staffLandingEditor.layoutHint')}
                </p>
                <div id="layoutSorter" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(layout.length ? layout : getDefaultLayout()).map((item, index) => {
                    const isCustom = item.type === 'custom';
                    const label = isCustom ? (item.label || 'Bloque personalizado') : (SECTION_LABELS[item.id] || item.id);
                    return (
                      <div key={item.id} className="layout-item" draggable
                        onDragStart={e => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, index)}
                        onDragEnd={() => { dragIndexRef.current = null; }}>
                        <span className="drag-handle"><GripVertical size={16} /></span>
                        <label className="layout-label">
                          <input type="checkbox" checked={item.enabled !== false}
                            onChange={e => toggleLayoutSection(index, e.target.checked)} /> {sectionIcon(item.id)}{label}
                        </label>
                        {isCustom && (
                          <button className="btn btn-danger btn-icon" onClick={() => removeCustomBlock(index)}><X size={14} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <hr style={{ borderColor: 'var(--glass-border)', margin: '16px 0' }} />
                <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{t('staffLandingEditor.customBlocksTitle')}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  {t('staffLandingEditor.customBlocksHint')}
                </p>
                <button className="btn btn-secondary" onClick={addCustomBlock} style={{ fontSize: '0.85rem' }}>
                  {t('staffLandingEditor.customBlockAddButton')}
                </button>
              </div>
            )}

          </div>
        </aside>

        {/* Preview Pane */}
        <section className={`preview-pane${showMobilePreview ? ' mobile-visible' : ''}`}>
          <div className="preview-toolbar">
            <span>{t('staffLandingEditor.previewLabel')}</span>
            <span style={{ opacity: 0.7 }}>{t('staffLandingEditor.previewUpdated')}</span>
          </div>
          <iframe ref={iframeRef} title="Preview" style={{ width: '100%', height: '100%', border: 'none', background: 'var(--bg-deep)' }} />
        </section>

        {/* Mobile Preview Toggle Button */}
        <button 
          className="mobile-preview-btn" 
          onClick={() => setShowMobilePreview(!showMobilePreview)}
          aria-label="Toggle preview"
        >
          <Image size={24} />
        </button>

        {/* Mobile Preview Close Button */}
        <button 
          className={`mobile-preview-close${showMobilePreview ? ' mobile-visible' : ''}`}
          onClick={() => setShowMobilePreview(false)}
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal for custom block */}
      <div className={`modal-overlay${modalOpen ? ' open' : ''}`}>
        <div className="glass-panel" style={{ width: '90%', maxWidth: 600, padding: '2rem', borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>{t('staffLandingEditor.customBlockModalTitle')}</h3>
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockNameLabel')}</label>
            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.customBlockNamePlaceholder')} value={modalLabel}
              onChange={e => setModalLabel(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockTitleLabel')}</label>
            <input type="text" className="glass-input" placeholder={t('staffLandingEditor.customBlockTitlePlaceholder')} value={modalTitle}
              onChange={e => setModalTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('staffLandingEditor.customBlockContentLabel')}</label>
            <textarea className="glass-input" rows={6} placeholder={t('staffLandingEditor.customBlockContentPlaceholder')} value={modalContent}
              onChange={e => setModalContent(e.target.value)} />
            <small style={{ color: 'var(--text-muted)' }}>{t('staffLandingEditor.customBlockContentHint')}</small>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>{t('staffLandingEditor.customBlockCancel')}</button>
            <button className="btn btn-primary" onClick={saveCustomBlockModal}>{t('staffLandingEditor.customBlockAdd')}</button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropFile && (
        <ImageCropModal
          open
          file={cropFile}
          aspectRatio={cropAspect}
          onApply={handleCropApply}
          onCancel={() => { setCropFile(null); setCropTarget(null); galleryCropRef.current = false; }}
        />
      )}

      {/* Status Toast */}
      <div className={`status-bar${statusMsg ? ' visible' : ''}`} style={statusMsg ? { transform: 'translateY(0)' } : {}}>
        {statusLoading && <div className="spinner"></div>}
        <span id="toastMsg">{statusMsg}</span>
      </div>
    </div>
  );
}
