import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';
import { useServiceCRUD } from './useServiceCRUD';

vi.mock('../../../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../../../../services/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('../dashboardContext', () => ({
  useDashboard: vi.fn(),
}));

const mockAddToast = vi.fn();
const mockLoadServices = vi.fn();
const validForm = { name: 'Corte', duration: '30', price: '500', category: '', category_id: '', description: '', image: '' };
const editingService = { id: 1, name: 'Corte', duration: 30, price: 500, active: true };

function Harness() {
  const { saveService, deleteService, toggleServiceActive } = useServiceCRUD();
  return (
    <div>
      <button onClick={() => saveService(validForm, null)}>create</button>
      <button onClick={() => saveService(validForm, editingService)}>update</button>
      <button onClick={() => deleteService(1, 'Corte')}>delete</button>
      <button onClick={() => toggleServiceActive(editingService)}>toggle</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  (useDashboard as Mock).mockReturnValue({ addToast: mockAddToast, loadServices: mockLoadServices });
});

describe('useServiceCRUD', () => {
  test('createService calls POST then refreshes', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/tenant/services', expect.objectContaining({ name: 'Corte', duration: 30, price: 500 }));
    });
    expect(mockLoadServices).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastServiceCreated', 'success');
  });

  test('updateService calls PUT then refreshes', async () => {
    const user = userEvent.setup();
    (api.put as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('update'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/tenant/services/1', expect.objectContaining({ name: 'Corte', duration: 30, price: 500 }));
    });
    expect(mockLoadServices).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastServiceUpdated', 'success');
  });

  test('deleteService calls DELETE then refreshes', async () => {
    const user = userEvent.setup();
    (api.delete as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('delete'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/tenant/services/1');
    });
    expect(mockLoadServices).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastServiceDeleted', 'success');
  });

  test('toggleServiceActive calls PUT to toggle active', async () => {
    const user = userEvent.setup();
    (api.put as Mock).mockResolvedValue({});
    render(<Harness />);
    await user.click(screen.getByText('toggle'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/tenant/services/1', { active: false });
    });
    expect(mockLoadServices).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastServiceDeactivated', 'success');
  });

  test('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockRejectedValue(new Error('API error'));
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('API error', 'error');
    });
  });
});
