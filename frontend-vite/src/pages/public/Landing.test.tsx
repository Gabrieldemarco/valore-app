import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Landing from './Landing';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockTenantLanding = {
  tenant: {
    business_name: 'Test Salon',
    slug: 'test-salon',
    landing_description: 'Best salon in town',
    landing_hero_image: null,
    landing_gallery: [],
    landing_team: [],
    landing_social_links: {},
    landing_custom_css: null,
    landing_layout: null,
    brand_primary_color: '#2563eb',
    brand_secondary_color: null,
    brand_logo_url: null,
    business_phone: '+59899123456',
    business_address: 'Calle 123',
    opening_hours: null,
  },
  services: [
    { id: 1, name: 'Corte moderno', duration: 30, price: 500, image: null },
    { id: 2, name: 'Tintura', duration: 60, price: 1200, image: null },
  ],
};

const mockStaff = {
  staff: [
    { id: 1, name: 'Ana López', photo_url: null, bio: 'Experta en cortes', specialties: ['Cortes modernos'] },
    { id: 2, name: 'Luis Pérez', photo_url: null, bio: 'Especialista en color', specialties: ['Colorimetría'] },
  ],
};

function renderLanding(initialEntries = ['/?tenant=test-salon']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Landing />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe('Landing', () => {
  test('shows skeleton while loading', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    renderLanding();
    expect(document.querySelector('.landing-view')).toBeInTheDocument();
  });

  test('shows salon not found when no tenant slug', () => {
    renderLanding(['/']);
    expect(screen.getByText('Salón no encontrado')).toBeInTheDocument();
  });

  test('shows error state when API fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    renderLanding();
    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar esta página')).toBeInTheDocument();
    });
  });

  test('renders tenant business name after successful load', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/landing')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantLanding) });
      if (url.includes('/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderLanding();
    await waitFor(() => {
      expect(screen.getAllByText('Test Salon')[0]).toBeInTheDocument();
    });
    expect(screen.getByText('Best salon in town')).toBeInTheDocument();
  });

  test('renders services section', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/landing')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantLanding) });
      if (url.includes('/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderLanding();
    await waitFor(() => {
      expect(screen.getByText('Corte moderno')).toBeInTheDocument();
    });
    expect(screen.getByText('Tintura')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
  });

  test('renders staff selection in booking step 1', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/landing')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantLanding) });
      if (url.includes('/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderLanding();
    await waitFor(() => {
      expect(screen.getByText('Elegí tu peluquero')).toBeInTheDocument();
    });
    const bookingSection = screen.getByText('Elegí tu peluquero').closest('.step-content') as HTMLElement;
    expect(within(bookingSection).getByText('Ana López')).toBeInTheDocument();
    expect(within(bookingSection).getByText('Luis Pérez')).toBeInTheDocument();
  });

  test('advances to step 2 when selecting a staff member', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/landing')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantLanding) });
      if (url.includes('/staff')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    renderLanding();
    await waitFor(() => expect(screen.getByText('Elegí tu peluquero')).toBeInTheDocument());
    const anaCards = screen.getAllByText('Ana López');
    fireEvent.click(anaCards[1]);
    await waitFor(() => {
      const activeSteps = document.querySelectorAll('.step.active');
      expect(activeSteps.length).toBeGreaterThan(0);
    });
  });

  test('submits booking form and shows success message', async () => {
    let availabilityCalled = false;
    let bookingCalled = false;

    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/availability')) {
        availabilityCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slots: [{ time: '10:00', available: true }, { time: '11:00', available: true }] }),
        });
      }
      if (url.includes('/landing')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTenantLanding) });
      }
      if (url.includes('/staff') && !url.includes('/availability')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
      }
      if (url.includes('/appointments') && (!options || options.method === 'POST' || options.method === undefined)) {
        bookingCalled = true;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderLanding();

    // Wait for initial data
    await waitFor(() => expect(screen.getByText('Elegí tu peluquero')).toBeInTheDocument());
    const anaCardsSubmit = screen.getAllByText('Ana López');
    fireEvent.click(anaCardsSubmit[1]);
    await waitFor(() => {
      const steps = document.querySelectorAll('.step.active');
      expect(steps.length).toBeGreaterThan(0);
    });

    // Step 2: select service
    await waitFor(() => expect(screen.getByText('Elegí un servicio')).toBeInTheDocument());
    const serviceCards = screen.getAllByText('Corte moderno');
    fireEvent.click(serviceCards[1]);

    // Step 3: select a date
    await waitFor(() => {
      expect(screen.getByText('Elegí una fecha disponible')).toBeInTheDocument();
    });
    const todayBtn = document.querySelector('.cal-today-btn');
    expect(todayBtn).toBeInTheDocument();
    fireEvent.click(todayBtn!);
    const futureDay = document.querySelector('.cal-day:not(.disabled):not(.empty)');
    if (futureDay) fireEvent.click(futureDay);

    // Step 4: wait for slots and select time
    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
    }, { timeout: 2000 });
    fireEvent.click(screen.getByText('10:00'));

    // Step 5: fill form and submit
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'María' } });
    fireEvent.change(screen.getByPlaceholderText('099 123 456'), { target: { value: '099123456' } });
    fireEvent.click(screen.getByText('Confirmar turno'));

    await waitFor(() => {
      expect(screen.getByText('Turno reservado con éxito')).toBeInTheDocument();
    });
    expect(bookingCalled).toBe(true);
  });
});
