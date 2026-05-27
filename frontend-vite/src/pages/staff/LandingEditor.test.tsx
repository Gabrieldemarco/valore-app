import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LandingEditor from './LandingEditor';
import { useAuth } from '../../contexts/AuthContext';
import type { Mock } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate, Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockTenantData = {
  tenant: {
    business_name: 'Mi Peluquería', slug: 'mi-pelu', landing_description: 'La mejor', business_address: 'Calle 123',
    business_phone: '+59899123456', landing_enabled: true, plan: 'free', trial_end_date: new Date(Date.now() + 86400000 * 15).toISOString(),
    brand_primary_color: '#c5a880', brand_secondary_color: '#d5be9b', brand_logo_url: null, landing_hero_image: null,
    landing_gallery: [], landing_team: [], landing_social_links: {}, landing_custom_css: null, landing_layout: null,
    opening_hours: null,
  },
  services: [
    { id: 1, name: 'Corte', duration: 30, price: 500, image: null },
    { id: 2, name: 'Tintura', duration: 60, price: 1200, image: null },
  ],
};

const mockStaffList = { staff: [
  { id: 1, name: 'Ana', email: 'ana@test.com', specialties: ['Cortes'], active: true, photo_url: null, bio: null },
]};

function setupFetch() {
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === 'string' ? url : url.toString();
    if (u.includes('/api/tenant/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantData) });
    if (u.includes('/api/tenant/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaffList) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderEditor() {
  return render(<MemoryRouter><LandingEditor /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  (useAuth as Mock).mockReturnValue({ staffToken: null, staffName: null, isAuthenticated: false, logout: vi.fn() });
});

describe('LandingEditor', () => {
  it('redirects to login when no staffToken', async () => {
    renderEditor();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/staff/login');
    });
  });

  it('loads data and renders editor when authenticated', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText('Editor de Landing')).toBeInTheDocument();
    });
  });

  it('renders all 9 tabs', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText('🏢 General')).toBeInTheDocument();
    });
    expect(screen.getByText('🎨 Branding')).toBeInTheDocument();
    expect(screen.getByText('🛎️ Servicios')).toBeInTheDocument();
    expect(screen.getByText('🕒 Horarios')).toBeInTheDocument();
    expect(screen.getByText('📷 Galería')).toBeInTheDocument();
    expect(screen.getByText('👥 Equipo')).toBeInTheDocument();
    expect(screen.getByText('🔗 Redes')).toBeInTheDocument();
    expect(screen.getByText('⚙️ CSS')).toBeInTheDocument();
    expect(screen.getByText('🧩 Layout')).toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => expect(screen.getByText('🏢 General')).toBeInTheDocument());
    fireEvent.click(screen.getByText('🎨 Branding'));
    await waitFor(() => {
      const activeTab = document.querySelector('.tab-btn.active');
      expect(activeTab).toHaveTextContent('🎨 Branding');
    });
  });

  it('general tab shows business name field', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Mi Peluquería');
      expect(nameInput).toBeInTheDocument();
    });
  });

  it('services tab shows services list', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => expect(screen.getByText('🏢 General')).toBeInTheDocument());
    fireEvent.click(screen.getByText('🛎️ Servicios'));
    await waitFor(() => {
      const nameInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder="Nombre"]');
      const corte = Array.from(nameInputs).find(i => i.value === 'Corte');
      expect(corte).toBeInTheDocument();
    });
  });

  it('services tab has add service button', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => expect(screen.getByText('🏢 General')).toBeInTheDocument());
    fireEvent.click(screen.getByText('🛎️ Servicios'));
    await waitFor(() => {
      expect(screen.getByText('+ Nuevo Servicio')).toBeInTheDocument();
    });
  });

  it('hours tab shows day checkboxes and hour inputs', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => expect(screen.getByText('🏢 General')).toBeInTheDocument());
    fireEvent.click(screen.getByText('🕒 Horarios'));
    await waitFor(() => {
      expect(screen.getByText('Días Laborables')).toBeInTheDocument();
      expect(screen.getByText('Hora Apertura')).toBeInTheDocument();
      expect(screen.getByText('Hora Cierre')).toBeInTheDocument();
    });
  });

  it('social tab shows social media fields', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => expect(screen.getByText('🏢 General')).toBeInTheDocument());
    fireEvent.click(screen.getByText('🔗 Redes'));
    await waitFor(() => {
      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    });
  });

  it('team tab shows staff list', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => expect(screen.getByText('🏢 General')).toBeInTheDocument());
    fireEvent.click(screen.getByText('👥 Equipo'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('+ Nuevo Peluquero')).toBeInTheDocument();
  });

  it('shows trial days left when on free plan', async () => {
    (useAuth as Mock).mockReturnValue({ staffToken: 'staff-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
    setupFetch();
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText(/Período de Prueba/)).toBeInTheDocument();
    });
  });
});
