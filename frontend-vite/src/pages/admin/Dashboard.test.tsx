import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminDashboard from './Dashboard';
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

const mockStats = { totalInvoiced: 50000, activeTenants: 10, pendingInvoices: 3 };
const mockTenants = { tenants: [
  { id: 1, business_name: 'Barbería Centro', slug: 'barberia-centro', notification_email: 'bar@test.com', plan: 'free', status: 'active', trial_end_date: '2026-06-15', created_at: '2026-01-10' },
  { id: 2, business_name: 'Salón Norte', slug: 'salon-norte', notification_email: 'salon@test.com', plan: 'pro', status: 'active', trial_end_date: null, created_at: '2026-02-20' },
  { id: 3, business_name: 'Estética Sur', slug: 'estetica-sur', notification_email: 'sur@test.com', plan: 'free', status: 'suspended', trial_end_date: '2026-04-01', created_at: '2025-12-01' },
]};

const mockTenantDetail = {
  tenant: {
    id: 1, business_name: 'Barbería Centro', slug: 'barberia-centro', notification_email: 'bar@test.com',
    business_phone: '+59899123456', plan: 'free', status: 'active',
    trial_end_date: '2026-06-15', trial_expired: false, trial_days_left: 20, created_at: '2026-01-10',
  },
};

const mockInvoices = { invoices: [
  { id: 1, invoice_number: 'INV-001', amount: 990, status: 'paid', issue_date: '2026-05-01', payment_method: 'mercadopago', paid_date: '2026-05-01' },
  { id: 2, invoice_number: 'INV-002', amount: 990, status: 'pending', issue_date: '2026-06-01', payment_method: null, paid_date: null },
]};

const mockPayments = { payments: [
  { id: 1, invoice_id: 1, amount: 990, currency: 'UYU', method: 'mercadopago', mp_payment_id: 'MP123', status: 'approved', created_at: '2026-05-01', invoice_number: 'INV-001', invoice_description: 'Plan Pro' },
]};

function setupFetch() {
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/stats/billing')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
    if (u.includes('/api/super-admin/tenants') && u.match(/\/\d+$/)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantDetail) });
    if (u.includes('/api/super-admin/tenants') && u.includes('/invoices')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInvoices) });
    if (u.includes('/api/super-admin/tenants') && u.includes('/payments')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayments) });
    if (u.includes('/api/super-admin/tenants')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenants) });
    if (u.includes('/api/super-admin/config')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ config: { twilio: { account_sid: 'ACxxx', auth_token: '', from: '' } } }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderDashboard() {
  return render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (useAuth as Mock).mockReturnValue({
    superAdminToken: null, staffToken: null, staffName: null, isAuthenticated: false, isSuperAdmin: false,
    login: vi.fn(), logout: vi.fn(),
  });
});

describe('AdminDashboard', () => {
  it('redirects to login when no superAdminToken', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
    });
  });

  it('renders stats and tenants when authenticated', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Panel de Administración')).toBeInTheDocument();
    });
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Barbería Centro')).toBeInTheDocument();
    expect(screen.getByText('Salón Norte')).toBeInTheDocument();
  });

  it('filters tenants by search', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText('Buscar salón...');
    fireEvent.change(searchInput, { target: { value: 'Norte' } });
    await waitFor(() => {
      expect(screen.queryByText('Barbería Centro')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Salón Norte')).toBeInTheDocument();
  });

  it('opens tenant detail modal', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    const verBtns = screen.getAllByText('Ver');
    fireEvent.click(verBtns[0]);
    await waitFor(() => {
      const items = screen.getAllByText('Barbería Centro');
      expect(items.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });
  });

  it('closes modal via close button', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => {
      const items = screen.getAllByText('Barbería Centro');
      expect(items.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) fireEvent.click(closeBtn);
    await waitFor(() => {
      const items = screen.getAllByText('Barbería Centro');
      expect(items.length).toBe(1);
    }, { timeout: 3000 });
  });

  it('switches to invoices tab in modal', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getByText('Facturas')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Facturas'));
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
  });

  it('switches to payments tab in modal', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getByText('Pagos MP')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Pagos MP'));
    await waitFor(() => {
      expect(screen.getByText('MP123')).toBeInTheDocument();
    });
  });

  it('shows Twilio config section', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await screen.findByText(/Twilio \(WhatsApp\)/, {}, { timeout: 3000 });
  });

  it('saves Twilio config', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await screen.findByText(/Twilio \(WhatsApp\)/, {}, { timeout: 3000 });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'Configuración de Twilio guardada' }) });
    fireEvent.click(screen.getByText('Guardar Twilio'));
    await screen.findByText('Configuración de Twilio guardada', {}, { timeout: 3000 });
  });

  it('logout calls logout and navigates', async () => {
    const logoutMock = vi.fn();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: logoutMock });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Panel de Administración')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cerrar sesión'));
    expect(logoutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('shows set-trial button and calls API', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    const trialBtns = screen.getAllByText('Poner en Trial');
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'Cuenta puesta en trial correctamente' }) });
    fireEvent.click(trialBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('Cuenta puesta en trial correctamente')).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  it('creates a new invoice in modal', async () => {
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getByText('Facturas')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Facturas'));
    await waitFor(() => expect(screen.getByText('Nueva Factura')).toBeInTheDocument());
    const amountInput = screen.getByPlaceholderText('0.00');
    const descInput = screen.getByPlaceholderText('Ej: Plan Mensual Pro');
    fireEvent.change(amountInput, { target: { value: '1500' } });
    fireEvent.change(descInput, { target: { value: 'Plan Premium' } });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'Factura creada' }) });
    fireEvent.click(screen.getByText('Crear Factura'));
    await waitFor(() => {
      expect(screen.getByText('Factura creada')).toBeInTheDocument();
    });
  });
});
