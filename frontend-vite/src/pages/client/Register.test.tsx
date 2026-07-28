import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ClientRegister from './Register';
import type { Mock } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../components/PhoneInput', () => ({
  default: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input data-testid="phone-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  ),
}));

vi.mock('../../components/GoogleLoginButton', () => ({
  default: ({ mode }: { mode: string }) => <div data-testid="google-login">Google {mode}</div>,
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function renderRegister() {
  return render(<MemoryRouter><ClientRegister /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('ClientRegister', () => {
  it('renders registration form', () => {
    renderRegister();
    expect(screen.getByText('clientRegister.title')).toBeInTheDocument();
    expect(screen.getByText('clientRegister.subtitle')).toBeInTheDocument();
    expect(screen.getByText('clientRegister.submitButton')).toBeInTheDocument();
  });

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.click(screen.getByText('clientRegister.submitButton'));
    await waitFor(() => {
      expect(screen.getByText('clientRegister.validationError')).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('clientRegister.namePlaceholder'), 'Test');
    await user.type(screen.getByPlaceholderText('clientRegister.usernamePlaceholder'), 'testuser');
    await user.type(screen.getByPlaceholderText('clientRegister.passwordPlaceholder'), '123');
    await user.click(screen.getByText('clientRegister.submitButton'));
    await waitFor(() => {
      expect(screen.getByText('clientRegister.passwordLengthError')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('clientRegister.namePlaceholder'), 'Test');
    await user.type(screen.getByPlaceholderText('clientRegister.usernamePlaceholder'), 'testuser');
    await user.type(screen.getByPlaceholderText('clientRegister.passwordPlaceholder'), '123456');
    await user.type(screen.getByPlaceholderText('clientRegister.confirmPasswordPlaceholder'), '654321');
    await user.click(screen.getByText('clientRegister.submitButton'));
    await waitFor(() => {
      expect(screen.getByText('clientRegister.passwordMatchError')).toBeInTheDocument();
    });
  });

  it('shows error on failed registration', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'El usuario ya existe' }),
    });
    renderRegister();
    await user.type(screen.getByPlaceholderText('clientRegister.namePlaceholder'), 'Test');
    await user.type(screen.getByPlaceholderText('clientRegister.usernamePlaceholder'), 'testuser');
    await user.type(screen.getByPlaceholderText('clientRegister.passwordPlaceholder'), '123456');
    await user.type(screen.getByPlaceholderText('clientRegister.confirmPasswordPlaceholder'), '123456');
    await user.click(screen.getByText('clientRegister.submitButton'));
    await waitFor(() => {
      expect(screen.getByText('El usuario ya existe')).toBeInTheDocument();
    });
  });

  it('shows success and redirects on successful registration', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ message: 'Registro exitoso' }),
    });
    renderRegister();
    await user.type(screen.getByPlaceholderText('clientRegister.namePlaceholder'), 'Test');
    await user.type(screen.getByPlaceholderText('clientRegister.usernamePlaceholder'), 'testuser');
    await user.type(screen.getByPlaceholderText('clientRegister.passwordPlaceholder'), '123456');
    await user.type(screen.getByPlaceholderText('clientRegister.confirmPasswordPlaceholder'), '123456');
    await user.click(screen.getByText('clientRegister.submitButton'));
    await waitFor(() => {
      expect(screen.getByText('clientRegister.successMessage')).toBeInTheDocument();
    });
  });

  it('has link to login', () => {
    renderRegister();
    const loginLink = screen.getByText('clientRegister.loginLink').closest('a');
    expect(loginLink).toHaveAttribute('href', '/client/login');
  });

  it('renders Google login button', () => {
    renderRegister();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
  });
});
