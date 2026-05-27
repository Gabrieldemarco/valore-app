import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

describe('NotFound', () => {
  it('renders 404 message and links', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument();
    expect(screen.getByText('Volver al inicio')).toBeInTheDocument();
    expect(screen.getByText('Acceso Staff')).toBeInTheDocument();
  });

  it('has correct links', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText('Volver al inicio').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Acceso Staff').closest('a')).toHaveAttribute('href', '/staff/login');
  });
});
