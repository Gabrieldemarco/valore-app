import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Terms from './Terms';

describe('Terms', () => {
  it('renders all three tab buttons', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText('Términos y Condiciones')).toBeInTheDocument();
    expect(screen.getByText('Política de Privacidad')).toBeInTheDocument();
    expect(screen.getByText('Política de Cancelación')).toBeInTheDocument();
  });

  it('shows terms content by default', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText('Al utilizar nuestros servicios, acepta estos términos en su totalidad.')).toBeInTheDocument();
  });

  it('switches to privacy tab on click', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    fireEvent.click(screen.getByText('Política de Privacidad'));
    expect(screen.getByText('Recopilamos información personal necesaria para la reserva y gestión de citas.')).toBeInTheDocument();
  });

  it('switches to cancellation tab on click', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    fireEvent.click(screen.getByText('Política de Cancelación'));
    expect(screen.getByText('Las cancelaciones deben realizarse con al menos 24 horas de anticipación.')).toBeInTheDocument();
  });

  it('has a back link to home', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText('Volver al inicio').closest('a')).toHaveAttribute('href', '/');
  });
});
