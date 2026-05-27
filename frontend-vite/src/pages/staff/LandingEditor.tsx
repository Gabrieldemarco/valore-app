import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/global-premium.css';

type EditorTab = 'general' | 'branding' | 'services' | 'hours' | 'gallery' | 'team' | 'social' | 'css' | 'layout';

interface Service {
  id?: number | null;
  name: string;
  duration: number;
  price: number;
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
  hero: '🏠 Hero (Portada)',
  servicios: '✂️ Servicios',
  galeria: '📷 Galería',
  equipo: '👥 Equipo',
  reservar: '📅 Reserva de Turnos',
};

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="%23334155"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236366f1" font-size="40"%3E📷%3C/text%3E%3C/svg%3E';

function fixImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return window.location.origin + url;
  return url;
}

function getDefaultLayout(): LayoutBlock[] {
  return [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'servicios', type: 'services', enabled: true },
    { id: 'galeria', type: 'gallery', enabled: true },
    { id: 'equipo', type: 'team', enabled: true },
    { id: 'reservar', type: 'booking', enabled: true },
  ];
}

export default function LandingEditor() {
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

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragIndexRef = useRef<number | null>(null);

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
    saveTimeoutRef.current = setTimeout(() => saveChanges(false), 2000);
  }, []);

  const loadAllData = useCallback(async () => {
    showStatus('Cargando datos...', true);
    try {
      const data = await api.get<{ tenant: Record<string, unknown>; services: Service[] }>('/api/tenant/me');
      setTenant(data.tenant);
      setPreviewSlug(data.tenant.slug as string);
      setServices(data.services.map(s => ({ ...s, _deleted: false })));
      setGallery((data.tenant.landing_gallery as string[]) || []);
      setTeam((data.tenant.landing_team as unknown[]) || []);
      setSocial((data.tenant.landing_social_links as Record<string, string>) || {});
      setLayout((data.tenant.landing_layout as LayoutBlock[]) || getDefaultLayout());
      if (data.tenant.opening_hours) {
        try {
          const h = typeof data.tenant.opening_hours === 'string'
            ? JSON.parse(data.tenant.opening_hours)
            : data.tenant.opening_hours;
          setHours({ startHour: h.startHour ?? 9, endHour: h.endHour ?? 19, workDays: h.workDays ?? [1, 2, 3, 4, 5] });
        } catch { console.warn('Error al parsear opening_hours') }
      }
      const staffRes = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff').catch(() => ({ staff: [] }));
      setStaffList(staffRes.staff || []);
      showStatus('Datos cargados', false);
      setLoaded(true);
    } catch {
      showStatus('Error al cargar datos', false);
    }
  }, [showStatus]);

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
    showStatus('Guardando cambios...', true);
    try {
      const payload = collectPayload();
      const forbidden = ['javascript:', 'behavior:', 'expression('];
      const css = ((payload as Record<string, unknown>).landing_custom_css as string || '').toLowerCase();
      if (forbidden.some(f => css.includes(f))) {
        showStatus('❌ CSS contiene código prohibido', false);
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
      showStatus('✅ Guardado correctamente', false);
      updatePreview();
    } catch {
      showStatus('❌ Error al guardar', false);
    }
  }, [dirty, collectPayload, layout, updatePreview, showStatus]);

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
    if (!s.name || !s.email) { showStatus('❌ Nombre y Email requeridos', false); return; }
    showStatus('Guardando peluquero...', true);
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
        alert(`Peluquero creado exitosamente. Clave temporal: ${(res as { tempPassword: string }).tempPassword}\nPor favor dale esta clave al peluquero.`);
      }
      setStaffList(prev => {
        const next = [...prev];
        next[index] = { ...next[index], id: (res as { staff: StaffMember }).staff?.id || s.id };
        return next;
      });
      showStatus('✅ Peluquero guardado', false);
    } catch { showStatus('❌ Error al guardar peluquero', false); }
  }, [staffList, showStatus]);

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
    if (!modalLabel && !modalContent) { alert('Poné al menos un nombre o el código HTML.'); return; }
    const id = 'custom-' + Date.now();
    setLayout(prev => [...prev, { id, type: 'custom', label: modalLabel || 'Sin nombre', enabled: true, title: modalTitle, content: modalContent }]);
    setModalOpen(false);
    debounceSave();
  }, [modalLabel, modalTitle, modalContent, debounceSave]);

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
      showStatus('❌ Imagen muy grande (max 5MB)', false);
      return;
    }
    showStatus('Subiendo imagen...', true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const res = await api.post<{ url?: string }>('/api/upload-image', { image: e.target?.result, filename: file.name });
          const url = res.url;
          if (!url) throw new Error('No se recibió URL');
          if (serviceIndex !== undefined) {
            setServices(prev => { const next = [...prev]; next[serviceIndex] = { ...next[serviceIndex], image: url }; return next; });
          } else if (staffIndex !== undefined) {
            setStaffList(prev => { const next = [...prev]; next[staffIndex] = { ...next[staffIndex], photo_url: url }; return next; });
          } else {
            setTenant(prev => ({ ...prev, [targetKey]: url }));
          }
          debounceSave();
          showStatus('✅ Imagen subida', false);
        } catch { showStatus('❌ Error al subir imagen', false); }
      };
      reader.readAsDataURL(file);
    } catch { showStatus('❌ Error general', false); }
  }, [debounceSave, showStatus]);

  const applyPresetTheme = useCallback((primary: string, secondary: string, stylePreset: string) => {
    setTenant(prev => ({ ...prev, brand_primary_color: primary, brand_secondary_color: secondary }));
    let customCss = '';
    if (stylePreset === 'barber') {
      customCss = `/* 🧡 ESTILO BARBERIA CLASICA: Split Hero & Lista de Precios */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
:root { --font-heading: 'Playfair Display', serif; }
h1, h2, h3, h4, h5, h6, .navbar-brand { font-family: var(--font-heading) !important; letter-spacing: 1px; font-weight: 800; }
.glass-panel, .service-card, .team-card, .btn, .glass-input, .slot-btn { border-radius: 4px !important; box-shadow: none !important; border: 1px solid rgba(217, 119, 6, 0.2) !important; }
.team-photo, .service-image { border-radius: 4px !important; }
body { display: flex !important; flex-direction: column !important; }
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
body { display: flex !important; flex-direction: column !important; }
#hero { order: 1 !important; }
#reservar { order: 2 !important; }
#servicios { order: 3 !important; }
#equipo { order: 4 !important; }
#galeria { order: 5 !important; }
.booking-section { padding: 50px 20px !important; }
.booking-form { max-width: 750px !important; margin: 0 auto !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important; background: rgba(255, 255, 255, 0.04) !important; }`;
    }
    setTenant(prev => ({ ...prev, landing_custom_css: customCss }));
    debounceSave();
    setTimeout(updatePreview, 500);
    showStatus(`🎨 Tema ${stylePreset.toUpperCase()} aplicado`, false);
  }, [debounceSave, updatePreview, showStatus]);

  const tabs: { key: EditorTab; label: string }[] = [
    { key: 'general', label: '🏢 General' },
    { key: 'branding', label: '🎨 Branding' },
    { key: 'services', label: '🛎️ Servicios' },
    { key: 'hours', label: '🕒 Horarios' },
    { key: 'gallery', label: '📷 Galería' },
    { key: 'team', label: '👥 Equipo' },
    { key: 'social', label: '🔗 Redes' },
    { key: 'css', label: '⚙️ CSS' },
    { key: 'layout', label: '🧩 Layout' },
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
        .editor-pane { width: 45%; min-width: 400px; background: var(--bg-deep); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; overflow-y: auto; }
        .tabs-nav { padding: 1rem; border-bottom: 1px solid var(--glass-border); display: flex; gap: 0.5rem; overflow-x: auto; background: rgba(0,0,0,0.2); }
        .tab-btn { padding: 0.5rem 1rem; border: 1px solid transparent; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: var(--text-muted); transition: all 0.2s; white-space: nowrap; }
        .tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
        .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.1); }
        .editor-content { padding: 2rem; flex: 1; }
        .preview-pane { flex: 1; background: #0f172a; display: flex; flex-direction: column; position: relative; }
        .preview-toolbar { background: rgba(0,0,0,0.5); color: var(--text-main); padding: 0.5rem 1rem; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); }
        iframe { width: 100%; height: 100%; border: none; background: white; }
        .flex-row { display: flex; align-items: center; }
        .flex-row-gap { display: flex; align-items: center; gap: 10px; }
        .flex-row-gap-lg { display: flex; align-items: center; gap: 15px; }
        .flex-gap-sm { display: flex; gap: 5px; }
        .hidden { display: none !important; }
        .text-muted-sm { color: var(--text-muted); font-size: 0.85rem; }
        .card { margin-bottom: 1.5rem; }
        .card h3 { margin-bottom: 1rem; font-size: 1.1rem; color: var(--text-main); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; font-weight: 500; color: var(--text-muted); }
        .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-secondary { background: rgba(255,255,255,0.1); color: var(--text-main); border: 1px solid var(--glass-border); }
        .btn-secondary:hover { background: rgba(255,255,255,0.2); }
        .btn-primary { background: linear-gradient(135deg, var(--primary), var(--accent)); color: var(--text-dark); font-weight: 600; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-danger { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid #ef4444; }
        .btn-danger:hover { background: rgba(239,68,68,0.4); }
        .status-bar { position: fixed; bottom: 20px; right: 20px; background: var(--glass-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--glass-border); color: var(--text-main); padding: 10px 20px; border-radius: 50px; font-size: 0.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275); z-index: 100; display: flex; align-items: center; gap: 10px; }
        .status-bar.visible { transform: translateY(0); }
        .status-bar:not(.visible) { transform: translateY(100px); }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .service-item { display: flex; gap: 1rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--glass-border); }
        .service-item.deleted { opacity: 0.5; text-decoration: line-through; border-color: var(--danger); }
        .service-fields { flex: 1; display: grid; gap: 0.5rem; }
        .service-actions { display: flex; flex-direction: column; justify-content: center; }
        .hours-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; text-align: center; }
        .day-check { display: flex; flex-direction: column; align-items: center; font-size: 0.8rem; gap: 4px; color: var(--text-muted); }
        .layout-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; cursor: grab; transition: opacity 0.2s; }
        .layout-item:active { cursor: grabbing; }
        .drag-handle { cursor: grab; color: var(--text-muted); font-size: 18px; user-select: none; }
        .layout-label { flex: 1; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
        .btn-icon { padding: 4px 10px; font-size: 0.8rem; }
        .centered-content { max-width: 800px; margin: 0 auto; text-align: center; }
        .section-padding { padding: 60px 24px; }
        .modal-overlay { display: none; position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); align-items: center; justify-content: center; }
        .modal-overlay.open { display: flex; }
        .gallery-item { position: relative; aspect-ratio: 1; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: block; }
        .gallery-item .remove-btn { position: absolute; top: 2px; right: 2px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; line-height: 20px; text-align: center; }
        @media (max-width: 992px), (max-height: 650px) { .main-container { flex-direction: column; overflow-y: auto; } .editor-pane { width: 100%; min-width: 100%; border-right: none; border-bottom: 1px solid var(--glass-border); overflow-y: visible; } .preview-pane { display: none !important; } .editor-content { padding: 1.5rem 1rem; } .status-bar { left: 20px; right: 20px; bottom: 10px; justify-content: center; font-size: 0.8rem; padding: 8px 16px; } }
        @media (max-width: 576px) { .app-header { flex-direction: column; gap: 0.8rem; padding: 1rem; align-items: stretch; text-align: center; } .app-header div { justify-content: center; } }
      `}</style>

      {/* Header */}
      <header className="app-header">
        <div className="flex-row-gap">
          <span style={{ fontSize: '1.5rem' }}>🎨</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Editor de Landing</h1>
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
              {trialDaysLeft > 5 ? `✨ Período de Prueba: ${trialDaysLeft} días restantes`
                : trialDaysLeft > 0 ? `⚠️ ¡Quedan ${trialDaysLeft} días de prueba!`
                : '🚨 Prueba Expirada'}
            </div>
          )}
          <Link to="/staff/dashboard" className="btn btn-secondary">← Dashboard</Link>
          <button onClick={() => saveChanges(true)} disabled={saving} className="btn btn-primary">💾 Guardar Cambios</button>
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
                <h3 className="text-gradient">Información Básica</h3>
                <div className="form-group">
                  <label>Nombre del Negocio</label>
                  <input type="text" className="glass-input" value={(tenant.business_name as string) || ''}
                    onChange={e => handleTenantField('business_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Descripción Corta</label>
                  <textarea className="glass-input" rows={3} value={(tenant.landing_description as string) || ''}
                    onChange={e => handleTenantField('landing_description', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input type="text" className="glass-input" value={(tenant.business_address as string) || ''}
                    onChange={e => handleTenantField('business_address', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Teléfono de Contacto</label>
                  <input type="tel" className="glass-input" value={(tenant.business_phone as string) || ''}
                    onChange={e => handleTenantField('business_phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={(tenant.landing_enabled as boolean) || false}
                      onChange={e => handleTenantField('landing_enabled', e.target.checked)} />{' '}
                    Página Habilitada
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Branding */}
            {activeTab === 'branding' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">Colores y Logo</h3>
                <div className="form-group">
                  <label>Color Principal</label>
                  <input type="color" className="glass-input" style={{ height: 50, padding: 2 }}
                    value={(tenant.brand_primary_color as string) || '#c5a880'}
                    onChange={e => handleTenantField('brand_primary_color', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Color Secundario</label>
                  <input type="color" className="glass-input" style={{ height: 50, padding: 2 }}
                    value={(tenant.brand_secondary_color as string) || '#d5be9b'}
                    onChange={e => handleTenantField('brand_secondary_color', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginTop: 20, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 15 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 10, color: 'var(--text-main)' }}>🎨 Temas Rápidos (Estilos de Diseño)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #8B5CF6, #D946EF)', color: 'white', fontSize: 11, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 4 }}
                      onClick={() => applyPresetTheme('#8B5CF6', '#D946EF', 'velvet')}>💜 Velvet</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)', color: 'white', fontSize: 11, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 4 }}
                      onClick={() => applyPresetTheme('#D97706', '#F59E0B', 'barber')}>🧡 Barber</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', color: 'white', fontSize: 11, padding: '10px 5px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: 4 }}
                      onClick={() => applyPresetTheme('#10B981', '#34D399', 'zen')}>💚 Zen</button>
                  </div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 8, fontSize: 11 }}>Al elegir un tema se ajustarán automáticamente los colores, tipografía y estilo visual de tu landing page.</small>
                </div>
                <div className="form-group">
                  <label>URL Logo</label>
                  <input type="url" className="glass-input" placeholder="https://..."
                    value={(tenant.brand_logo_url as string) || ''}
                    onChange={e => handleTenantField('brand_logo_url', e.target.value)} />
                  <small style={{ color: 'var(--text-muted)' }}>O subí una imagen desde tu PC</small>
                  <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 5, padding: 10 }}
                    onChange={e => handleImageUpload('brand_logo_url', e.target.files?.[0])} />
                </div>
                <div className="form-group">
                  <label>Imagen de Portada (Hero)</label>
                  <input type="url" className="glass-input" placeholder="https://..."
                    value={(tenant.landing_hero_image as string) || ''}
                    onChange={e => handleTenantField('landing_hero_image', e.target.value)} />
                  <small style={{ color: 'var(--text-muted)' }}>Imagen principal de la landing page</small>
                  <input type="file" accept="image/*" className="glass-input" style={{ marginTop: 5, padding: 10 }}
                    onChange={e => handleImageUpload('landing_hero_image', e.target.files?.[0])} />
                </div>
              </div>
            )}

            {/* Tab: Servicios */}
            {activeTab === 'services' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">Gestión de Servicios</h3>
                <div id="servicesList">
                  {services.map((s, i) => (
                    <div key={i} className={`service-item${s._deleted ? ' deleted' : ''}`}>
                      <div className="service-fields">
                        <input type="text" className="glass-input" placeholder="Nombre" value={s.name}
                          onChange={e => updateService(i, 'name', e.target.value)} />
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input type="number" className="glass-input" placeholder="Duración (min)" value={s.duration}
                            onChange={e => updateService(i, 'duration', e.target.value)} />
                          <input type="number" className="glass-input" placeholder="Precio ($)" value={s.price}
                            onChange={e => updateService(i, 'price', e.target.value)} />
                        </div>
                        <input type="url" className="glass-input" placeholder="URL Imagen" value={s.image || ''}
                          onChange={e => updateService(i, 'image', e.target.value)} />
                        {s.image && (
                          <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={fixImageUrl(s.image)} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                          </div>
                        )}
                      </div>
                      <div className="service-actions">
                        <button className="btn btn-danger" onClick={() => toggleDeleteService(i)}>
                          {s._deleted ? '↩️' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={addService}>+ Nuevo Servicio</button>
              </div>
            )}

            {/* Tab: Horarios */}
            {activeTab === 'hours' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">Horarios de Atención</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>Seleccioná los días que abrís y el rango horario.</p>
                <div className="form-group">
                  <label>Días Laborables</label>
                  <div className="hours-grid">
                    {DAY_LABELS.map((day, i) => (
                      <label key={i} className="day-check" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={hours.workDays.includes(i)}
                          onChange={() => toggleDay(i)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Hora Apertura</label>
                    <input type="number" className="glass-input" min={0} max={23} value={hours.startHour}
                      onChange={e => { setHours(p => ({ ...p, startHour: Number(e.target.value) })); debounceSave(); }} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Hora Cierre</label>
                    <input type="number" className="glass-input" min={0} max={23} value={hours.endHour}
                      onChange={e => { setHours(p => ({ ...p, endHour: Number(e.target.value) })); debounceSave(); }} />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Galería */}
            {activeTab === 'gallery' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">Galería de Imágenes</h3>
                <div className="form-group">
                  <input type="url" id="newGalleryUrl" className="glass-input" placeholder="Pegar URL de imagen..." />
                  <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                    <input type="file" id="newGalleryFile" accept="image/*" className="glass-input"
                      style={{ flex: 1, padding: 10 }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          try {
                            const res = await api.post<{ url?: string }>('/api/upload-image', { image: ev.target?.result, filename: file.name });
                            if (res.url) { setGallery(prev => [...prev, res.url!]); debounceSave(); }
                          } catch { showStatus('❌ Error al subir', false); }
                        };
                        reader.readAsDataURL(file);
                      }} />
                    <button className="btn btn-secondary" onClick={addGalleryUrl}>Agregar URL</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {gallery.map((url, i) => (
                    <div key={i} className="gallery-item">
                      <img src={fixImageUrl(url)} alt="Gallery" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                      <button className="remove-btn" onClick={() => removeGallery(i)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Equipo */}
            {activeTab === 'team' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">Equipo (Peluqueros)</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>
                  Agrega o edita los peluqueros. Cada uno tendrá su propia agenda y disponibilidad.
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
                            <input type="text" className="glass-input" placeholder="Nombre" value={s.name}
                              onChange={e => updateStaff(i, 'name', e.target.value)} />
                            <input type="email" className="glass-input" placeholder="Email (ej: juan@pelu.com)"
                              value={s.email}
                              onChange={e => updateStaff(i, 'email', e.target.value)}
                              readOnly={!!s.id} />
                            <input type="text" className="glass-input" placeholder="Especialidades (Corte, Color... separadas por coma)"
                              value={(s.specialties || []).join(', ')}
                              onChange={e => updateStaff(i, 'specialties', e.target.value.split(',').map(x => x.trim()))} />
                            <input type="text" className="glass-input" placeholder="Breve Presentación / Bio (ej: Experto en degradados)"
                              value={s.bio || ''}
                              onChange={e => updateStaff(i, 'bio', e.target.value)} />
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                              {s.photo_url ? (
                                <img src={fixImageUrl(s.photo_url)} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }} />
                              ) : (
                                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)', fontSize: 20 }}>👤</div>
                              )}
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Foto de Perfil</label>
                                <input type="file" accept="image/*" className="glass-input" style={{ fontSize: 11, padding: 5 }}
                                  onChange={e => handleImageUpload('photo_url', e.target.files?.[0], undefined, i)} />
                              </div>
                            </div>
                            <label style={{ fontSize: '0.8rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                              <input type="checkbox" checked={s.active !== false}
                                onChange={e => updateStaff(i, 'active', e.target.checked)} />{' '}
                              Activo (se muestra en landing y recibe turnos)
                            </label>
                          </div>
                          <div className="service-actions" style={{ alignSelf: 'flex-start' }}>
                            <button className="btn btn-primary" onClick={() => saveStaff(i)}>💾 Guardar</button>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 5 }}>
                          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                            <input type="checkbox" checked={hasCustomHours}
                              onChange={e => {
                                updateStaff(i, 'individual_hours', e.target.checked ? { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] } : null);
                                setStaffList(prev => [...prev]);
                              }} />
                            ⚙️ Configurar horarios personalizados
                          </label>
                          {hasCustomHours && (
                            <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>
                              <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Días Laborales del Peluquero</label>
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
                                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{day}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hora Entrada</label>
                                  <input type="number" className="glass-input" min={0} max={23} value={startH}
                                    onChange={e => {
                                      updateStaff(i, 'individual_hours', { ...s.individual_hours!, startHour: parseInt(e.target.value) });
                                      setStaffList(prev => [...prev]);
                                    }} />
                                </div>
                                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hora Salida</label>
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
                <button className="btn btn-primary" onClick={addStaffUI}>+ Nuevo Peluquero</button>
              </div>
            )}

            {/* Tab: Redes */}
            {activeTab === 'social' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">Redes Sociales</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>
                  Agrega los links completos (con https://) de tus redes sociales.
                </p>
                {[
                  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu_cuenta' },
                  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu_pagina' },
                  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/123456789' },
                  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tu_cuenta' },
                  { key: 'twitter', label: 'Twitter/X', placeholder: 'https://twitter.com/tu_cuenta' },
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
                <h3 className="text-gradient">CSS Personalizado (Avanzado)</h3>
                <div className="form-group">
                  <textarea className="glass-input" rows={10} placeholder="/* Tu CSS aquí */"
                    value={(tenant.landing_custom_css as string) || ''}
                    onChange={e => handleTenantField('landing_custom_css', e.target.value)} />
                  <small style={{ color: 'var(--danger)' }}>⚠️ Cuidado: CSS inválido puede romper tu sitio.</small>
                </div>
              </div>
            )}

            {/* Tab: Layout */}
            {activeTab === 'layout' && (
              <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-gradient">🧩 Diseño de la Página</h3>
                <p className="text-muted-sm" style={{ marginBottom: '1rem' }}>
                  Arrastrá las secciones para reordenarlas. Activá o desactivá las que no querés mostrar.
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
                        <span className="drag-handle">⠿</span>
                        <label className="layout-label">
                          <input type="checkbox" checked={item.enabled !== false}
                            onChange={e => toggleLayoutSection(index, e.target.checked)} /> {label}
                        </label>
                        {isCustom && (
                          <button className="btn btn-danger btn-icon" onClick={() => removeCustomBlock(index)}>✕</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <hr style={{ borderColor: 'var(--glass-border)', margin: '16px 0' }} />
                <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>➕ Bloques Personalizados</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Podés insertar HTML propio (iframe de Instagram, Google Maps, etc.)
                </p>
                <button className="btn btn-secondary" onClick={addCustomBlock} style={{ fontSize: '0.85rem' }}>
                  + Agregar bloque
                </button>
              </div>
            )}

          </div>
        </aside>

        {/* Preview Pane */}
        <section className="preview-pane">
          <div className="preview-toolbar">
            <span>👁️ Vista Previa en Vivo</span>
            <span style={{ opacity: 0.7 }}>Actualizado</span>
          </div>
          <iframe ref={iframeRef} title="Preview" style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
        </section>
      </div>

      {/* Modal for custom block */}
      <div className={`modal-overlay${modalOpen ? ' open' : ''}`}>
        <div className="glass-panel" style={{ width: '90%', maxWidth: 600, padding: '2rem', borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>➕ Nuevo Bloque Personalizado</h3>
          <div className="form-group">
            <label>Nombre del bloque</label>
            <input type="text" className="glass-input" placeholder="Ej: Instagram, Mapa, Video" value={modalLabel}
              onChange={e => setModalLabel(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Título (opcional)</label>
            <input type="text" className="glass-input" placeholder="Ej: Encontranos en Instagram" value={modalTitle}
              onChange={e => setModalTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Código HTML / iframe</label>
            <textarea className="glass-input" rows={6} placeholder="<iframe src=&quot;...&quot;></iframe>" value={modalContent}
              onChange={e => setModalContent(e.target.value)} />
            <small style={{ color: 'var(--text-muted)' }}>Pegá el iframe de Google Maps, Instagram, YouTube, etc.</small>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveCustomBlockModal}>Agregar bloque</button>
          </div>
        </div>
      </div>

      {/* Status Toast */}
      <div className={`status-bar${statusMsg ? ' visible' : ''}`} style={statusMsg ? { transform: 'translateY(0)' } : {}}>
        {statusLoading && <div className="spinner"></div>}
        <span id="toastMsg">{statusMsg}</span>
      </div>
    </div>
  );
}
