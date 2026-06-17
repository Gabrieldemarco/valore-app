import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Terms from './Terms';

describe('Terms', () => {
  it('renders all three tab buttons', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    const termsBtns = screen.getAllByText('Términos y Condiciones');
    const privBtns = screen.getAllByText('Política de Privacidad');
    const cancBtns = screen.getAllByText('Política de Cancelaciones');
    expect(termsBtns.length).toBeGreaterThanOrEqual(1);
    expect(privBtns.length).toBeGreaterThanOrEqual(1);
    expect(cancBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows terms content by default', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText('Bienvenido a Velsoie. Al acceder y utilizar nuestra plataforma, sitio web o servicios relacionados, aceptás los presentes Términos y Condiciones.')).toBeInTheDocument();
  });

  it('switches to privacy tab on click', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Terms /></MemoryRouter>);
    await user.click(screen.getByText('Política de Privacidad'));
    expect(screen.getByText('En Velsoie valoramos la privacidad y protección de los datos personales de nuestros usuarios.')).toBeInTheDocument();
  });

  it('switches to cancellation tab on click', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Terms /></MemoryRouter>);
    await user.click(screen.getByText('Política de Cancelaciones'));
    expect(screen.getByText('Los usuarios podrán cancelar o reprogramar reservas desde la plataforma.')).toBeInTheDocument();
  });

  it('has a back link to home', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>);
    expect(screen.getByText('← Volver al inicio').closest('a')).toHaveAttribute('href', '/');
  });
});
