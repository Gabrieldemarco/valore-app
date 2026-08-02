import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { total?: string }) => (params && params.total ? `${key}:${params.total}` : key),
  }),
}));

vi.mock('../PhoneInput', () => ({
  default: () => <input data-testid="pos-phone" />,
}));

import PosSection from './PosSection';

const product = {
  id: 1,
  name: 'Shampoo',
  price: '15.00', // pg devuelve NUMERIC como string
  cost: '8.00',
  stock: 10,
  min_stock: 2,
  category: 'Cuidado',
  sku: 'SH-1',
  image_url: '',
  active: true,
};

describe('PosSection', () => {
  it('adds a product to the cart and computes the total without crashing on string prices', () => {
    render(<PosSection products={[product]} addToast={vi.fn()} refreshProducts={vi.fn()} />);
    fireEvent.click(screen.getByText('Shampoo'));
    expect(screen.getByText('staffDashboard.posCheckout:15.00')).toBeInTheDocument();
    expect(screen.getAllByText('$15.00').length).toBeGreaterThanOrEqual(2);
  });

  it('updates quantity and total via the + button', () => {
    render(<PosSection products={[product]} addToast={vi.fn()} refreshProducts={vi.fn()} />);
    fireEvent.click(screen.getByText('Shampoo'));
    fireEvent.click(screen.getByText('+'));
    expect(screen.getByText('staffDashboard.posCheckout:30.00')).toBeInTheDocument();
  });
});
