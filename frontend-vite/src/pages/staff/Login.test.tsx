import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import StaffLogin from './Login';
import { useAuth } from '../../contexts/AuthContext';
import type { Mock } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function renderLogin() {
  return render(<MemoryRouter><StaffLogin /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (useAuth as Mock).mockReturnValue({ login: vi.fn() });
});

describe('StaffLogin', () => {
  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('Acceso Peluqueros')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@pelu.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Ingresar')).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Credenciales inválidas' }),
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('admin@pelu.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Ingresar'));
    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('calls login and navigates on success', async () => {
    const loginMock = vi.fn();
    (useAuth as Mock).mockReturnValue({ login: loginMock });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'fake-token', name: 'Test', role: 'staff' }),
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('admin@pelu.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
    fireEvent.click(screen.getByText('Ingresar'));
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('fake-token', 'staff', 'Test');
      expect(mockNavigate).toHaveBeenCalledWith('/staff/dashboard');
    });
  });

  it('has links to forgot password and register', () => {
    renderLogin();
    expect(screen.getByText('¿Olvidaste tu contraseña?').closest('a')).toHaveAttribute('href', '/staff/forgot-password');
    expect(screen.getByText('Registrate gratis').closest('a')).toHaveAttribute('href', '/staff/register');
  });
});
