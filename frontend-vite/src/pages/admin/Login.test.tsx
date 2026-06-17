import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminLogin from './Login';
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

function renderAdminLogin() {
  return render(<MemoryRouter><AdminLogin /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (useAuth as Mock).mockReturnValue({ login: vi.fn() });
});

describe('AdminLogin', () => {
  it('renders admin login form', () => {
    renderAdminLogin();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Panel de administración general')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('superadmin@pelu.com')).toBeInTheDocument();
    expect(screen.getByText('Ingresar')).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Credenciales inválidas' }),
    });
    renderAdminLogin();
    await user.type(screen.getByPlaceholderText('superadmin@pelu.com'), 'admin@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong');
    await user.click(screen.getByText('Ingresar'));
    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('calls login and navigates on success', async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn();
    (useAuth as Mock).mockReturnValue({ login: loginMock });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'admin-token' }),
    });
    renderAdminLogin();
    await user.type(screen.getByPlaceholderText('superadmin@pelu.com'), 'admin@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password');
    await user.click(screen.getByText('Ingresar'));
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin-token', 'superAdmin');
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('has link back to home', () => {
    renderAdminLogin();
    expect(screen.getByText('← Volver al inicio').closest('a')).toHaveAttribute('href', '/');
  });
});
