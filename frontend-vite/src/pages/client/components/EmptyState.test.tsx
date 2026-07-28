import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the message', () => {
    render(<EmptyState message="No appointments found" />);
    expect(screen.getByText('No appointments found')).toBeInTheDocument();
  });

  it('renders with a different message', () => {
    render(<EmptyState message="Nothing to show" />);
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });
});
