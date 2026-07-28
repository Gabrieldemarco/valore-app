export function getStatusBadge(status: string) {
  const cls = status === 'confirmed' ? 'dash-status-confirmed'
    : status === 'completed' ? 'dash-status-completed'
    : status === 'cancelled' ? 'dash-status-cancelled'
    : status === 'no-show' ? 'dash-status-noshow'
    : 'dash-status-pending';
  return <span className={`dash-appointment-status ${cls}`}>{status}</span>;
}
