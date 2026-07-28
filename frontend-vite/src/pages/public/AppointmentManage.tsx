import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

interface Appointment {
  id: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  service: string;
  service_duration: number;
  appointment_date: string;
  status: string;
  notes: string;
  staff_name: string;
  staff_id: number;
  management_link: string;
  deposit_amount: string;
  deposit_paid: boolean;
  recurring_group: string;
  recurring_rule: { frequency: string; count: number } | null;
}

interface RecurringAppointment {
  id: number;
  appointment_date: string;
  status: string;
  client_token: string;
}

export default function AppointmentManage() {
  const { t } = useTranslation();
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

  useEffect(() => {
    loadAppointment();
  }, [slug, token]);

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
      } catch { /* services are optional */ }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm(t('appointmentManage.cancelConfirm'))) return;
    setActionLoading(true);
    try {
      await api.put(`/p/${slug}/appointments/manage/${token}/cancel`);
      setMessage(t('appointmentManage.cancelSuccess'));
      setAppointment(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: any) {
      setError(err.message);
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
    } catch { /* ignore */ }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    setActionLoading(true);
    try {
      const appointmentDate = `${newDate}T${newTime}:00`;
      const body: any = { appointmentDate };
      if (appointment?.staff_id) body.staffId = appointment.staff_id;
      const data = await api.put<{ appointment: Appointment }>(`/p/${slug}/appointments/manage/${token}/reschedule`, body);
      setMessage(t('appointmentManage.rescheduleSuccess'));
      setAppointment(data.appointment);
      setRescheduling(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return renderContainer(t, slug, renderLoading(t));
  }

  if (error && !appointment) {
    return renderContainer(t, slug, renderError(error));
  }

  const date = appointment ? new Date(appointment.appointment_date) : null;
  const isPast = appointment && new Date(appointment.appointment_date) <= new Date();
  const canCancel = appointment && !['cancelled', 'completed', 'no-show'].includes(appointment.status) && !isPast;
  const canReschedule = appointment && !['cancelled', 'completed', 'no-show'].includes(appointment.status) && !isPast;

  return renderContainer(t, slug, (
    <>
      {message && (
        <div className="mb-20" style={{ background: 'var(--success-light)', color: 'var(--success-dark)', padding: '12px 20px', borderRadius: 8, fontSize: 15, fontWeight: 500 }}>
          {message}
        </div>
      )}
      {error && (
        <div className="mb-20" style={{ background: 'var(--danger-light)', color: 'var(--danger-dark)', padding: '12px 20px', borderRadius: 8, fontSize: 15, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {appointment && (
        <>
          <div className="card-padded" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
            <div className="flex-gap-8 mb-16" style={{ alignItems: 'center' }}>
              <StatusBadge t={t} status={appointment.status} />
              <span className="text-muted" style={{ fontSize: 13 }}>
                #{appointment.id}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <InfoRow label={t('appointmentManage.infoCliente')} value={appointment.client_name} />
              <InfoRow label={t('appointmentManage.infoTelefono')} value={appointment.client_phone} />
              {appointment.client_email && <InfoRow label={t('appointmentManage.infoEmail')} value={appointment.client_email} />}
              <InfoRow label={t('appointmentManage.infoServicio')} value={appointment.service} />
              {appointment.staff_name && <InfoRow label={t('appointmentManage.infoPeluquero')} value={appointment.staff_name} />}
              {date && <InfoRow label={t('appointmentManage.infoFecha')} value={date.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />}
              {date && <InfoRow label={t('appointmentManage.infoHorario')} value={date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} />}
              {appointment.notes && <InfoRow label={t('appointmentManage.infoNotas')} value={appointment.notes} />}
            </div>

            {recurringAppointments.length > 1 && (
              <div className="mt-16" style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p className="font-600 m-0 mb-8" style={{ fontSize: 14, color: 'var(--info)' }}>
                  {t('appointmentManage.recurringTitle')} ({recurringAppointments.length})
                </p>
                <div className="flex-col flex-gap-4">
                  {recurringAppointments.map(ra => {
                    const d = new Date(ra.appointment_date);
                    const isCurrent = ra.id === appointment.id;
                    return (
                      <div key={ra.id} className="flex-between" style={{
                        padding: '4px 8px', borderRadius: 6,
                        background: isCurrent ? 'rgba(59,130,246,0.15)' : 'transparent',
                        fontSize: 13,
                      }}>
                        <span style={{ color: isCurrent ? 'var(--info-light)' : 'var(--text-muted)', fontWeight: isCurrent ? 600 : 400 }}>
                          {d.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' })} - {d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <StatusBadge t={t} status={ra.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {appointment.deposit_amount && parseFloat(appointment.deposit_amount) > 0 && (
              <div className="mt-16" style={{ padding: '12px 16px', borderRadius: 10, background: appointment.deposit_paid ? 'var(--success-light)' : '#fef3c7' }}>
                <div className="flex-between">
                  <span className="font-600" style={{ fontSize: 14, color: appointment.deposit_paid ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
                    {t('appointmentManage.depositLabel')}: ${parseFloat(appointment.deposit_amount).toLocaleString('es-UY')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: appointment.deposit_paid ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
                    {appointment.deposit_paid ? t('appointmentManage.depositPaid') : t('appointmentManage.depositPending')}
                  </span>
                </div>
                {!appointment.deposit_paid && appointment.status === 'pending' && (
                  <p style={{ fontSize: 13, color: 'var(--warning-dark)', margin: '8px 0 0' }}>
                    {t('appointmentManage.depositHint')}
                  </p>
                )}
              </div>
            )}
          </div>

          {!rescheduling && (
            <div className="flex-gap-12 flex-wrap">
              {canReschedule && (
                <button onClick={() => { setRescheduling(true); setNewDate(''); setNewTime(''); }}
                  style={buttonStyle('var(--warning)')}>
                  {t('appointmentManage.rescheduleButton')}
                </button>
              )}
              {canCancel && (
                <button onClick={handleCancel} disabled={actionLoading}
                  style={{ ...buttonStyle('var(--danger)'), opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading ? t('appointmentManage.cancelling') : t('appointmentManage.cancelButton')}
                </button>
              )}
            </div>
          )}

          {rescheduling && (
            <div className="p-24" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16 }}>
              <h3 className="text-main m-0 mb-16" style={{ fontSize: 18 }}>{t('appointmentManage.rescheduleTitle')}</h3>
              <div className="flex-col flex-gap-12">
                <label className="text-muted">{t('appointmentManage.newDateLabel')}</label>
                <input type="date"
                  value={newDate}
                  onChange={e => { setNewDate(e.target.value); loadSlots(e.target.value); }}
                  style={inputStyle()} />
                {availableSlots.length > 0 && (
                  <>
                    <label className="text-muted mt-8">{t('appointmentManage.newTimeLabel')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                      {availableSlots.map(slot => (
                        <button key={slot.time}
                          onClick={() => setNewTime(slot.time)}
                          style={{
                            ...slotStyle(slot.time === newTime),
                            opacity: slot.available ? 1 : 0.4,
                            cursor: slot.available ? 'pointer' : 'not-allowed',
                          }}>
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {availableSlots.length === 0 && newDate && (
                  <p style={{ color: 'var(--danger)', fontSize: 14 }}>{t('appointmentManage.noSlots')}</p>
                )}
                <div className="flex-gap-12 mt-16">
                  <button onClick={handleReschedule} disabled={!newDate || !newTime || actionLoading}
                    style={{ ...buttonStyle('var(--success)'), opacity: !newDate || !newTime || actionLoading ? 0.6 : 1 }}>
                    {actionLoading ? t('appointmentManage.rescheduling') : t('appointmentManage.confirmNewDate')}
                  </button>
                  <button onClick={() => setRescheduling(false)}
                    style={{ ...buttonStyle('var(--text-muted)'), background: 'transparent', border: '1px solid var(--text-secondary)' }}>
                    {t('appointmentManage.backButton')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  ));
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const colors: Record<string, string> = {
    confirmed: 'var(--success)',
    pending: 'var(--warning)',
    cancelled: 'var(--danger)',
    completed: 'var(--info)',
    'no-show': 'var(--text-muted)',
  };
  const labels: Record<string, string> = {
    confirmed: t('appointmentManage.statusConfirmed'),
    pending: t('appointmentManage.statusPending'),
    cancelled: t('appointmentManage.statusCancelled'),
    completed: t('appointmentManage.statusCompleted'),
    'no-show': t('appointmentManage.statusNoShow'),
  };
  return (
    <span style={{
      background: colors[status] || 'var(--text-muted)',
      color: '#fff',
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
    }}>
      {labels[status] || status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
      <span className="text-muted">{label}</span>
      <span className="text-main text-right" style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function renderContainer(t: (key: string) => string, slug?: string, children?: any) {
  return (
    <div className="flex-center-center" style={{
      minHeight: '100vh',
      background: 'var(--bg-deep)',
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '40px 20px' }}>
        <a href={`/p/${slug}`} className="text-muted no-underline inline-block mb-24">
          {t('appointmentManage.backLink')}
        </a>
        {children}
      </div>
    </div>
  );
}

function renderLoading(t: (key: string) => string) {
  return (
    <div className="text-center text-muted" style={{ paddingTop: 80 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(148,163,184,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
      {t('appointmentManage.loading')}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function renderError(msg: string) {
  return (
    <div className="text-center" style={{ paddingTop: 80, color: 'var(--danger)' }}>
      <div className="mb-16" style={{ fontSize: 48 }}>😕</div>
      <p>{msg}</p>
    </div>
  );
}

function buttonStyle(color: string) {
  return {
    background: color,
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function inputStyle() {
  return {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid var(--border-color, #374151)',
    background: 'var(--input-bg, #1f2937)',
    color: 'var(--text-main, #fff)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
}

function slotStyle(selected: boolean) {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: selected ? `2px solid var(--success)` : '1px solid var(--border-color, #374151)',
    background: selected ? 'rgba(16,185,129,0.15)' : 'var(--input-bg, #1f2937)',
    color: 'var(--text-main, #fff)',
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'center' as const,
  };
}
