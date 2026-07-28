import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';

export function useCouponCRUD() {
  const { t } = useTranslation();
  const { addToast, setCouponsList } = useDashboard();

  const loadCoupons = useCallback(async () => {
    try {
      const data = await api.get<{ coupons: any[] }>('/api/tenant/coupons');
      setCouponsList(data.coupons || []);
    } catch { addToast(t('staffDashboard.toastLoadCouponsError'), 'error'); }
  }, [addToast, t, setCouponsList]);

  const saveCoupon = useCallback(async (
    form: { code: string; discount_type: string; discount_value: string; min_appointment_amount: string; max_uses: string; expires_at: string },
    editing: any | null
  ) => {
    if (!form.code || !form.discount_value) {
      addToast(t('staffDashboard.toastCouponRequired'), 'error');
      return false;
    }
    try {
      const body: any = {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
      };
      if (form.min_appointment_amount) body.min_appointment_amount = parseFloat(form.min_appointment_amount);
      if (form.max_uses) body.max_uses = parseInt(form.max_uses, 10);
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
      if (editing) {
        await api.put(`/api/tenant/coupons/${editing.id}`, body);
        addToast(t('staffDashboard.toastCouponUpdated'), 'success');
      } else {
        await api.post('/api/tenant/coupons', body);
        addToast(t('staffDashboard.toastCouponCreated'), 'success');
      }
      clearApiCache();
      await loadCoupons();
      return true;
    } catch (e: any) {
      addToast(e?.message || t('staffDashboard.toastCouponSaveError'), 'error');
      return false;
    }
  }, [addToast, t, loadCoupons]);

  const deleteCoupon = useCallback(async (id: number, code: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteCoupon', { code }))) return false;
    try {
      await api.delete(`/api/tenant/coupons/${id}`);
      addToast(t('staffDashboard.toastCouponDeleted'), 'success');
      clearApiCache();
      await loadCoupons();
      return true;
    } catch (e: any) {
      addToast(e?.message || t('staffDashboard.toastCouponDeleteError'), 'error');
      return false;
    }
  }, [addToast, t, loadCoupons]);

  return { loadCoupons, saveCoupon, deleteCoupon };
}
