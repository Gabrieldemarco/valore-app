import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import AppointmentHeader from './components/AppointmentHeader';
import AppointmentInfo from './components/AppointmentInfo';
import AppointmentActions from './components/AppointmentActions';
import type { Appointment, RecurringAppointment } from './types';

export default function AppointmentManage() {
  const { t, i18n } = useTranslation();
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [services, setServices] = useState<{ id: number; name: string }[]>([]);
  const [recurringAppointments, setRecurringAppointments] = useState<RecurringAppointment[]>([]);

  async function loadAppointment() {
    try {
      const data = await api.get<{ appointment: Appointment; recurring_appointments?: RecurringAppointment[] }>(`/p/${slug}/appointments/manage/${token}`);
      setAppointment(data.appointment);

      if (data.recurring_appointments) {
        setRecurringAppointments(data.recurring_appointments);
      }

      try {
        const servicesData = await api.get<{ services: { id: number; name: string }[] }>(`/p/${slug}/services`);
        setServices(servicesData.services || []);
      } catch { /* silent */ }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointment(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token]);

  async function handleCancel() {
    if (!confirm(t('appointmentManage.cancelConfirm'))) return;
    setActionLoading(true);
    try {
      await api.put(`/p/${slug}/appointments/manage/${token}/cancel`);
      setMessage(t('appointmentManage.cancelSuccess'));
      setAppointment(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function loadSlots(date: string) {
    if (!appointment) return;
    const service = services.find(s => s.name === appointment.service);
    if (!service) return;
    try {
      const endpoint = appointment.staff_id
        ? `/p/${slug}/staff/${appointment.staff_id}/availability?date=${date}&serviceId=${service.id}`
        : `/p/${slug}/availability?date=${date}&serviceId=${service.id}`;
      const data = await api.get<{ slots: { time: string; available: boolean }[] }>(endpoint);
      setAvailableSlots(data.slots || []);
    } catch { /* silent */ }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    setActionLoading(true);
    try {
      const appointmentDate = `${newDate}T${newTime}:00`;
      const body: { appointmentDate: string; staffId?: number } = { appointmentDate };
      if (appointment?.staff_id) body.staffId = appointment.staff_id;
      const data = await api.put<{ appointment: Appointment }>(`/p/${slug}/appointments/manage/${token}/reschedule`, body);
      setMessage(t('appointmentManage.rescheduleSuccess'));
      setAppointment(data.appointment);
      setRescheduling(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <AppointmentHeader t={t} slug={slug}>
        {renderLoading(t)}
      </AppointmentHeader>
    );
  }

  if (error && !appointment) {
    return (
      <AppointmentHeader t={t} slug={slug}>
        {renderError(error)}
      </AppointmentHeader>
    );
  }

  const isPast = appointment && new Date(appointment.appointment_date) <= new Date();
  const canCancel = appointment && !['cancelled', 'completed', 'no-show'].includes(appointment.status) && !isPast;
  const canReschedule = appointment && !['cancelled', 'completed', 'no-show'].includes(appointment.status) && !isPast;

  return (
    <AppointmentHeader t={t} slug={slug}>
      {message && (
        <div className="mb-20 bg-success-light rounded font-500 text-success-dark p-12 px-20 fs-15">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-20 bg-danger-light rounded font-500 text-danger-dark p-12 px-20 fs-15">
          {error}
        </div>
      )}

      {appointment && (
        <>
          <AppointmentInfo
            appointment={appointment}
            recurringAppointments={recurringAppointments}
            t={t}
            i18n={i18n}
          />
          <AppointmentActions
            t={t}
            canCancel={canCancel}
            canReschedule={canReschedule}
            actionLoading={actionLoading}
            rescheduling={rescheduling}
            newDate={newDate}
            newTime={newTime}
            availableSlots={availableSlots}
            onCancel={handleCancel}
            onStartReschedule={() => { setRescheduling(true); setNewDate(''); setNewTime(''); }}
            onCancelReschedule={() => setRescheduling(false)}
            onDateChange={(date) => { setNewDate(date); loadSlots(date); }}
            onTimeSelect={setNewTime}
            onConfirmReschedule={handleReschedule}
          />
        </>
      )}
    </AppointmentHeader>
  );
}

function renderLoading(t: (key: string) => string) {
  return (
    <div className="text-center text-muted pt-80">
      <div style={{ width: 40, height: 40, border: '3px solid rgba(148,163,184,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
      {t('appointmentManage.loading')}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function renderError(msg: string) {
  return (
    <div className="text-center text-danger pt-80">
      <div className="mb-16 fs-48">😕</div>
      <p>{msg}</p>
    </div>
  );
}
