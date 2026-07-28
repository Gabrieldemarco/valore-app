import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';
import { useStaffCRUD } from './useStaffCRUD';

vi.mock('../../../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  clearApiCache: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fb?: Record<string, unknown>) => (fb?.password as string) || k }),
}));

vi.mock('../../../../services/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('../dashboardContext', () => ({
  useDashboard: vi.fn(),
}));

const mockAddToast = vi.fn();
const mockSetStaffList = vi.fn();
const validForm = { name: 'Pedro', email: 'pedro@test.com', specialties: '', photo_url: '', bio: '', indStart: '9', indEnd: '19', indWorkDays: [1, 2, 3, 4, 5], useIndividualHours: false, commission_type: '', commission_value: '' };
const editingStaff = { id: 1, name: 'Original' };

function Harness() {
  const { saveStaff, deleteStaffMember } = useStaffCRUD();
  return (
    <div>
      <button onClick={() => saveStaff(validForm, null)}>create</button>
      <button onClick={() => saveStaff(validForm, editingStaff)}>update</button>
      <button onClick={() => deleteStaffMember(1, 'Pedro')}>delete</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  (useDashboard as Mock).mockReturnValue({ addToast: mockAddToast, setStaffList: mockSetStaffList });
});

describe('useStaffCRUD', () => {
  test('createStaff calls POST then refreshes list', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockResolvedValue({ tempPassword: 'abc123' });
    (api.get as Mock).mockResolvedValue({ staff: [{ id: 1, name: 'Pedro' }] });
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/tenant/staff', expect.objectContaining({ name: 'Pedro', email: 'pedro@test.com' }));
    });
    expect(api.get).toHaveBeenCalledWith('/api/tenant/staff');
    expect(mockSetStaffList).toHaveBeenCalledWith([{ id: 1, name: 'Pedro' }]);
    expect(mockAddToast).toHaveBeenCalledWith('abc123', 'success');
  });

  test('updateStaff calls PUT then refreshes list', async () => {
    const user = userEvent.setup();
    (api.put as Mock).mockResolvedValue({});
    (api.get as Mock).mockResolvedValue({ staff: [{ id: 1, name: 'Pedro Updated' }] });
    render(<Harness />);
    await user.click(screen.getByText('update'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/tenant/staff/1', expect.objectContaining({ name: 'Pedro' }));
    });
    expect(api.get).toHaveBeenCalledWith('/api/tenant/staff');
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastStaffUpdated', 'success');
  });

  test('deleteStaffMember calls DELETE then refreshes list', async () => {
    const user = userEvent.setup();
    (api.delete as Mock).mockResolvedValue({});
    (api.get as Mock).mockResolvedValue({ staff: [] });
    render(<Harness />);
    await user.click(screen.getByText('delete'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/tenant/staff/1');
    });
    expect(api.get).toHaveBeenCalledWith('/api/tenant/staff');
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastStaffDeleted', 'success');
  });

  test('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockRejectedValue(new Error('Network error'));
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Network error', 'error');
    });
  });
});
