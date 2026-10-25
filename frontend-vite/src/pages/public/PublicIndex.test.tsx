import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PublicIndex from './PublicIndex';
import * as apiClient from '../../api/client';
import { ThemeProvider } from '../../contexts/ThemeContext';
import i18n from '../../i18n';

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
      if (path === '/api/tenants/new-professionals') return Promise.resolve({ tenants: [] });
      if (path === '/api/services/featured') return Promise.resolve({ services: [] });
      return Promise.resolve(salonResponse);
    });
  } else {
    spy.mockImplementation((path: string) => {
      if (path === '/api/geo') return Promise.resolve({ country: 'Uruguay', countryCode: 'UY' });
      if (path === '/api/tenants/new-professionals') return Promise.resolve({ tenants: [] });
      if (path === '/api/services/featured') return Promise.resolve({ services: [] });
      return new Promise(() => {}); // never resolve (loading state)
    });
  }
  return render(<MemoryRouter><ThemeProvider><PublicIndex /></ThemeProvider></MemoryRouter>);
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
    render(<MemoryRouter><ThemeProvider><PublicIndex /></ThemeProvider></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar las peluquerías.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no salons match filter', async () => {
    renderPublicIndex({ tenants: [] });
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron resultados/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders salon cards after loading', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getAllByText('Barbería Clásica').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Salón Elegance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Unisex Moderno').length).toBeGreaterThanOrEqual(1);
  });

  it('displays salon address and services', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getAllByText('Centro').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Corte').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Barba').length).toBeGreaterThanOrEqual(1);
  });

  it('shows initials fallback when no image', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      const initials = document.querySelector('.salon-initials');
      expect(initials).toBeInTheDocument();
      expect(screen.getAllByText('BC').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('salon card links to correct URL', async () => {
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getAllByText('Barbería Clásica').length).toBeGreaterThanOrEqual(1);
    });
    const links = screen.getAllByRole('link');
    const salonLink = links.find(l => l.getAttribute('href') === '/p/barberia-clasica');
    expect(salonLink).toBeInTheDocument();
  });

  it('keeps the hero clean and links to the treatment cards below', async () => {
    const { container } = renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(container.querySelector('.hero--text-only')).toBeInTheDocument();
    });
    expect(container.querySelector('.hero-care-collage')).not.toBeInTheDocument();
    expect(container.querySelector('.care-filter-bar')).not.toBeInTheDocument();
    expect(container.querySelector('.hero-actions a[href="#treatment-categories"]')).toBeInTheDocument();
    expect(container.querySelector('#treatment-categories')).toBeInTheDocument();
  });

  it('search filters salons by name', async () => {
    const user = userEvent.setup();
    renderPublicIndex(mockSalons);
    await waitFor(() => {
      expect(screen.getAllByText('Barbería Clásica').length).toBeGreaterThanOrEqual(1);
    });
    const searchInput = screen.getByPlaceholderText('Servicio');
    await user.type(searchInput, 'Elegance');
    await waitFor(() => {
      expect(screen.queryAllByText('Barbería Clásica').length).toBe(0);
    });
    expect(screen.getAllByText('Salón Elegance').length).toBeGreaterThanOrEqual(1);
  });

  it('updates the full homepage search heading when the language changes', async () => {
    await i18n.changeLanguage('es');
    const user = userEvent.setup();
    renderPublicIndex(mockSalons);

    expect(screen.getByText('Tu próximo look empieza acá')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Encontrá un salón y reservá tu turno' })).toBeInTheDocument();
    expect(screen.getByText('Filtrá por servicio, profesional, ubicación o fecha.')).toBeInTheDocument();

    await user.click(screen.getByText('EN'));
    await waitFor(() => {
      expect(screen.getByText('Your next look starts here')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Find a salon and book your appointment' })).toBeInTheDocument();
      expect(screen.getByText('Filter by service, professional, location, or date.')).toBeInTheDocument();
    });

    await user.click(screen.getByText('PT'));
    await waitFor(() => {
      expect(screen.getByText('Seu próximo visual começa aqui')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Encontre um salão e agende seu horário' })).toBeInTheDocument();
      expect(screen.getByText('Filtre por serviço, profissional, localização ou data.')).toBeInTheDocument();
    });

    await i18n.changeLanguage('es');
  });

  it('renders hero section with title and subtitle', () => {
    renderPublicIndex(); // no response = loading
    const titles = screen.getAllByText(/Reservá servicios de belleza y bienestar|Reserva servicios de cuidado personal/i);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    const subs = screen.getAllByText(/salones y profesionales para cabello/i);
    expect(subs.length).toBeGreaterThanOrEqual(1);
  });

  it('has register and login links in header', () => {
    renderPublicIndex(); // no response = loading
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: /sumate a velsoie/i })).toHaveAttribute('href', '/staff/register');
    expect(within(header).getByRole('link', { name: /studio access/i })).toHaveAttribute('href', '/staff/login');
  });

  it('renders features section', () => {
    renderPublicIndex(); // no response = loading
    expect(screen.getByText('1. Buscá tu Peluquería')).toBeInTheDocument();
    expect(screen.getByText('2. Elegí el Servicio')).toBeInTheDocument();
    expect(screen.getByText('3. Confirmá en Segundos')).toBeInTheDocument();
  });
});
