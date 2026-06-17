import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function renderForgotPassword() {
  return render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('ForgotPassword', () => {
  it('renders forgot password form', () => {
    renderForgotPassword();
    expect(screen.getByText('Recuperar Contraseña')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@pelu.com')).toBeInTheDocument();
    expect(screen.getByText('Enviar enlace')).toBeInTheDocument();
  });

  it('shows error on API failure', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Email no encontrado' }),
    });
    renderForgotPassword();
    await user.type(screen.getByPlaceholderText('admin@pelu.com'), 'test@test.com');
    await user.click(screen.getByText('Enviar enlace'));
    await waitFor(() => {
      expect(screen.getByText('Email no encontrado')).toBeInTheDocument();
    });
  });

  it('shows success message after sending', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Email enviado' }),
    });
    renderForgotPassword();
    await user.type(screen.getByPlaceholderText('admin@pelu.com'), 'test@test.com');
    await user.click(screen.getByText('Enviar enlace'));
    await waitFor(() => {
      expect(screen.getByText(/recibirás un enlace/)).toBeInTheDocument();
    });
  });

  it('has link back to login', () => {
    renderForgotPassword();
    expect(screen.getByText('← Volver al inicio de sesión').closest('a')).toHaveAttribute('href', '/staff/login');
  });
});
