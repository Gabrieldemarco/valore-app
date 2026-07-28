import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../api/client';
import { useDashboard } from './dashboardContext';
import { useStaffCRUD } from './crud/useStaffCRUD';
import { useServiceCRUD } from './crud/useServiceCRUD';
import { useCategoryCRUD } from './crud/useCategoryCRUD';
import { useAppointmentCRUD } from './crud/useAppointmentCRUD';
import { useCouponCRUD } from './crud/useCouponCRUD';
import { useBillingCRUD } from './crud/useBillingCRUD';

export function useDashboardCRUD() {
  const { t } = useTranslation();
  const { addToast } = useDashboard();

  const staff = useStaffCRUD();
  const service = useServiceCRUD();
  const category = useCategoryCRUD();
  const appointment = useAppointmentCRUD();
  const coupon = useCouponCRUD();
  const billing = useBillingCRUD();

  const saveSettings = useCallback(async (settings: Record<string, unknown>, openingHours: Record<string, unknown>) => {
    try {
      await api.put('/api/tenant/settings', { ...settings, opening_hours: openingHours });
      addToast(t('staffDashboard.toastStatusUpdated'), 'success');
      return true;
    } catch {
      addToast(t('staffDashboard.toastSaveError'), 'error');
      return false;
    }
  }, [addToast, t]);

  return {
    ...staff,
    ...service,
    ...category,
    ...appointment,
    ...coupon,
    ...billing,
    saveSettings,
  };
}
