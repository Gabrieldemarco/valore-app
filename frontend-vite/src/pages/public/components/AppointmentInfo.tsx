import AppointmentStatusBadge from './AppointmentStatusBadge';
import type { Appointment, RecurringAppointment } from '../types';

interface AppointmentInfoProps {
  appointment: Appointment;
  recurringAppointments: RecurringAppointment[];
  t: (key: string) => string;
  i18n: { language: string };
}

export default function AppointmentInfo({ appointment, recurringAppointments, t, i18n }: AppointmentInfoProps) {
  const date = new Date(appointment.appointment_date);

  return (
    <div className="card-padded rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="flex-gap-8 mb-16 items-center">
        <AppointmentStatusBadge status={appointment.status} t={t} />
        <span className="text-muted text-sm-2">
          #{appointment.id}
        </span>
      </div>

      <div className="grid-1">
        <InfoRow label={t('appointmentManage.infoCliente')} value={appointment.client_name} />
        <InfoRow label={t('appointmentManage.infoTelefono')} value={appointment.client_phone} />
        {appointment.client_email && <InfoRow label={t('appointmentManage.infoEmail')} value={appointment.client_email} />}
        <InfoRow label={t('appointmentManage.infoServicio')} value={appointment.service} />
        {appointment.staff_name && <InfoRow label={t('appointmentManage.infoPeluquero')} value={appointment.staff_name} />}
        <InfoRow label={t('appointmentManage.infoFecha')} value={date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
        <InfoRow label={t('appointmentManage.infoHorario')} value={date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })} />
        {appointment.notes && <InfoRow label={t('appointmentManage.infoNotas')} value={appointment.notes} />}
      </div>

      {recurringAppointments.length > 1 && (
        <div className="mt-16" style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <p className="font-600 m-0 mb-8 text-info fs-14">
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
                    {d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })} - {d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <AppointmentStatusBadge t={t} status={ra.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {appointment.deposit_amount && parseFloat(appointment.deposit_amount) > 0 && (
        <div className="mt-16" style={{ padding: '12px 16px', borderRadius: 10, background: appointment.deposit_paid ? 'var(--success-light)' : 'var(--warning-light)' }}>
          <div className="flex-between">
            <span className="font-600" style={{ fontSize: 14, color: appointment.deposit_paid ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
              {t('appointmentManage.depositLabel')}: ${parseFloat(appointment.deposit_amount).toLocaleString(i18n.language)}
            </span>
            <span className="text-sm-2 font-500" style={{ color: appointment.deposit_paid ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
              {appointment.deposit_paid ? t('appointmentManage.depositPaid') : t('appointmentManage.depositPending')}
            </span>
          </div>
          {!appointment.deposit_paid && appointment.status === 'pending' && (
            <p className="text-sm-2 text-warning mt-8 m-0">
              {t('appointmentManage.depositHint')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
      <span className="text-muted">{label}</span>
      <span className="text-main text-right font-500">{value}</span>
    </div>
  );
}
