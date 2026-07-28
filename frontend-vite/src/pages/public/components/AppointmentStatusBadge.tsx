interface AppointmentStatusBadgeProps {
  status: string;
  t: (key: string) => string;
}

export default function AppointmentStatusBadge({ status, t }: AppointmentStatusBadgeProps) {
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
      color: 'var(--text-white)',
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
    }}>
      {labels[status] || status}
    </span>
  );
}
