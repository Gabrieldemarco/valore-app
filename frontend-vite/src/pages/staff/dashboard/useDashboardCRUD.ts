import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../../api/client';
import { useDashboard } from './dashboardContext';
import { logger } from '../../../services/logger';
import type { StaffMember, ServiceItem, ServiceImage } from './dashboardContext';

export function useDashboardCRUD() {
  const { t } = useTranslation();
  const {
    addToast,
    setStaffList,
    setCouponsList,
    loadServices,
    loadCategories,
    loadClients,
    loadAppointments,
  } = useDashboard();

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
      const body: any = {
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
    } catch (e: any) {
      logger.error('Error saving staff:', e);
      addToast(e?.message || t('staffDashboard.toastStaffSaveError'), 'error');
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
    } catch (e: any) {
      logger.error('Error deleting staff:', e);
      addToast(e?.message || t('staffDashboard.toastStaffDeleteError'), 'error');
      return false;
    }
  }, [addToast, t, setStaffList]);

  const saveService = useCallback(async (
    form: { name: string; duration: string; price: string; category: string; category_id: string; description: string; image: string },
    editing: ServiceItem | null
  ) => {
    if (!form.name || !form.duration) {
      addToast(t('staffDashboard.toastNameDurationRequired'), 'error');
      return false;
    }
    try {
      const body: Record<string, any> = {
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
    } catch (e: any) {
      logger.error('Error saving service:', e);
      addToast(e?.message || t('staffDashboard.toastServiceSaveError'), 'error');
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
    } catch (e: any) {
      addToast(e?.message || 'Error al agregar imagen', 'error');
      return null;
    }
  }, [addToast]);

  const deleteServiceImage = useCallback(async (serviceId: number, imageId: number) => {
    try {
      await api.delete(`/api/tenant/services/${serviceId}/images/${imageId}`);
      addToast('Imagen eliminada', 'success');
      return true;
    } catch (e: any) {
      addToast(e?.message || 'Error al eliminar imagen', 'error');
      return false;
    }
  }, [addToast]);

  const saveCategory = useCallback(async (form: { id?: number; name: string; parent_id: number | null }) => {
    if (!form.name.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return false;
    }
    try {
      if (form.id) {
        await api.put(`/api/tenant/categories/${form.id}`, { name: form.name, parent_id: form.parent_id });
        addToast('Categoría actualizada', 'success');
      } else {
        await api.post('/api/tenant/categories', { name: form.name, parent_id: form.parent_id });
        addToast('Categoría creada', 'success');
      }
      loadCategories();
      return true;
    } catch (e: any) {
      addToast(e?.message || 'Error al guardar categoría', 'error');
      return false;
    }
  }, [addToast, loadCategories]);

  const deleteCategory = useCallback(async (id: number) => {
    if (!confirm('¿Eliminar esta categoría? Los servicios quedarán sin categoría.')) return false;
    try {
      await api.delete(`/api/tenant/categories/${id}`);
      addToast('Categoría eliminada', 'success');
      loadCategories();
      loadServices();
      return true;
    } catch (e: any) {
      addToast(e?.message || 'Error al eliminar', 'error');
      return false;
    }
  }, [addToast, loadCategories, loadServices]);

  const updateAppointmentStatus = useCallback(async (id: number, status: string) => {
    const labels: Record<string, string> = {
      completed: t('staffDashboard.actionComplete'),
      cancelled: t('staffDashboard.actionCancel'),
      confirmed: t('staffDashboard.actionConfirm'),
      'no-show': t('staffDashboard.actionNoShow'),
    };
    if (!confirm(t('staffDashboard.confirmStatusUpdate', { action: labels[status] || status }))) return false;
    try {
      await api.put(`/api/appointments/${id}/status`, { status });
      addToast(t('staffDashboard.toastStatusUpdated'), 'success');
      loadAppointments();
      try { new BroadcastChannel('dashboard-sync').postMessage('reload'); } catch {}
      return true;
    } catch {
      addToast(t('staffDashboard.toastUpdateError'), 'error');
      return false;
    }
  }, [addToast, t, loadAppointments]);

  const saveNewAppointment = useCallback(async (form: {
    clientName: string; clientPhone: string; clientEmail: string;
    serviceId: string; staffId: string; appointmentDate: string;
    appointmentTime: string; notes: string;
  }) => {
    if (!form.clientName || !form.clientPhone || !form.serviceId || !form.appointmentDate || !form.appointmentTime) {
      addToast(t('staffDashboard.toastSaveNewApptValidation'), 'error');
      return false;
    }
    const apptDate = new Date(`${form.appointmentDate}T${form.appointmentTime}:00`);
    if (apptDate <= new Date()) {
      addToast(t('staffDashboard.toastSaveNewApptFuture'), 'error');
      return false;
    }
    try {
      const appointmentDate = new Date(`${form.appointmentDate}T${form.appointmentTime}:00`).toISOString();
      const body: Record<string, unknown> = {
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        serviceId: parseInt(form.serviceId, 10),
        appointmentDate,
      };
      if (form.clientEmail) body.clientEmail = form.clientEmail;
      if (form.staffId) body.staffId = parseInt(form.staffId, 10);
      if (form.notes) body.notes = form.notes;
      await api.post('/api/appointments', body);
      addToast(t('staffDashboard.toastAppointmentCreated'), 'success');
      loadAppointments();
      loadClients();
      try { new BroadcastChannel('dashboard-sync').postMessage('reload'); } catch {}
      return true;
    } catch {
      addToast(t('staffDashboard.toastCreateAppointmentError'), 'error');
      return false;
    }
  }, [addToast, t, loadAppointments, loadClients]);

  const saveSettings = useCallback(async (settings: any, openingHours: any) => {
    try {
      await api.put('/api/tenant/settings', { ...settings, opening_hours: openingHours });
      addToast(t('staffDashboard.toastStatusUpdated'), 'success');
      return true;
    } catch {
      addToast(t('staffDashboard.toastSaveError'), 'error');
      return false;
    }
  }, [addToast, t]);

  const addBlockedDate = useCallback(async (date: string, reason: string) => {
    if (!date) return false;
    try {
      await api.post('/api/tenant/blocked-dates', { date, reason });
      addToast(t('staffDashboard.toastBlockedDateAdded'), 'success');
      return true;
    } catch {
      addToast(t('staffDashboard.toastBlockedDateError'), 'error');
      return false;
    }
  }, [addToast, t]);

  const deleteBlockedDate = useCallback(async (id: number) => {
    try {
      await api.delete(`/api/tenant/blocked-dates/${id}`);
      addToast(t('staffDashboard.toastBlockedDateDeleted'), 'success');
      return true;
    } catch {
      addToast(t('staffDashboard.toastBlockedDateError'), 'error');
      return false;
    }
  }, [addToast, t]);

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

  const uploadServiceImage = useCallback(async (file: File, dataUrl?: string): Promise<string | null> => {
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

  const loadCoupons = useCallback(async () => {
    try {
      const data = await api.get<{ coupons: any[] }>('/api/tenant/coupons');
      setCouponsList(data.coupons || []);
    } catch { addToast(t('staffDashboard.toastLoadCouponsError'), 'error'); }
  }, [addToast, t, setCouponsList]);

  const saveCoupon = useCallback(async (
    form: { code: string; discount_type: string; discount_value: string; min_appointment_amount: string; max_uses: string; expires_at: string },
    editing: any | null
  ) => {
    if (!form.code || !form.discount_value) {
      addToast(t('staffDashboard.toastCouponRequired'), 'error');
      return false;
    }
    try {
      const body: any = {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
      };
      if (form.min_appointment_amount) body.min_appointment_amount = parseFloat(form.min_appointment_amount);
      if (form.max_uses) body.max_uses = parseInt(form.max_uses, 10);
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
      if (editing) {
        await api.put(`/api/tenant/coupons/${editing.id}`, body);
        addToast(t('staffDashboard.toastCouponUpdated'), 'success');
      } else {
        await api.post('/api/tenant/coupons', body);
        addToast(t('staffDashboard.toastCouponCreated'), 'success');
      }
      clearApiCache();
      await loadCoupons();
      return true;
    } catch (e: any) {
      addToast(e?.message || t('staffDashboard.toastCouponSaveError'), 'error');
      return false;
    }
  }, [addToast, t, loadCoupons]);

  const deleteCoupon = useCallback(async (id: number, code: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteCoupon', { code }))) return false;
    try {
      await api.delete(`/api/tenant/coupons/${id}`);
      addToast(t('staffDashboard.toastCouponDeleted'), 'success');
      clearApiCache();
      await loadCoupons();
      return true;
    } catch (e: any) {
      addToast(e?.message || t('staffDashboard.toastCouponDeleteError'), 'error');
      return false;
    }
  }, [addToast, t, loadCoupons]);

  const subscribeToPlan = useCallback(async (planName: string) => {
    try {
      const res = await api.post<{ init_point: string }>('/api/tenant/subscribe', { plan: planName });
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast(t('staffDashboard.toastSubscribeError'), 'error'); }
  }, [addToast, t]);

  const handlePayInvoice = useCallback(async (invoiceId: number) => {
    try {
      const res = await api.post<{ init_point: string }>(`/api/tenant/invoices/${invoiceId}/pay`);
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast(t('staffDashboard.toastPayError'), 'error'); }
  }, [addToast, t]);

  return {
    saveStaff, deleteStaffMember,
    saveService, deleteService, toggleServiceActive,
    addServiceImage, deleteServiceImage,
    saveCategory, deleteCategory,
    updateAppointmentStatus, saveNewAppointment,
    saveSettings, addBlockedDate, deleteBlockedDate,
    uploadStaffPhoto, uploadServiceImage,
    loadCoupons, saveCoupon, deleteCoupon,
    subscribeToPlan, handlePayInvoice,
  };
}
