import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from './dashboardContext';
import { useDashboardData } from './hooks/useDashboardData';
import DashboardProvider from './DashboardProvider';

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

vi.mock('../../../api/client', () => ({
  api: { get: vi.fn(() => new Promise(() => {})), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  clearApiCache: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => vi.fn() };
});

vi.mock('./hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

vi.mock('./hooks/useDashboardSync', () => ({
  useDashboardSync: vi.fn(),
}));

class MockBC {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  postMessage(_data: unknown) {}
  close() {}
}
vi.stubGlobal('BroadcastChannel', MockBC);

function TestConsumer() {
  const ctx = useDashboard();
  return (
    <div>
      <span data-testid="activeTab">{ctx.activeTab}</span>
      <span data-testid="loading">{ctx.loading ? 'loading' : 'loaded'}</span>
      <span data-testid="staffCount">{ctx.staffList.length}</span>
      <span data-testid="appointmentCount">{ctx.appointments.length}</span>
    </div>
  );
}

const mockLoadFunctions = {
  loadAppointments: vi.fn(),
  loadServices: vi.fn(),
  loadCategories: vi.fn(),
  loadClients: vi.fn(),
  loadProducts: vi.fn(),
  loadCalendarStatus: vi.fn(),
  loadInvoices: vi.fn(),
  loadAnalytics: vi.fn(),
};

function renderProvider() {
  return render(
    <MemoryRouter>
      <DashboardProvider>
        <TestConsumer />
      </DashboardProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (useAuth as Mock).mockReturnValue({ staffToken: 'test-token', staffName: 'Test', isAuthenticated: true, logout: vi.fn() });
  (useTranslation as Mock).mockReturnValue({ t: vi.fn((k: string) => k) });
  (useDashboardData as Mock).mockReturnValue(mockLoadFunctions);
});

describe('DashboardProvider', () => {
  test('provides context with default values', () => {
    renderProvider();
    expect(screen.getByTestId('activeTab')).toHaveTextContent('list');
    expect(screen.getByTestId('staffCount')).toHaveTextContent('0');
    expect(screen.getByTestId('appointmentCount')).toHaveTextContent('0');
  });

  test('children can consume context via useDashboard', () => {
    renderProvider();
    expect(() => screen.getByTestId('activeTab')).not.toThrow();
  });

  test('starts in loading state', () => {
    renderProvider();
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });
});
