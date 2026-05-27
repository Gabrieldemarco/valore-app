import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Bomb() {
  throw new Error('💥');
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><div>Hello</div></ErrorBoundary>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('catches error and shows fallback UI', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText('Volver al inicio')).toBeInTheDocument();
    spy.mockRestore();
  });
});
