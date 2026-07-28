import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ClientDashboard from './Dashboard';
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

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockProfile = { user: { name: 'Carlos', phone: '+59899111111', email: 'carlos@test.com' } };
const mockAppointments = {
  appointments: [
    { id: 1, client_name: 'Carlos', service: 'Corte', date: '2026-06-01', time: '10:00', appointment_date: '2026-06-01T10:00:00', status: 'confirmed', client_phone: '+59899111111' },
    { id: 2, client_name: 'Carlos', service: 'Tintura', date: '2026-05-01', time: '14:00', appointment_date: '2026-05-01T14:00:00', status: 'completed', client_phone: '+59899111111', service_price: 1200 },
  ],
};
const mockAgenda: unknown[] = [
  { id: 1, titulo: 'Mi evento', fecha: '2026-06-15T10:00', descripcion: 'Test' },
];
const mockTenants = {
  tenants: [
    { id: 1, slug: 'mi-pelu', business_name: 'Mi Peluqueria', brand_logo_url: null, business_address: 'Calle 123', landing_hero_image: null, category: null },
  ],
};

function setupFetchResponses() {
  mockFetch.mockImplementation((url: string | URL) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/api/client/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProfile) });
    if (u.includes('/api/tenant/client-appointments')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAppointments) });
    if (u.includes('/api/agenda')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAgenda) });
    if (u.includes('/api/tenants')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenants) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/client/dashboard']}>
      <ClientDashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  localStorage.clear();
  (useAuth as Mock).mockReturnValue({
    clientToken: 'fake-token',
    clientName: 'Carlos',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe('ClientDashboard', () => {
  it('redirects to login when no token', async () => {
    (useAuth as Mock).mockReturnValue({ clientToken: null, clientName: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() });
    renderDashboard();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/client/login');
    });
  });

  it('shows loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText('clientDashboard.loading')).toBeInTheDocument();
  });

  it('renders dashboard with welcome message when authenticated', async () => {
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('clientDashboard.upcomingTitle')).toBeInTheDocument();
    });
  });

  it('shows upcoming appointments', async () => {
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Corte')).toBeInTheDocument();
    });
  });

  it('shows history section', async () => {
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('clientDashboard.historyTitle')).toBeInTheDocument();
    });
  });

  it('shows profile section', async () => {
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('clientDashboard.profileTitle')).toBeInTheDocument();
    });
  });

  it('shows tenants section', async () => {
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Mi Peluqueria')).toBeInTheDocument();
    });
  });

  it('shows no upcoming appointments message when empty', async () => {
    mockFetch.mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/api/client/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProfile) });
      if (u.includes('/api/tenant/client-appointments')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ appointments: [] }) });
      if (u.includes('/api/agenda')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (u.includes('/api/tenants')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ tenants: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('clientDashboard.noUpcoming')).toBeInTheDocument();
    });
  });

  it('calls logout and navigates on logout click', async () => {
    const user = userEvent.setup();
    const logoutMock = vi.fn();
    (useAuth as Mock).mockReturnValue({ clientToken: 'fake-token', clientName: 'Carlos', isAuthenticated: true, login: vi.fn(), logout: logoutMock });
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('clientDashboard.upcomingTitle')).toBeInTheDocument();
    });
    await user.click(screen.getByText('clientDashboard.logout'));
    expect(logoutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to tenant on click', async () => {
    const user = userEvent.setup();
    setupFetchResponses();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Mi Peluqueria')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Mi Peluqueria'));
    expect(mockNavigate).toHaveBeenCalledWith('/p/mi-pelu');
  });
});
