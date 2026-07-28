import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TreatmentCategories from './TreatmentCategories';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const categories = [
  { key: 'corte', label: 'Corte', image: '/img/corte.jpg' },
  { key: 'tintura', label: 'Tintura', image: '/img/tintura.jpg' },
  { key: 'peinado', label: 'Peinado', image: '/img/peinado.jpg' },
];

describe('TreatmentCategories', () => {
  it('renders all category images', () => {
    render(<TreatmentCategories categories={categories} activeCategory="corte" onCategoryClick={vi.fn()} />);
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute('alt', 'Corte');
    expect(imgs[1]).toHaveAttribute('alt', 'Tintura');
  });

  it('highlights active category', () => {
    const { container } = render(<TreatmentCategories categories={categories} activeCategory="tintura" onCategoryClick={vi.fn()} />);
    const cards = container.querySelectorAll('.service-card');
    expect(cards[1].classList.contains('active')).toBe(true);
    expect(cards[0].classList.contains('active')).toBe(false);
  });

  it('calls onCategoryClick when clicking a category', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TreatmentCategories categories={categories} activeCategory="corte" onCategoryClick={onClick} />);
    await user.click(screen.getByAltText('Tintura'));
    expect(onClick).toHaveBeenCalledWith('tintura');
  });
});
