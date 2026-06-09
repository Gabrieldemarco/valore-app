import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PublicIndex from './PublicIndex';
import * as apiClient from '../../api/client';

const mockSalons = {
  tenants: [
    { id: 1, business_name: 'Barbería Clásica', slug: 'barberia-clasica', business_address: 'Centro', landing_description: 'Cortes clásicos', brand_logo_url: null, landing_hero_image: null, services: [{ name: 'Corte' }, { name: 'Barba' }] },
    { id: 2, business_name: 'Salón Elegance', slug: 'salon-elegance', business_address: 'Punta Carretas', landing_description: 'Estética femenina', brand_logo_url: '/uploads/logo.png', landing_hero_image: null, services: [{ name: 'Tintura' }, { name: 'Peinado' }] },
    { id: 3, business_name: 'Unisex Moderno', slug: 'unisex-moderno', business_address: 'Tres Cruces', landing_description: 'Cortes modernos y color', brand_logo_url: null, landing_hero_image: null, services: [] },
  ],
};

function renderPublicIndex(salonResponse?: object) {
  const spy = vi.spyOn(apiClient.api, 'get');
  if (salonResponse !== undefined) {
    spy.mockImplementation((path: string) => {
      if (path === '/api/geo') return Promise.resolve({ country: 'Uruguay', countryCode: 'UY' });
      return Promise.resolve(salonResponse);
    });
  } else {
    spy.mockImplementation((path: string) => {
      if (path === '/api/geo') return Promise.resolve({ country: 'Uruguay', countryCode: 'UY' });
      return new Promise(() => {}); // never resolve (loading state)
    });
  }
  return render(<MemoryRouter><PublicIndex /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('PublicIndex', () => {
  it('shows loading state initially', () => {
    renderPublicIndex(); // no response = loading
    expect(screen.getByText('Cargando peluquerías...')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    const spy = vi.spyOn(apiClient.api, 'get');
    spy.mockImplementation((path: string) => {
      if (path === '/api/geo') return Promise.resolve({ country: 'Uruguay', countryCode: 'UY' });
      return Promise.reject(new Error('Network error'));
    });
    render(<MemoryRouter><PublicIndex /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar las peluquerías.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no salons match filter', async () => {
    renderPublicIndex({ tenants: [] });
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron peluquerías/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders salon cards after loading', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getByText('Barbería Clásica')).toBeInTheDocument();
    });
    expect(screen.getByText('Salón Elegance')).toBeInTheDocument();
    expect(screen.getByText('Unisex Moderno')).toBeInTheDocument();
  });

  it('displays salon address and services', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getByText('Centro')).toBeInTheDocument();
    });
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
  });

  it('shows initials fallback when no image', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      const initials = document.querySelector('.salon-initials');
      expect(initials).toBeInTheDocument();
      expect(initials?.textContent).toBe('BC');
    });
  });

  it('salon card links to correct URL', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getByText('Barbería Clásica')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link');
    const salonLink = links.find(l => l.getAttribute('href') === '/p/barberia-clasica');
    expect(salonLink).toBeInTheDocument();
  });

  it('gender filter buttons are rendered and clickable', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getByText('Caballeros')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Damas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Unisex').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Todos').length).toBeGreaterThanOrEqual(1);
    const caballerosBtns = screen.getAllByText('Caballeros');
    const filterBtn = caballerosBtns.find(el => el.closest('button'));
    if (filterBtn) fireEvent.click(filterBtn);
    await waitFor(() => {
      const allCaba = screen.getAllByText('Caballeros');
      const activeBtn = allCaba.find(el => el.closest('button')?.classList.contains('active'));
      expect(activeBtn).toBeTruthy();
    });
  });

  it('search filters salons by name', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getByText('Barbería Clásica')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o ubicación...');
    fireEvent.change(searchInput, { target: { value: 'Elegance' } });
    await waitFor(() => {
      expect(screen.queryByText('Barbería Clásica')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Salón Elegance')).toBeInTheDocument();
  });

  it('hero collage click sets gender filter', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getByText('Barbería Clásica')).toBeInTheDocument();
    });
    const collageCards = document.querySelectorAll('.collage-card');
    expect(collageCards.length).toBe(2);
    if (collageCards[1]) fireEvent.click(collageCards[1]);
    await waitFor(() => {
      expect(document.querySelector('.filter-btn.active')).toBeInTheDocument();
    });
  });

  it('renders hero section with title and subtitle', () => {
    renderPublicIndex(); // no response = loading
    const titles = screen.getAllByText(/Estética Capilar/i);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    const subs = screen.getAllByText(/firmas boutique/i);
    expect(subs.length).toBeGreaterThanOrEqual(1);
  });

  it('has register and login links in header', () => {
    renderPublicIndex(); // no response = loading
    expect(screen.getByText('Sumate a Velsoie').closest('a')).toHaveAttribute('href', '/staff/register');
    expect(screen.getByText('Studio Access').closest('a')).toHaveAttribute('href', '/staff/login');
  });

  it('renders features section', () => {
    renderPublicIndex(); // no response = loading
    expect(screen.getByText('1. Buscá tu Peluquería')).toBeInTheDocument();
    expect(screen.getByText('2. Elegí el Servicio')).toBeInTheDocument();
    expect(screen.getByText('3. Confirmá en Segundos')).toBeInTheDocument();
  });
});
