import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

beforeEach(() => {
  localStorage.clear();
});

function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{auth.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="staffToken">{auth.staffToken || 'none'}</span>
      <span data-testid="staffName">{auth.staffName || 'none'}</span>
      <button onClick={() => auth.login('staff-token', 'staff', 'John')}>Login Staff</button>
      <button onClick={() => auth.login('admin-token', 'superAdmin')}>Login Admin</button>
      <button onClick={auth.logout}>Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(<AuthProvider><TestComponent /></AuthProvider>);
}

describe('AuthContext', () => {
  it('starts unauthenticated', () => {
    renderWithAuth();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('staffToken')).toHaveTextContent('none');
    expect(screen.getByTestId('staffName')).toHaveTextContent('none');
  });

  it('login as staff sets token and name', () => {
    renderWithAuth();
    fireEvent.click(screen.getByText('Login Staff'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('staffToken')).toHaveTextContent('staff-token');
    expect(screen.getByTestId('staffName')).toHaveTextContent('John');
    expect(localStorage.getItem('staffToken')).toBe('staff-token');
    expect(localStorage.getItem('staffName')).toBe('John');
  });

  it('login as superAdmin sets admin token', () => {
    renderWithAuth();
    fireEvent.click(screen.getByText('Login Admin'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('staffToken')).toHaveTextContent('none');
    expect(localStorage.getItem('superAdminToken')).toBe('admin-token');
  });

  it('logout clears everything', () => {
    renderWithAuth();
    fireEvent.click(screen.getByText('Login Staff'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    fireEvent.click(screen.getByText('Logout'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('staffToken')).toHaveTextContent('none');
    expect(screen.getByTestId('staffName')).toHaveTextContent('none');
    expect(localStorage.getItem('staffToken')).toBeNull();
  });

  it('useAuth throws without provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
  });

  it('restores token from localStorage on mount', () => {
    localStorage.setItem('staffToken', 'saved-token');
    localStorage.setItem('staffName', 'Saved Name');
    renderWithAuth();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('staffToken')).toHaveTextContent('saved-token');
    expect(screen.getByTestId('staffName')).toHaveTextContent('Saved Name');
  });
});
