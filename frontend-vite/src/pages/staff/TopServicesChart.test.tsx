import { render } from '@testing-library/react';
import { describe, expect } from 'vitest';
import TopServicesChart from './TopServicesChart';

describe('TopServicesChart', () => {
  const data = [
    { service: 'Corte', count: 20, avg_price: 500 },
    { service: 'Tintura', count: 10, avg_price: 1200 },
  ];

  it('renders without crashing', () => {
    const { container } = render(<TopServicesChart data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    const { container } = render(<TopServicesChart data={[]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
