import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppointmentCard from './AppointmentCard';

const baseAppointment = {
  id: 1,
  service: 'Corte',
  appointment_date: '2026-07-15T10:00:00',
  status: 'confirmed',
};

describe('AppointmentCard', () => {
  it('renders appointment service and status', () => {
    render(<AppointmentCard appointment={baseAppointment} />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('renders price when showPrice is true', () => {
    const withPrice = { ...baseAppointment, service_price: 1500 };
    render(<AppointmentCard appointment={withPrice} showPrice />);
    expect(screen.getByText('$1500')).toBeInTheDocument();
  });
});
