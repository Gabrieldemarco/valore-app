import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    renderResetPassword();
    const inputs = screen.getAllByPlaceholderText(/Mínimo 6 caracteres|Repetí tu contraseña/);
    await user.type(inputs[0], '123456');
    await user.type(inputs[1], '654321');
    await user.click(screen.getByText('Actualizar contraseña'));
    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Token inválido o expirado' }),
    });
    renderResetPassword();
    const inputs = screen.getAllByPlaceholderText(/Mínimo 6 caracteres|Repetí tu contraseña/);
    await user.type(inputs[0], 'newpass123');
    await user.type(inputs[1], 'newpass123');
    await user.click(screen.getByText('Actualizar contraseña'));
    await waitFor(() => {
      expect(screen.getByText('Token inválido o expirado')).toBeInTheDocument();
    });
  });

  it('shows success and link to login after reset', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Contraseña actualizada' }),
    });
    renderResetPassword();
    const inputs = screen.getAllByPlaceholderText(/Mínimo 6 caracteres|Repetí tu contraseña/);
    await user.type(inputs[0], 'newpass123');
    await user.type(inputs[1], 'newpass123');
    await user.click(screen.getByText('Actualizar contraseña'));
    await waitFor(() => {
      expect(screen.getByText('Contraseña actualizada')).toBeInTheDocument();
      expect(screen.getByText('¡Tu contraseña fue actualizada!')).toBeInTheDocument();
    });
    expect(screen.getByText('Iniciar sesión ahora').closest('a')).toHaveAttribute('href', '/staff/login');
  });
});
