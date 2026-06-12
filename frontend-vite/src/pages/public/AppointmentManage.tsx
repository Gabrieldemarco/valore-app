import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
      const res = await fetch(`/p/${slug}/appointments/manage/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('appointmentManage.notFound'));
      }
      const data = await res.json();
      setAppointment(data.appointment);

      if (data.recurring_appointments) {
        setRecurringAppointments(data.recurring_appointments);
      }

    } catch (err: any) {
      setError(err.message);
      const servicesRes = await fetch(`/p/${slug}/services`);
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData.services || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm(t('appointmentManage.cancelConfirm'))) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/p/${slug}/appointments/manage/${token}/cancel`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
      const res = await fetch(`/p/${slug}/availability?date=${date}&serviceId=${service.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
      }
    } catch { /* ignore */ }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    setActionLoading(true);
    try {
      const appointmentDate = `${newDate}T${newTime}:00`;
      const body: any = { appointmentDate };
      if (appointment?.staff_id) body.staffId = appointment.staff_id;
      const res = await fetch(`/p/${slug}/appointments/manage/${token}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 20px', borderRadius: 8, marginBottom: 20, fontSize: 15, fontWeight: 500 }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 20px', borderRadius: 8, marginBottom: 20, fontSize: 15, fontWeight: 500 }}>
          {error}
        </div>
      )}

      {appointment && (
        <>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <StatusBadge t={t} status={appointment.status} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>
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
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#60a5fa', margin: '0 0 8px' }}>
                  {t('appointmentManage.recurringTitle')} ({recurringAppointments.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recurringAppointments.map(ra => {
                    const d = new Date(ra.appointment_date);
                    const isCurrent = ra.id === appointment.id;
                    return (
                      <div key={ra.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '4px 8px', borderRadius: 6,
                        background: isCurrent ? 'rgba(59,130,246,0.15)' : 'transparent',
                        fontSize: 13,
                      }}>
                        <span style={{ color: isCurrent ? '#93c5fd' : '#9ca3af', fontWeight: isCurrent ? 600 : 400 }}>
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
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: appointment.deposit_paid ? '#d1fae5' : '#fef3c7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: appointment.deposit_paid ? '#065f46' : '#92400e' }}>
                    {t('appointmentManage.depositLabel')}: ${parseFloat(appointment.deposit_amount).toLocaleString('es-UY')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: appointment.deposit_paid ? '#065f46' : '#92400e' }}>
                    {appointment.deposit_paid ? t('appointmentManage.depositPaid') : t('appointmentManage.depositPending')}
                  </span>
                </div>
                {!appointment.deposit_paid && appointment.status === 'pending' && (
                  <p style={{ fontSize: 13, color: '#92400e', margin: '8px 0 0' }}>
                    {t('appointmentManage.depositHint')}
                  </p>
                )}
              </div>
            )}
          </div>

          {!rescheduling && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {canReschedule && (
                <button onClick={() => { setRescheduling(true); setNewDate(''); setNewTime(''); }}
                  style={buttonStyle('#f59e0b')}>
                  {t('appointmentManage.rescheduleButton')}
                </button>
              )}
              {canCancel && (
                <button onClick={handleCancel} disabled={actionLoading}
                  style={{ ...buttonStyle('#ef4444'), opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading ? t('appointmentManage.cancelling') : t('appointmentManage.cancelButton')}
                </button>
              )}
            </div>
          )}

          {rescheduling && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: 18 }}>{t('appointmentManage.rescheduleTitle')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ color: '#9ca3af', fontSize: 14 }}>{t('appointmentManage.newDateLabel')}</label>
                <input type="date"
                  value={newDate}
                  onChange={e => { setNewDate(e.target.value); loadSlots(e.target.value); }}
                  style={inputStyle()} />
                {availableSlots.length > 0 && (
                  <>
                    <label style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>{t('appointmentManage.newTimeLabel')}</label>
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
                  <p style={{ color: '#ef4444', fontSize: 14 }}>{t('appointmentManage.noSlots')}</p>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button onClick={handleReschedule} disabled={!newDate || !newTime || actionLoading}
                    style={{ ...buttonStyle('#10b981'), opacity: !newDate || !newTime || actionLoading ? 0.6 : 1 }}>
                    {actionLoading ? t('appointmentManage.rescheduling') : t('appointmentManage.confirmNewDate')}
                  </button>
                  <button onClick={() => setRescheduling(false)}
                    style={{ ...buttonStyle('#6b7280'), background: 'transparent', border: '1px solid #4b5563' }}>
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
    confirmed: '#10b981',
    pending: '#f59e0b',
    cancelled: '#ef4444',
    completed: '#3b82f6',
    'no-show': '#6b7280',
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
      background: colors[status] || '#6b7280',
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
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
      <span style={{ color: '#9ca3af', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function renderContainer(t: (key: string) => string, slug?: string, children?: any) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#120c0c',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '40px 20px' }}>
        <a href={`/p/${slug}`} style={{ color: '#9ca3af', fontSize: 14, textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
          {t('appointmentManage.backLink')}
        </a>
        {children}
      </div>
    </div>
  );
}

function renderLoading(t: (key: string) => string) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80, color: '#6b7280' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(148,163,184,0.2)', borderTopColor: '#c8827d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
      {t('appointmentManage.loading')}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function renderError(msg: string) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80, color: '#ef4444' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
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
    border: '1px solid #374151',
    background: '#1f2937',
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };
}

function slotStyle(selected: boolean) {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: selected ? `2px solid #10b981` : '1px solid #374151',
    background: selected ? 'rgba(16,185,129,0.15)' : '#1f2937',
    color: '#fff',
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
    textAlign: 'center' as const,
  };
}
