import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PricingSection from './PricingSection';
import { api } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { months?: number }) => {
      const map: Record<string, string> = {
        'publicIndex.pricingEyebrow': 'Planes y Tarifas',
        'publicIndex.pricingTitle': 'Precios transparentes para tu salón',
        'publicIndex.pricingSubtitle': 'Elegí el plan perfecto para gestionar tus turnos.',
        'publicIndex.pricingPlanBasicLabel': 'Básico',
        'publicIndex.pricingPlanStandardLabel': 'Estándar',
        'publicIndex.pricingPlanPremiumLabel': 'Premium',
        'publicIndex.pricingBadgePopular': 'Más Popular',
        'publicIndex.pricingPerMonth': '/mes',
        'publicIndex.pricingOriginalPrice': 'Antes',
        'publicIndex.pricingIncludes': 'Todo lo que incluye:',
        'publicIndex.pricingCta': 'Comenzar 15 días gratis',
        'publicIndex.pricingCurrencyLocal': 'UYU ($)',
        'publicIndex.pricingCurrencyUSD': 'USD ($)',
        'publicIndex.pricingTrustNoContract': 'Sin permanencia ni contratos',
        'publicIndex.pricingTrustTrial': '15 días de prueba completa',
        'publicIndex.pricingTrustInstant': 'Activación en 2 minutos',
        'publicIndex.pricingTrustSupport': 'Soporte personalizado por WhatsApp',
      };
      if (key === 'publicIndex.pricingPromoMonths') {
        return `Promo primeros ${opts?.months || 3} meses`;
      }
      return map[key] || key;
    },
  }),
}));

describe('PricingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plans correctly when API returns data', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      prices: [
        {
          plan_name: 'basico',
          price: 400,
          price_usd: 10,
          currency: 'UYU',
          promo_price: 280,
          promo_price_usd: 7,
          promo_months: 3,
        },
        {
          plan_name: 'estandar',
          price: 760,
          price_usd: 19,
          currency: 'UYU',
          promo_price: 560,
          promo_price_usd: 14,
          promo_months: 3,
        },
        {
          plan_name: 'premium',
          price: 1160,
          price_usd: 29,
          currency: 'UYU',
          promo_price: 840,
          promo_price_usd: 21,
          promo_months: 3,
        },
      ],
    });

    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Precios transparentes para tu salón')).toBeInTheDocument();
      expect(screen.getByText('Estándar')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText('Básico')).toBeInTheDocument();
    });

    // Check popular badge
    expect(screen.getByText('Más Popular')).toBeInTheDocument();

    // Check promo prices formatted
    expect(screen.getByText('560')).toBeInTheDocument();
    expect(screen.getByText('840')).toBeInTheDocument();
    expect(screen.getByText('280')).toBeInTheDocument();

    // Check CTA links
    const ctaLinks = screen.getAllByRole('link', { name: /comenzar 15 días gratis/i });
    expect(ctaLinks.length).toBe(3);
    expect(ctaLinks[0]).toHaveAttribute('href', '/staff/register?plan=basico');
    expect(ctaLinks[1]).toHaveAttribute('href', '/staff/register?plan=estandar');
    expect(ctaLinks[2]).toHaveAttribute('href', '/staff/register?plan=premium');
  });

  it('allows toggling between UYU and USD currency', async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValueOnce({
      prices: [
        {
          plan_name: 'estandar',
          price: 760,
          price_usd: 19,
          currency: 'UYU',
          promo_price: 560,
          promo_price_usd: 14,
          promo_months: 3,
        },
      ],
    });

    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('560')).toBeInTheDocument();
    });

    const usdBtn = screen.getByRole('button', { name: /usd/i });
    await user.click(usdBtn);

    // After clicking USD, promo USD price 14 should appear
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('renders fallback plans when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Estándar')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    // Fallback has 560 and 840 promo prices
    expect(screen.getByText('560')).toBeInTheDocument();
    expect(screen.getByText('840')).toBeInTheDocument();
  });
});
