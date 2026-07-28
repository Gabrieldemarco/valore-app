interface Appointment {
  id: number;
  service: string;
  service_price?: number;
  appointment_date: string;
  status: string;
}

interface Props {
  appointment: Appointment;
  showPrice?: boolean;
}

export default function AppointmentCard({ appointment: a, showPrice }: Props) {
  const statusClass = showPrice
    ? 'dash-status-cancelled'
    : a.status === 'confirmed'
      ? 'dash-status-confirmed'
      : 'dash-status-pending';

  return (
    <tr>
      <td className="table-cell-label">{a.service}</td>
      <td className="p-12">{new Date(a.appointment_date).toLocaleDateString()}</td>
      {showPrice ? (
        <td className="p-12">${a.service_price || 0}</td>
      ) : (
        <td className="p-12">{new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      )}
      <td className="table-cell-pad-center">
        <span className={`dash-appointment-status ${statusClass}`}>{a.status}</span>
      </td>
    </tr>
  );
}
