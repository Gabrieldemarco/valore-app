import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ResetPassword from './ResetPassword';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function renderResetPassword(token = 'valid-token') {
  return render(
    <MemoryRouter initialEntries={[`/staff/reset-password?token=${token}`]}>
      <ResetPassword />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('ResetPassword', () => {
  it('shows invalid token message when no token', () => {
    render(<MemoryRouter initialEntries={['/staff/reset-password']}><ResetPassword /></MemoryRouter>);
    expect(screen.getByText('Enlace inválido')).toBeInTheDocument();
  });

  it('renders password form when token is present', () => {
    renderResetPassword();
    expect(screen.getByText('Nueva Contraseña')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repetí tu contraseña')).toBeInTheDocument();
    expect(screen.getByText('Actualizar contraseña')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    renderResetPassword();
    const inputs = screen.getAllByPlaceholderText(/Mínimo 6 caracteres|Repetí tu contraseña/);
    fireEvent.change(inputs[0], { target: { value: '123456' } });
    fireEvent.change(inputs[1], { target: { value: '654321' } });
    fireEvent.click(screen.getByText('Actualizar contraseña'));
    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Token inválido o expirado' }),
    });
    renderResetPassword();
    const inputs = screen.getAllByPlaceholderText(/Mínimo 6 caracteres|Repetí tu contraseña/);
    fireEvent.change(inputs[0], { target: { value: 'newpass123' } });
    fireEvent.change(inputs[1], { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Actualizar contraseña'));
    await waitFor(() => {
      expect(screen.getByText('Token inválido o expirado')).toBeInTheDocument();
    });
  });

  it('shows success and link to login after reset', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Contraseña actualizada' }),
    });
    renderResetPassword();
    const inputs = screen.getAllByPlaceholderText(/Mínimo 6 caracteres|Repetí tu contraseña/);
    fireEvent.change(inputs[0], { target: { value: 'newpass123' } });
    fireEvent.change(inputs[1], { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Actualizar contraseña'));
    await waitFor(() => {
      expect(screen.getByText('Contraseña actualizada')).toBeInTheDocument();
      expect(screen.getByText('¡Tu contraseña fue actualizada!')).toBeInTheDocument();
    });
    expect(screen.getByText('Iniciar sesión ahora').closest('a')).toHaveAttribute('href', '/staff/login');
  });
});
