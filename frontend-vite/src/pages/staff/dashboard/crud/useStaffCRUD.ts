import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';
import { logger } from '../../../../services/logger';
import type { StaffMember } from '../dashboardContext';

export function useStaffCRUD() {
  const { t } = useTranslation();
  const { addToast, setStaffList } = useDashboard();

  const saveStaff = useCallback(async (
    form: { name: string; email: string; specialties: string; photo_url: string; bio: string; indStart: string; indEnd: string; indWorkDays: number[]; useIndividualHours: boolean; commission_type: string; commission_value: string },
    editing: StaffMember | null
  ) => {
    if (!form.name || !form.name.trim()) {
      addToast(t('staffDashboard.toastStaffNameRequired'), 'error');
      return false;
    }
    if (!editing && (!form.email || !form.email.trim())) {
      addToast(t('staffDashboard.toastStaffEmailRequired'), 'error');
      return false;
    }
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        specialties: form.specialties ? form.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
        photo_url: form.photo_url || undefined,
        bio: form.bio || undefined,
        commission_type: form.commission_type,
        commission_value: form.commission_value ? parseFloat(form.commission_value) : 0,
      };
      if (form.useIndividualHours) {
        body.individual_hours = {
          startHour: parseInt(form.indStart, 10),
          endHour: parseInt(form.indEnd, 10),
          workDays: form.indWorkDays,
        };
      }
      if (editing) {
        await api.put(`/api/tenant/staff/${editing.id}`, body);
        addToast(t('staffDashboard.toastStaffUpdated'), 'success');
      } else {
        const res = await api.post<{ tempPassword: string }>('/api/tenant/staff', body);
        addToast(t('staffDashboard.toastStaffCreated', { password: res.tempPassword }), 'success');
      }
      clearApiCache();
      const data = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff');
      setStaffList(data.staff);
      return true;
    } catch (e: unknown) {
      logger.error('Error saving staff:', e);
      const msg = e instanceof Error ? e.message : t('staffDashboard.toastStaffSaveError');
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, t, setStaffList]);

  const deleteStaffMember = useCallback(async (id: number, name: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteStaff', { name }))) return false;
    try {
      await api.delete(`/api/tenant/staff/${id}`);
      addToast(t('staffDashboard.toastStaffDeleted'), 'success');
      clearApiCache();
      const data = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff');
      setStaffList(data.staff);
      return true;
    } catch (e: unknown) {
      logger.error('Error deleting staff:', e);
      const msg = e instanceof Error ? e.message : t('staffDashboard.toastStaffDeleteError');
      addToast(msg, 'error');
      return false;
    }
  }, [addToast, t, setStaffList]);

  const uploadStaffPhoto = useCallback(async (file: File): Promise<string | null> => {
    try {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const filename = `staff-${Date.now()}.${file.name.split('.').pop()}`;
            const res = await api.post<{ success: boolean; url: string; message: string }>('/api/upload-image', { image: base64, filename });
            if (res.success && res.url) {
              addToast(t('staffDashboard.toastStaffPhotoUploadSuccess'), 'success');
              resolve(res.url);
            } else {
              addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
              resolve(null);
            }
          } catch (err) {
            logger.error('Error uploading photo:', err);
            addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
            resolve(null);
          }
        };
        reader.onerror = () => {
          addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    } catch (err) {
      logger.error('Error reading file:', err);
      addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
      return null;
    }
  }, [addToast, t]);

  return { saveStaff, deleteStaffMember, uploadStaffPhoto };
}
