import { useState, useCallback } from 'react';
import { api } from '../../../../api/client';
import { MAX_IMAGE_SIZE } from '../constants';
import type { Service, StaffMember, TenantData } from '../types';

interface ImageUploadProps {
  showStatus: (msg: string, loading?: boolean) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  debounceSave: () => void;
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  setTenant: React.Dispatch<React.SetStateAction<TenantData>>;
}

export function useLandingImageUpload({
  showStatus, t, debounceSave,
  setServices, setStaffList, setGallery, setTenant,
}: ImageUploadProps) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropAspect, setCropAspect] = useState(1);
  const [cropTarget, setCropTarget] = useState<{ targetKey?: string; serviceIndex?: number; staffIndex?: number } | null>(null);

  const handleImageUpload = useCallback(async (targetKey: string, file: File | undefined, serviceIndex?: number, staffIndex?: number) => {
    if (!file || file.size > MAX_IMAGE_SIZE) {
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

  return { cropFile, cropAspect, cropTarget, handleImageUpload };
}
