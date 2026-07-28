import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import BookingStepper from './BookingStepper';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'booking.stepPeluquero': 'Peluquero',
      'booking.stepServicio': 'Servicio',
      'booking.stepFecha': 'Fecha',
      'booking.stepHorario': 'Horario',
      'booking.stepTusDatos': 'Tus Datos',
    }[key] || key),
  }),
}));

describe('BookingStepper', () => {
  it('renders all steps in normal mode', () => {
    render(<BookingStepper step={1} isQuickBook={false} onSetStep={vi.fn()} />);
    expect(screen.getByText('Peluquero')).toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Horario')).toBeInTheDocument();
    expect(screen.getByText('Tus Datos')).toBeInTheDocument();
  });

  it('renders fewer steps in quick book mode', () => {
    render(<BookingStepper step={2} isQuickBook={true} onSetStep={vi.fn()} />);
    expect(screen.queryByText('Peluquero')).not.toBeInTheDocument();
    expect(screen.getByText('Servicio')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Horario')).toBeInTheDocument();
    expect(screen.getByText('Tus Datos')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    const { container } = render(<BookingStepper step={3} isQuickBook={false} onSetStep={vi.fn()} />);
    const activeSteps = container.querySelectorAll('.step.active');
    expect(activeSteps.length).toBe(1);
    expect(activeSteps[0]).toHaveTextContent('3');
  });

  it('marks completed steps', () => {
    const { container } = render(<BookingStepper step={4} isQuickBook={false} onSetStep={vi.fn()} />);
    const completedSteps = container.querySelectorAll('.step.completed');
    expect(completedSteps.length).toBe(3);
  });

  it('calls onSetStep when clicking a completed step', async () => {
    const user = userEvent.setup();
    const onSetStep = vi.fn();
    render(<BookingStepper step={4} isQuickBook={false} onSetStep={onSetStep} />);
    await user.click(screen.getByText('Fecha'));
    expect(onSetStep).toHaveBeenCalledWith(3);
  });

  it('does not call onSetStep when clicking a future step', async () => {
    const user = userEvent.setup();
    const onSetStep = vi.fn();
    render(<BookingStepper step={2} isQuickBook={false} onSetStep={onSetStep} />);
    await user.click(screen.getByText('Horario'));
    expect(onSetStep).not.toHaveBeenCalled();
  });

  it('shows checkmark for completed steps', () => {
    const { container } = render(<BookingStepper step={3} isQuickBook={false} onSetStep={vi.fn()} />);
    const stepNumbers = container.querySelectorAll('.step-number');
    expect(stepNumbers[0]).toHaveTextContent('✓');
  });
});
