import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import type { CouponForm } from '../crud/types';

export default function CouponModal({ editing, onClose }: { editing: Record<string, unknown> | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { saveCoupon } = useDashboardCRUD();
  const [form, setForm] = useState<CouponForm>({
    code: (editing?.code as string | undefined) || '',
    discount_type: (editing?.discount_type as string | undefined) || 'percentage',
    discount_value: editing?.discount_value ? String(editing.discount_value) : '',
    min_appointment_amount: editing?.min_appointment_amount ? String(editing.min_appointment_amount) : '',
    max_uses: editing?.max_uses ? String(editing.max_uses) : '',
    expires_at: (editing?.expires_at as string | undefined)?.slice(0, 16) || '',
  });

  const handleSave = async () => {
    const ok = await saveCoupon(form, editing);
    if (ok) onClose();
  };

  return (
    <div className="dash-modal-overlay flex" onClick={onClose}>
      <div className="dash-modal-content glass-panel max-w-500" onClick={e => e.stopPropagation()}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{editing ? t('staffDashboard.couponModalEditTitle') : t('staffDashboard.couponModalNewTitle')}</h3>
          <button onClick={onClose} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div className="dash-form-group">
            <label>{t('staffDashboard.couponModalCodeLabel')}</label>
            <input type="text" className="glass-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder={t('staffDashboard.couponModalCodePlaceholder')} disabled={!!editing} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.couponModalTypeLabel')}</label>
            <select className="glass-input" value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}>
              <option value="percentage">{t('staffDashboard.commissionPercentage')}</option>
              <option value="fixed">{t('staffDashboard.commissionFixed')}</option>
            </select>
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.couponModalValueLabel')}</label>
            <input type="number" className="glass-input" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} min="0" step={form.discount_type === 'percentage' ? '1' : '0.01'} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.couponModalMinAmount')}</label>
            <input type="number" className="glass-input" value={form.min_appointment_amount} onChange={e => setForm(p => ({ ...p, min_appointment_amount: e.target.value }))} min="0" step="0.01" placeholder="0" />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.couponModalMaxUses')}</label>
            <input type="number" className="glass-input" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} min="1" placeholder={t('staffDashboard.couponModalUnlimited')} />
          </div>
          <div className="dash-form-group">
            <label>{t('staffDashboard.couponModalExpires')}</label>
            <input type="datetime-local" className="glass-input" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="dash-btn dash-btn-danger" onClick={onClose}>{t('staffDashboard.couponModalCancel')}</button>
            <button className="dash-btn dash-btn-success" onClick={handleSave}>{editing ? t('staffDashboard.couponModalSave') : t('staffDashboard.couponModalCreate')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
