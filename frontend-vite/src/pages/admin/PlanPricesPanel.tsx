import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import type { PlanPrice } from './types';

interface Props {
  planPrices: PlanPrice[];
  setPlanPrices: React.Dispatch<React.SetStateAction<PlanPrice[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function PlanPricesPanel({ planPrices, setPlanPrices, showToast }: Props) {
  const { t } = useTranslation();

  const handleUpdate = async (plan: PlanPrice, field: string, value: string | number) => {
    try {
      const isNullableField = ['price_usd', 'promo_price', 'promo_price_usd'].includes(field);
      const body: Record<string, unknown> = {
        price: plan.price,
        price_usd: plan.price_usd,
        currency: plan.currency,
        promo_price: plan.promo_price,
        promo_price_usd: plan.promo_price_usd,
        promo_months: plan.promo_months,
      };
      if (isNullableField && value === '') {
        body[field] = null;
      } else {
        body[field] = value;
      }
      await api.put(`/api/super-admin/plan-prices/${plan.plan_name}`, body);
      setPlanPrices(prev => prev.map(p =>
        p.plan_name === plan.plan_name
          ? { ...p, [field]: value === '' ? null : value, updated_at: new Date().toISOString() }
          : p
      ));
      showToast(t('adminDashboard.toastPriceSaved'), 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('adminDashboard.error'), 'error');
    }
  };

  const getLabel = (planName: string) => {
    if (planName === 'free') return t('adminDashboard.planFree');
    if (planName === 'basico') return t('adminDashboard.planBasico');
    if (planName === 'estandar') return t('adminDashboard.planEstandar');
    if (planName === 'premium') return t('adminDashboard.planPremium');
    return planName;
  };

  return (
    <div className="admin-table-wrapper">
      <div className="admin-table-header">
        <h2>{t('adminDashboard.pricingTitle')}</h2>
      </div>

      <div className="admin-config-panel">
        <h3 className="admin-section-title">{t('adminDashboard.planPricesTitle')}</h3>

        {planPrices.length === 0 && (
          <p className="text-muted" style={{ padding: '16px 0' }}>{t('adminDashboard.noPlanPrices')}</p>
        )}

        {planPrices.map(plan => (
          <div
            key={plan.plan_name}
            className="admin-config-grid"
            style={{ marginBottom: plan.plan_name === 'premium' ? 0 : '24px' }}
          >
            <div className="admin-form-group">
              <label>{t('adminDashboard.planName')}</label>
              <input
                type="text"
                value={getLabel(plan.plan_name)}
                readOnly
                style={{ background: 'rgba(255,255,255,0.05)', cursor: 'default' }}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.priceLocal')}</label>
              <input
                type="number"
                step="0.01"
                value={plan.price}
                onChange={e => handleUpdate({ ...plan, price: e.target.value }, 'price', e.target.value)}
                disabled={plan.plan_name === 'free'}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.priceUSD')}</label>
              <input
                type="number"
                step="0.01"
                value={plan.price_usd || ''}
                onChange={e => handleUpdate({ ...plan, price_usd: e.target.value }, 'price_usd', e.target.value)}
                disabled={plan.plan_name === 'free'}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.currency')}</label>
              <input
                type="text"
                value={plan.currency}
                onChange={e => handleUpdate({ ...plan, currency: e.target.value }, 'currency', e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.promoPrice')}</label>
              <input
                type="number"
                step="0.01"
                value={plan.promo_price || ''}
                onChange={e => handleUpdate({ ...plan, promo_price: e.target.value }, 'promo_price', e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.promoPriceUSD')}</label>
              <input
                type="number"
                step="0.01"
                value={plan.promo_price_usd || ''}
                onChange={e => handleUpdate({ ...plan, promo_price_usd: e.target.value }, 'promo_price_usd', e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.promoMonths')}</label>
              <input
                type="number"
                min="0"
                value={plan.promo_months || 0}
                onChange={e => handleUpdate({ ...plan, promo_months: parseInt(e.target.value) || 0 }, 'promo_months', String(parseInt(e.target.value) || 0))}
              />
            </div>

            <div className="admin-form-group">
              <label>{t('adminDashboard.updatedAt')}</label>
              <input
                type="text"
                value={plan.updated_at}
                readOnly
                style={{ background: 'rgba(255,255,255,0.05)', cursor: 'default' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
