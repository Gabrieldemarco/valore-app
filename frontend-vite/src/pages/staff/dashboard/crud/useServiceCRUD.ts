import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';
import { logger } from '../../../../services/logger';
import type { ServiceItem, ServiceImage } from '../dashboardContext';

export function useServiceCRUD() {
  const { t } = useTranslation();
  const { addToast, loadServices } = useDashboard();

  const saveService = useCallback(async (
    form: { name: string; duration: string; price: string; category: string; category_id: string; description: string; image: string },
    editing: ServiceItem | null
  ) => {
    if (!form.name || !form.duration) {
      addToast(t('staffDashboard.toastNameDurationRequired'), 'error');
      return false;
    }
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        duration: parseInt(form.duration, 10),
        price: parseFloat(form.price),
        category: form.category || undefined,
        category_id: form.category_id ? parseInt(form.category_id, 10) : null,
        description: form.description || undefined,
        image: form.image || undefined,
      };
      if (editing) {
        await api.put(`/api/tenant/services/${editing.id}`, body);
        addToast(t('staffDashboard.toastServiceUpdated'), 'success');
      } else {
        await api.post('/api/tenant/services', body);
        addToast(t('staffDashboard.toastServiceCreated'), 'success');
      }
      loadServices();
      return true;
    } catch (e: unknown) {
      logger.error('Error saving service:', e);
      const msg = e instanceof Error ? e.message : t('staffDashboard.toastServiceSaveError');
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, t, loadServices]);

  const deleteService = useCallback(async (id: number, name: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteService', { name }))) return false;
    try {
      await api.delete(`/api/tenant/services/${id}`);
      addToast(t('staffDashboard.toastServiceDeleted'), 'success');
      loadServices();
      return true;
    } catch {
      addToast(t('staffDashboard.toastServiceDeleteError'), 'error');
      return false;
    }
  }, [addToast, t, loadServices]);

  const toggleServiceActive = useCallback(async (s: ServiceItem) => {
    try {
      await api.put(`/api/tenant/services/${s.id}`, { active: !s.active });
      addToast(s.active ? t('staffDashboard.toastServiceDeactivated') : t('staffDashboard.toastServiceActivated'), 'success');
      loadServices();
    } catch {
      addToast(t('staffDashboard.toastServiceToggleError'), 'error');
    }
  }, [addToast, t, loadServices]);

  const addServiceImage = useCallback(async (serviceId: number, url: string): Promise<ServiceImage | null> => {
    if (!url || !serviceId) {
      addToast('Seleccioná un servicio primero o ingresá una URL', 'error');
      return null;
    }
    try {
      const res = await api.post<{ image: ServiceImage }>(`/api/tenant/services/${serviceId}/images`, { url });
      addToast('Imagen agregada', 'success');
      return res.image;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al agregar imagen';
      addToast(msg, 'error');
      return null;
    }
  }, [addToast]);

  const deleteServiceImage = useCallback(async (serviceId: number, imageId: number) => {
    try {
      await api.delete(`/api/tenant/services/${serviceId}/images/${imageId}`);
      addToast('Imagen eliminada', 'success');
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar imagen';
      addToast(msg, 'error');
      return false;
    }
  }, [addToast]);

  const uploadServiceImage = useCallback(async (_file: File, dataUrl?: string): Promise<string | null> => {
    try {
      const res = await api.post<{ success: boolean; url: string; message: string }>('/api/upload-image', { image: dataUrl, filename: `service-${Date.now()}.jpg` });
      if (res.success && res.url) {
        addToast(t('staffDashboard.toastServiceImageUploadSuccess'), 'success');
        return res.url;
      }
      addToast(t('staffDashboard.toastServiceImageUploadError'), 'error');
      return null;
    } catch (err) {
      logger.error('Error uploading service image:', err);
      addToast(t('staffDashboard.toastServiceImageUploadError'), 'error');
      return null;
    }
  }, [addToast, t]);

  return { saveService, deleteService, toggleServiceActive, addServiceImage, deleteServiceImage, uploadServiceImage };
}
