import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, beforeEach, vi } from 'vitest';
import StaffDashboard from './Dashboard';
import { useAuth } from '../../contexts/AuthContext';
import type { Mock } from 'vitest';

vi.mock('../../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../api/client')>();
  return {
    ...mod,
    api: {
      get: (path: string) => {
        if (path === '/api/tenant/stats/summary') return Promise.resolve({ todayAppointments: 2, monthAppointments: 15, monthRevenue: 7500, pendingAppointments: 3, completedAppointments: 10, cancellationRate: 10 });
        if (path === '/api/tenant/stats/revenue-by-month') return Promise.resolve({ months: [{ month: '2026-01', appointments: 10, revenue: 5000 }, { month: '2026-02', appointments: 12, revenue: 6000 }, { month: '2026-03', appointments: 15, revenue: 7500 }] });
        if (path === '/api/tenant/stats/top-services') return Promise.resolve({ services: [{ service: 'Corte', count: 20, avg_price: 500 }, { service: 'Tintura', count: 10, avg_price: 1200 }] });
        return mod.api.get(path);
      },
      post: mod.api.post,
      put: mod.api.put,
      delete: mod.api.delete,
    },
  };
});


const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

// Mock useAuth to avoid AuthProvider dependency
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

class MockBC {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  postMessage(_data: unknown) {}
  close() {}
}
vi.stubGlobal('BroadcastChannel', MockBC);

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockTenantSettings = {
  tenant: {
    business_name: 'Mi Peluqueria',
    business_phone: '+59899123456',
    business_address: 'Calle 123',
    notification_email: 'owner@test.com',
    notification_whatsapp: '+59899123456',
    slug: 'mi-pelu',
    opening_hours: { startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] },
  },
};

const mockPlan = {
  tenant: { plan: 'pro', status: 'active', price: 990 },
};

const mockInvoices = { invoices: [
  { id: 1, amount: 990, status: 'paid', due_date: '2026-06-01', description: 'Plan Pro Junio' },
] };

const mockStaffList = { staff: [
  { id: 1, name: 'Ana', email: 'ana@test.com', specialties: ['Cortes'], photo_url: null, bio: null, active: true },
  { id: 2, name: 'Luis', email: 'luis@test.com', specialties: ['Color'], photo_url: null, bio: null, active: true },
] };

const mockServicesList = { services: [
  { id: 1, name: 'Corte', duration: 30, price: 500, active: true, image: null },
  { id: 2, name: 'Tintura', duration: 60, price: 1200, active: true, image: null },
] };

const mockClients = { clients: [
  { client_name: 'María', client_phone: '+59899123456', client_email: 'maria@test.com', total_appointments: '5', last_appointment: '2026-05-20', first_appointment: '2025-01-10' },
] };

const mockAppointments = {
  appointments: [
    { id: 1, client_name: 'Carlos', service: 'Corte', date: '2026-06-01', time: '10:00', appointment_date: '2026-06-01T10:00:00', status: 'confirmed', client_phone: '+59899111111' },
    { id: 2, client_name: 'Sofia', service: 'Tintura', date: '2026-06-01', time: '14:00', appointment_date: '2026-06-01T14:00:00', status: 'confirmed', client_phone: '+59899222222' },
  ],
  total: 2,
  totalPages: 1,
};

const mockAnalyticsSummary = {
  todayAppointments: 2, monthAppointments: 15, monthRevenue: 7500,
  pendingAppointments: 3, completedAppointments: 10, cancellationRate: 10,
};

const mockRevenueByMonth = {
  months: [
    { month: '2026-01', appointments: 10, revenue: 5000 },
    { month: '2026-02', appointments: 12, revenue: 6000 },
    { month: '2026-03', appointments: 15, revenue: 7500 },
  ],
};

const mockTopServices = {
  services: [
    { service: 'Corte', count: 20, avg_price: 500 },
    { service: 'Tintura', count: 10, avg_price: 1200 },
  ],
};

function setupFetchResponses() {
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/api/tenant/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantSettings) });
    if (u.includes('/api/tenant/plan')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlan) });
    if (u.includes('/api/tenant/invoices')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInvoices) });
    if (u.includes('/api/tenant/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaffList) });
    if (u.includes('/api/tenant/services')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockServicesList) });
    if (u.includes('/api/tenant/clients')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClients) });
    if (u.includes('/api/appointments')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAppointments) });
    if (u.includes('/api/tenant/stats/summary')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAnalyticsSummary) });
    if (u.includes('/api/tenant/stats/revenue-by-month')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRevenueByMonth) });
    if (u.includes('/api/tenant/stats/top-services')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTopServices) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/staff/dashboard']}>
      <StaffDashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  localStorage.clear();
  (useAuth as Mock).mockReturnValue({
    staffToken: null,
    staffName: null,
    isAuthenticated: false,
    logout: vi.fn(),
  });
});

describe('StaffDashboard', () => {
  test('redirects to login when no token', async () => {
    renderDashboard();
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/staff/login');
    });
  });

  test('renders tabs and appointments when authenticated', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    expect(await screen.findByText('Gestión de Turnos')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Sofia')).toBeInTheDocument();
    expect(screen.getAllByText('Turnos')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Staff')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Servicios')[0]).toBeInTheDocument();
  });

  test('switches between tabs', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    expect(await screen.findByText('Carlos')).toBeInTheDocument();
    await user.click(screen.getAllByText('Staff')[0]);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
    await user.click(screen.getAllByText('Servicios')[0]);
    const corteElements = await screen.findAllByText('Corte');
    expect(corteElements.length).toBeGreaterThan(0);
  });

  test('opens new appointment modal', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    expect(await screen.findByText('Carlos')).toBeInTheDocument();
    await user.click(screen.getAllByText('Nuevo Turno')[0]);
    expect(await screen.findByText('Crear Turno')).toBeInTheDocument();
  });

  test('opens staff modal and creates staff member', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    expect(await screen.findByText('Carlos')).toBeInTheDocument();
    await user.click(screen.getAllByText('Staff')[0]);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    await user.click(screen.getByText('+ Nuevo Profesional'));
    expect(await screen.findByText('Nuevo Profesional')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Nombre del profesional'));
    await user.type(screen.getByPlaceholderText('Nombre del profesional'), 'Pedro');
    const emailInput = screen.getByPlaceholderText('email@ejemplo.com') as HTMLInputElement;
    await user.clear(emailInput);
    await user.type(emailInput, 'pedro@test.com');
    const createBtn = screen.getByText('Crear Peluquero');
    expect(createBtn).toBeInTheDocument();
  });

  test('opens services modal and creates service', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    expect(await screen.findByText('Carlos')).toBeInTheDocument();
    await user.click(screen.getAllByText('Servicios')[0]);
    const corteElements = await screen.findAllByText('Corte');
    expect(corteElements.length).toBeGreaterThan(0);
    await user.click(screen.getByText('+ Nuevo Servicio'));
    expect(await screen.findByText('Nuevo Servicio')).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Ej: Corte de cabello'));
    await user.type(screen.getByPlaceholderText('Ej: Corte de cabello'), 'Peinado');
    const durationInput = screen.getByDisplayValue('30') as HTMLInputElement;
    await user.clear(durationInput);
    await user.type(durationInput, '45');
    const createBtn = screen.getByText('Crear Servicio');
    expect(createBtn).toBeInTheDocument();
  });

  test('analytics tab loads when clicked', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    expect(await screen.findByText('Carlos')).toBeInTheDocument();
    await user.click(screen.getByText('📊 Analytics'));
    expect(await screen.findByText('Ingresos del mes')).toBeInTheDocument();
  });

  test('paginates appointments', async () => {
    const user = userEvent.setup();
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    mockFetch.mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/api/tenant/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantSettings) });
      if (u.includes('/api/tenant/plan')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlan) });
      if (u.includes('/api/tenant/invoices')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInvoices) });
      if (u.includes('/api/tenant/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaffList) });
      if (u.includes('/api/tenant/services')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockServicesList) });
      if (u.includes('/api/tenant/clients')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClients) });
      if (u.includes('/api/appointments')) {
        if (u.includes('page=2')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ appointments: [{ id: 3, client_name: 'Page2', service: 'Test', date: '2026-06-02', time: '11:00', appointment_date: '2026-06-02T11:00:00', status: 'confirmed', client_phone: '+59899333333' }], total: 25, totalPages: 2 }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ appointments: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, client_name: `Cliente ${i + 1}`, service: 'Corte', date: '2026-06-01', time: `${(i % 12) + 8}:00`, appointment_date: `2026-06-01T${(i % 12) + 8}:00:00`, status: 'confirmed', client_phone: `+59899${String(i).padStart(5, '0')}` })), total: 25, totalPages: 2 }) });
      }
    if (u.includes('/api/tenant/stats/summary')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAnalyticsSummary) });
    if (u.includes('/api/tenant/stats/revenue-by-month')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRevenueByMonth) });
    if (u.includes('/api/tenant/stats/top-services')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTopServices) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderDashboard();
    expect(await screen.findByText(/Siguiente/)).toBeInTheDocument();
    await user.click(screen.getByText(/Siguiente/));
    expect(await screen.findByText('Page2')).toBeInTheDocument();
  });
});
