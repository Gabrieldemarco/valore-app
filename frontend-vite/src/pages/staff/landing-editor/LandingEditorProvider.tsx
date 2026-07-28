import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../api/client';
import { LandingEditorContext } from './landingEditorContext';
import type { EditorTab, Service, StaffMember, LayoutBlock, TenantData } from './types';
import { getDefaultLayout } from './constants';
import { useLandingDataLoader } from './hooks/useLandingDataLoader';
import { useLandingAutoSave } from './hooks/useLandingAutoSave';
import { useLandingImageUpload } from './hooks/useLandingImageUpload';
import { useLandingTheme } from './hooks/useLandingTheme';

interface LandingEditorProviderProps {
  children: (props: { activeTab: EditorTab; setActiveTab: (tab: EditorTab) => void }) => React.ReactNode;
}

export default function LandingEditorProvider({ children }: LandingEditorProviderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  const [tenant, setTenant] = useState<TenantData>({});
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [team, setTeam] = useState<unknown[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [social, setSocial] = useState<Record<string, string>>({});
  const [hours, setHours] = useState({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] });
  const [layout, setLayout] = useState<LayoutBlock[]>(getDefaultLayout());
  const [statusMsg, setStatusMsg] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  const showStatus = useCallback((msg: string, loading = false) => {
    setStatusMsg(msg);
    setStatusLoading(loading);
  }, []);

  const { loaded, previewSlug, categories } = useLandingDataLoader({
    t, showStatus, navigate,
    setTenant, setServices, setGallery, setTeam, setSocial, setHours, setLayout, setStaffList,
  });

  const updatePreview = useCallback(() => {
    if (!previewSlug || !iframeRef.current) return;
    const url = `/p/${previewSlug}?t=${Date.now()}`;
    if (iframeRef.current.src !== url) {
      iframeRef.current.src = url;
    } else {
      try { iframeRef.current.contentWindow?.location.assign(url); } catch { iframeRef.current.src = url; }
    }
  }, [previewSlug]);

  useEffect(() => { if (loaded) updatePreview(); }, [loaded, updatePreview]);

  const { dirty, saving, debounceSave, saveChanges, collectPayload } = useLandingAutoSave({
    tenant, services, gallery, team, social, hours, layout,
    showStatus, t, updatePreview,
    setServices, setTenant, setLayout,
  });

  const { cropFile, cropAspect, cropTarget, handleImageUpload } = useLandingImageUpload({
    showStatus, t, debounceSave,
    setServices, setStaffList, setGallery, setTenant,
  });

  const { updateCustomBackgroundAndHero, applyPresetTheme } = useLandingTheme({
    tenant, collectPayload, updatePreview, showStatus, t, setTenant,
  });

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
