import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const mockBillingInvoices = {
  pending: [{
    id: 2, invoice_number: 'INV-002', amount: '990.00', status: 'pending',
    issue_date: '2026-06-01', due_date: '2026-06-08', payment_method: null,
    tenant_id: 1, business_name: 'Barbería Centro', slug: 'barberia-centro', currency: 'UYU',
  }],
  paid: [{
    id: 1, invoice_number: 'INV-001', amount: '19.80', status: 'paid',
    issue_date: '2026-05-01', due_date: null, payment_method: 'stripe',
    tenant_id: 2, business_name: 'Salón Norte', slug: 'salon-norte', currency: 'USD',
  }],
};

const mockPayments = { payments: [
  { id: 1, invoice_id: 1, amount: 990, currency: 'UYU', method: 'mercadopago', mp_payment_id: 'MP123', status: 'approved', created_at: '2026-05-01', invoice_number: 'INV-001', invoice_description: 'Plan Pro' },
]};

function setupFetch() {
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/stats/billing')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
    if (u.includes('/billing/invoices?status=pending')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ invoices: mockBillingInvoices.pending }) });
    if (u.includes('/billing/invoices?status=paid')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ invoices: mockBillingInvoices.paid }) });
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
  localStorage.clear();
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
    expect(screen.getByText('Establecimientos')).toBeInTheDocument();
    expect(screen.getByText('Barbería Centro')).toBeInTheDocument();
    expect(screen.getByText('Salón Norte')).toBeInTheDocument();
  });

  it('loads every tenant page with the super-admin token', async () => {
    const additionalTenant = {
      ...mockTenants.tenants[0],
      id: 4,
      business_name: 'Salón Este',
      slug: 'salon-este',
      notification_email: 'este@test.com',
    };
    localStorage.setItem('staffToken', 'staff-token');
    localStorage.setItem('superAdminToken', 'admin-token');
    (useAuth as Mock).mockReturnValue({
      superAdminToken: 'admin-token', staffToken: 'staff-token',
      isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn(),
    });
    const tenantRequestAuthorizations: string[] = [];
    mockFetch.mockImplementation((url: string | URL, options?: RequestInit) => {
      const requestUrl = new URL(url.toString(), window.location.origin);
      if (requestUrl.pathname === '/api/super-admin/tenants') {
        tenantRequestAuthorizations.push(new Headers(options?.headers).get('Authorization') ?? '');
        const page = requestUrl.searchParams.get('page');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(page === '1'
            ? { tenants: [mockTenants.tenants[0]], totalPages: 2 }
            : { tenants: [additionalTenant], totalPages: 2 }),
        });
      }
      if (requestUrl.pathname.endsWith('/stats/billing')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderDashboard();

    expect(await screen.findByText('Salón Este')).toBeInTheDocument();
    expect(tenantRequestAuthorizations).toEqual(['Bearer admin-token', 'Bearer admin-token']);
  });

  it('filters tenants by search', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText('Buscar establecimiento...');
    await user.type(searchInput, 'Norte');
    await waitFor(() => {
      expect(screen.queryByText('Barbería Centro')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Salón Norte')).toBeInTheDocument();
  });

  it('filters the tenant list when the active-establishments card is clicked', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /Activos/ }));

    expect(screen.getByText('Barbería Centro')).toBeInTheDocument();
    expect(screen.getByText('Salón Norte')).toBeInTheDocument();
    expect(screen.queryByText('Estética Sur')).not.toBeInTheDocument();
  });

  it('shows pending and paid invoices when their KPI cards are clicked', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /Facturas Pendientes/ }));
    expect(await screen.findByText('INV-002')).toBeInTheDocument();
    expect(screen.getByText('Barbería Centro')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Facturado Total/ }));
    expect(await screen.findByText('INV-001')).toBeInTheDocument();
    expect(screen.getAllByText(/USD/).length).toBeGreaterThan(1);
  });

  it('opens tenant detail modal', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    const verBtns = screen.getAllByText('Ver');
    await user.click(verBtns[0]);
    await waitFor(() => {
      const items = screen.getAllByText('Barbería Centro');
      expect(items.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });
  });

  it('sends the super-admin token when loading tenant detail data', async () => {
    const user = userEvent.setup();
    const authHeaders: string[] = [];
    localStorage.setItem('superAdminToken', 'admin-token');
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    mockFetch.mockImplementation((url: string | URL, options?: RequestInit) => {
      const requestUrl = new URL(url.toString(), window.location.origin);
      const auth = new Headers(options?.headers as HeadersInit | undefined).get('Authorization') ?? '';
      if (requestUrl.pathname.startsWith('/api/super-admin/tenants')) {
        authHeaders.push(auth);
      }
      if (requestUrl.pathname === '/api/super-admin/tenants') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenants: [mockTenants.tenants[0]], totalPages: 1 }) });
      }
      if (requestUrl.pathname === '/api/super-admin/tenants/1') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantDetail) });
      }
      if (requestUrl.pathname === '/api/super-admin/tenants/1/invoices') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInvoices) });
      }
      if (requestUrl.pathname === '/api/super-admin/tenants/1/payments') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayments) });
      }
      if (requestUrl.pathname === '/api/super-admin/tenants/1/services') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ services: [] }) });
      }
      if (requestUrl.pathname.endsWith('/stats/billing')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
      }
      if (requestUrl.pathname === '/api/super-admin/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ config: { twilio: { account_sid: 'ACxxx', auth_token: '', from: '' } } }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    await user.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getAllByText('Barbería Centro').length).toBeGreaterThanOrEqual(2));

    expect(authHeaders.filter(header => header === 'Bearer admin-token').length).toBeGreaterThanOrEqual(4);
  });

  it('closes modal via close button', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    await user.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => {
      const items = screen.getAllByText('Barbería Centro');
      expect(items.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) await user.click(closeBtn);
    await waitFor(() => {
      const items = screen.getAllByText('Barbería Centro');
      expect(items.length).toBe(1);
    }, { timeout: 3000 });
  });

  it('switches to invoices tab in modal', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    await user.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getByText('Facturas')).toBeInTheDocument());
    await user.click(screen.getByText('Facturas'));
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
  });

  it('switches to payments tab in modal', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    await user.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getByText('Pagos MP')).toBeInTheDocument());
    await user.click(screen.getByText('Pagos MP'));
    await waitFor(() => {
      expect(screen.getByText('MP123')).toBeInTheDocument();
    });
  });

  it('shows Twilio config section', async () => {
    userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await screen.findByText(/Twilio \(WhatsApp\)/, {}, { timeout: 3000 });
  });

  it('saves Twilio config', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await screen.findByText(/Twilio \(WhatsApp\)/, {}, { timeout: 3000 });
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'Configuración de Twilio guardada' }) });
    await user.click(screen.getByText('Guardar Twilio'));
    await screen.findByText('Configuración de Twilio guardada', {}, { timeout: 3000 });
  });

  it('logout calls logout and navigates', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: logoutMock });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Panel de Administración')).toBeInTheDocument());
    await user.click(screen.getByText('Cerrar sesión'));
    expect(logoutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login');
  });

  it('shows set-trial button and calls API', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    const trialBtns = screen.getAllByText('Poner en Trial');
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'Cuenta puesta en trial correctamente' }) });
    await user.click(trialBtns[0]);
    await waitFor(() => {
      expect(screen.getByText('Cuenta puesta en trial correctamente')).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  it('creates a new invoice in modal', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ superAdminToken: 'admin-token', staffToken: null, isAuthenticated: true, isSuperAdmin: true, login: vi.fn(), logout: vi.fn() });
    setupFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Barbería Centro')).toBeInTheDocument());
    await user.click(screen.getAllByText('Ver')[0]);
    await waitFor(() => expect(screen.getByText('Facturas')).toBeInTheDocument());
    await user.click(screen.getByText('Facturas'));
    await waitFor(() => expect(screen.getByText('Nueva Factura')).toBeInTheDocument());
    const amountInput = screen.getByPlaceholderText('0.00');
    const descInput = screen.getByPlaceholderText('Ej: Plan Mensual Pro');
    await user.type(amountInput, '1500');
    await user.type(descInput, 'Plan Premium');
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'Factura creada' }) });
    await user.click(screen.getByText('Crear Factura'));
    await waitFor(() => {
      expect(screen.getByText('Factura creada')).toBeInTheDocument();
    });
  });
});
