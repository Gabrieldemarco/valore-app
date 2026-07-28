import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';
import { useCouponCRUD } from './useCouponCRUD';

vi.mock('../../../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  clearApiCache: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../dashboardContext', () => ({
  useDashboard: vi.fn(),
}));

const mockAddToast = vi.fn();
const mockSetCouponsList = vi.fn();
const couponForm = { code: 'DESC10', discount_type: 'percentage', discount_value: '10', min_appointment_amount: '', max_uses: '', expires_at: '' };
const editingCoupon = { id: 1, code: 'DESC10' };

function Harness() {
  const { loadCoupons, saveCoupon, deleteCoupon } = useCouponCRUD();
  return (
    <div>
      <button onClick={loadCoupons}>load</button>
      <button onClick={() => saveCoupon(couponForm, null)}>create</button>
      <button onClick={() => saveCoupon(couponForm, editingCoupon)}>update</button>
      <button onClick={() => deleteCoupon(1, 'DESC10')}>delete</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  (useDashboard as Mock).mockReturnValue({ addToast: mockAddToast, setCouponsList: mockSetCouponsList });
});

describe('useCouponCRUD', () => {
  test('loadCoupons fetches and sets coupon list', async () => {
    const user = userEvent.setup();
    (api.get as Mock).mockResolvedValue({ coupons: [{ id: 1, code: 'DESC10' }] });
    render(<Harness />);
    await user.click(screen.getByText('load'));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/tenant/coupons');
    });
    expect(mockSetCouponsList).toHaveBeenCalledWith([{ id: 1, code: 'DESC10' }]);
  });

  test('createCoupon calls POST then reloads list', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockResolvedValue({});
    (api.get as Mock).mockResolvedValue({ coupons: [] });
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/tenant/coupons', expect.objectContaining({ code: 'DESC10', discount_type: 'percentage', discount_value: 10 }));
    });
    expect(api.get).toHaveBeenCalledWith('/api/tenant/coupons');
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastCouponCreated', 'success');
  });

  test('updateCoupon calls PUT then reloads list', async () => {
    const user = userEvent.setup();
    (api.put as Mock).mockResolvedValue({});
    (api.get as Mock).mockResolvedValue({ coupons: [] });
    render(<Harness />);
    await user.click(screen.getByText('update'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/tenant/coupons/1', expect.objectContaining({ code: 'DESC10', discount_type: 'percentage', discount_value: 10 }));
    });
    expect(api.get).toHaveBeenCalledWith('/api/tenant/coupons');
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastCouponUpdated', 'success');
  });

  test('deleteCoupon calls DELETE then reloads list', async () => {
    const user = userEvent.setup();
    (api.delete as Mock).mockResolvedValue({});
    (api.get as Mock).mockResolvedValue({ coupons: [] });
    render(<Harness />);
    await user.click(screen.getByText('delete'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/tenant/coupons/1');
    });
    expect(api.get).toHaveBeenCalledWith('/api/tenant/coupons');
    expect(mockAddToast).toHaveBeenCalledWith('staffDashboard.toastCouponDeleted', 'success');
  });

  test('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    (api.post as Mock).mockRejectedValue(new Error('Coupon error'));
    render(<Harness />);
    await user.click(screen.getByText('create'));
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Coupon error', 'error');
    });
  });
});
