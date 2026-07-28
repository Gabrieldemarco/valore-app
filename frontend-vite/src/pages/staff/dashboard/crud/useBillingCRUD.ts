import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../api/client';
import { useDashboard } from '../dashboardContext';

export function useBillingCRUD() {
  const { t } = useTranslation();
  const { addToast } = useDashboard();

  const subscribeToPlan = useCallback(async (planName: string) => {
    try {
      const res = await api.post<{ init_point: string }>('/api/tenant/subscribe', { plan: planName });
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast(t('staffDashboard.toastSubscribeError'), 'error'); }
  }, [addToast, t]);

  const handlePayInvoice = useCallback(async (invoiceId: number) => {
    try {
      const res = await api.post<{ init_point: string }>(`/api/tenant/invoices/${invoiceId}/pay`);
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast(t('staffDashboard.toastPayError'), 'error'); }
  }, [addToast, t]);

  return { subscribeToPlan, handlePayInvoice };
}
