import { render } from '@testing-library/react';
import { describe, expect } from 'vitest';
import RevenueChart from './RevenueChart';

describe('RevenueChart', () => {
  const data = [
    { month: '2026-01', appointments: 10, revenue: 5000 },
    { month: '2026-02', appointments: 12, revenue: 6000 },
  ];

  it('renders without crashing', () => {
    const { container } = render(<RevenueChart data={data} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with empty data', () => {
    const { container } = render(<RevenueChart data={[]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
