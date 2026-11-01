import { getAppointmentStatusLabel } from '../../../utils/appointmentStatus';

export function getStatusBadge(status: string, t: (key: string) => string) {
  const cls = status === 'confirmed' ? 'dash-status-confirmed'
    : status === 'completed' ? 'dash-status-completed'
    : status === 'cancelled' ? 'dash-status-cancelled'
    : status === 'no-show' ? 'dash-status-noshow'
    : 'dash-status-pending';
  return <span className={`dash-appointment-status ${cls}`}>{getAppointmentStatusLabel(status, t)}</span>;
}
