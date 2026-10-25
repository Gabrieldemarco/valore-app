import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import StaffRegister from './Register';
import i18n from '../../i18n';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function renderRegister() {
  return render(<MemoryRouter><StaffRegister /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('StaffRegister', () => {
  it('renders registration form', () => {
    renderRegister();
    expect(screen.getByText('Crear tu Cuenta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Estilo Único')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Crear Cuenta')).toBeInTheDocument();
  });

  it('localizes the linked legal consent with the selected language', async () => {
    try {
      await i18n.changeLanguage('en');
      const { container } = renderRegister();
      const consentLabel = container.querySelector('label[for="acceptTerms"]');

      expect(consentLabel).toHaveTextContent(
        'I accept the Terms and Conditions, the Privacy Policy, and the Cancellation Policy of Velsoie.'
      );
      expect(screen.getByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute('href', '/terms#terms');
      expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/terms#privacy');
      expect(screen.getByRole('link', { name: 'Cancellation Policy' })).toHaveAttribute('href', '/terms#cancellations');
    } finally {
      await i18n.changeLanguage('es');
    }
  });

  it('shows error on failed registration', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'El email ya está registrado' }),
    });
    renderRegister();
    await user.type(screen.getByPlaceholderText('Ej: Estilo Único'), 'Mi Salon');
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123456');
    const termsCheckbox = screen.getByLabelText(/Acepto los/);
    await user.click(termsCheckbox);
    await user.click(screen.getByText('Crear Cuenta'));
    await waitFor(() => {
      expect(screen.getByText('El email ya está registrado')).toBeInTheDocument();
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
    await user.type(screen.getByPlaceholderText('Ej: Estilo Único'), 'Mi Salon');
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123456');
    const termsCheckbox = screen.getByLabelText(/Acepto los/);
    await user.click(termsCheckbox);
    await user.click(screen.getByText('Crear Cuenta'));
    await waitFor(() => {
      expect(screen.getByText('Registro exitoso')).toBeInTheDocument();
    });
    expect(screen.getByText('Redirigiendo al inicio de sesión...')).toBeInTheDocument();
  });

  it('has link to login', () => {
    renderRegister();
    expect(screen.getByText('Iniciá sesión aquí').closest('a')).toHaveAttribute('href', '/staff/login');
  });
});
