import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppointmentStatusBadge from './AppointmentStatusBadge';

const t = (key: string) => {
  const map: Record<string, string> = {
    'appointmentManage.statusConfirmed': 'Confirmed',
    'appointmentManage.statusPending': 'Pending',
    'appointmentManage.statusCancelled': 'Cancelled',
    'appointmentManage.statusCompleted': 'Completed',
    'appointmentManage.statusNoShow': 'No Show',
  };
  return map[key] || key;
};

describe('AppointmentStatusBadge', () => {
  it('renders confirmed status', () => {
    render(<AppointmentStatusBadge status="confirmed" t={t} />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders pending status', () => {
    render(<AppointmentStatusBadge status="pending" t={t} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders cancelled status', () => {
    render(<AppointmentStatusBadge status="cancelled" t={t} />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders completed status', () => {
    render(<AppointmentStatusBadge status="completed" t={t} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders no-show status', () => {
    render(<AppointmentStatusBadge status="no-show" t={t} />);
    expect(screen.getByText('No Show')).toBeInTheDocument();
  });
});
