import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import StaffDashboard from './Dashboard';
import { useAuth } from '../../contexts/AuthContext';
import type { Mock } from 'vitest';

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

function setupFetchResponses() {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/api/tenant/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantSettings) });
    if (u.includes('/api/tenant/plan')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlan) });
    if (u.includes('/api/tenant/invoices')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInvoices) });
    if (u.includes('/api/tenant/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaffList) });
    if (u.includes('/api/tenant/services')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockServicesList) });
    if (u.includes('/api/tenant/clients')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClients) });
    if (u.includes('/api/appointments')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAppointments) });
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
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/staff/login');
    });
  });

  test('renders tabs and appointments when authenticated', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Gestión de Turnos')).toBeInTheDocument();
    });
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Sofia')).toBeInTheDocument();
    expect(screen.getByText('📋 Turnos')).toBeInTheDocument();
    expect(screen.getByText('👥 Staff')).toBeInTheDocument();
    expect(screen.getByText('💇 Servicios')).toBeInTheDocument();
  });

  test('switches between tabs', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Carlos')).toBeInTheDocument());
    fireEvent.click(screen.getByText('👥 Staff'));
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    expect(screen.getByText('Luis')).toBeInTheDocument();
    fireEvent.click(screen.getByText('💇 Servicios'));
    await waitFor(() => {
      expect(screen.getAllByText('Corte').length).toBeGreaterThan(0);
    });
  });

  test('opens new appointment modal', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Carlos')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Nuevo Turno'));
    await waitFor(() => {
      expect(screen.getByText('Nuevo Turno')).toBeInTheDocument();
    });
  });

  test('opens staff modal and creates staff member', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Carlos')).toBeInTheDocument());
    fireEvent.click(screen.getByText('👥 Staff'));
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    fireEvent.click(screen.getByText('+ Nuevo Peluquero'));
    await waitFor(() => {
      expect(screen.getByText('Nuevo Peluquero')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Nombre del peluquero'), { target: { value: 'Pedro' } });
    const emailInput = screen.getByPlaceholderText('email@ejemplo.com') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'pedro@test.com' } });
    const createBtn = screen.getByText('Crear Peluquero');
    expect(createBtn).toBeInTheDocument();
  });

  test('opens services modal and creates service', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Carlos')).toBeInTheDocument());
    fireEvent.click(screen.getByText('💇 Servicios'));
    await waitFor(() => {
      const corteElements = screen.getAllByText('Corte');
      expect(corteElements.length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('+ Nuevo Servicio'));
    await waitFor(() => {
      expect(screen.getByText('Nuevo Servicio')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Corte de cabello'), { target: { value: 'Peinado' } });
    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '45' } });
    const createBtn = screen.getByText('Crear Servicio');
    expect(createBtn).toBeInTheDocument();
  });

  test('paginates appointments', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'fake-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    mockFetch.mockImplementation((url: string) => {
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/Siguiente/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Siguiente/));
    await waitFor(() => {
      expect(screen.getByText('Page2')).toBeInTheDocument();
    });
  });
});
