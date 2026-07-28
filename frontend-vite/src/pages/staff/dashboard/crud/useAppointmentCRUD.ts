import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';

export function useAppointmentCRUD() {
  const { t } = useTranslation();
  const { addToast, loadAppointments, loadClients } = useDashboard();

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

  return { updateAppointmentStatus, saveNewAppointment, addBlockedDate, deleteBlockedDate };
}
