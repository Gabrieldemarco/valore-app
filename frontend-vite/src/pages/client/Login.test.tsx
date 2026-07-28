import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ClientLogin from './Login';
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../components/GoogleLoginButton', () => ({
  default: ({ mode }: { mode: string }) => <div data-testid="google-login">Google {mode}</div>,
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function renderLogin() {
  return render(<MemoryRouter><ClientLogin /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (useAuth as Mock).mockReturnValue({ login: vi.fn() });
});

describe('ClientLogin', () => {
  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('clientLogin.title')).toBeInTheDocument();
    expect(screen.getByText('clientLogin.subtitle')).toBeInTheDocument();
    expect(screen.getByText('clientLogin.submitButton')).toBeInTheDocument();
  });

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByText('clientLogin.submitButton'));
    await waitFor(() => {
      expect(screen.getByText('clientLogin.validationError')).toBeInTheDocument();
    });
  });

  it('shows error on failed login', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Credenciales inválidas' }),
    });
    renderLogin();
    await user.type(screen.getByRole('textbox'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('clientLogin.passwordPlaceholder'), 'wrong');
    await user.click(screen.getByText('clientLogin.submitButton'));
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
      json: async () => ({ token: 'fake-token', name: 'Test', role: 'client' }),
    });
    renderLogin();
    await user.type(screen.getByRole('textbox'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('clientLogin.passwordPlaceholder'), 'password');
    await user.click(screen.getByText('clientLogin.submitButton'));
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('fake-token', 'client', 'Test');
      expect(mockNavigate).toHaveBeenCalledWith('/client/dashboard');
    });
  });

  it('has link to register', () => {
    renderLogin();
    const registerLink = screen.getByText('clientLogin.registerLink').closest('a');
    expect(registerLink).toHaveAttribute('href', '/client/register');
  });

  it('has link to forgot password', () => {
    renderLogin();
    const forgotLink = screen.getByText('clientLogin.forgotPassword').closest('a');
    expect(forgotLink).toHaveAttribute('href', '/client/forgot-password');
  });

  it('renders Google login button', () => {
    renderLogin();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
  });
});
