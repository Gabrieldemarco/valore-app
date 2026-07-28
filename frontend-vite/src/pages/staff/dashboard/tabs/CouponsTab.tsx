import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import CouponModal from '../modals/CouponModal';

export default function CouponsTab() {
  const { t } = useTranslation();
  const { couponsList } = useDashboard();
  const { deleteCoupon } = useDashboardCRUD();
  const [modal, setModal] = useState<{ open: boolean; editing: unknown | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.couponsTitle')}</h3>
        <button className="dash-btn dash-btn-primary" onClick={() => setModal({ open: true, editing: null })}>{t('staffDashboard.couponsNewButton')}</button>
      </div>
      {couponsList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h4>{t('staffDashboard.couponsEmptyTitle')}</h4>
          <p>{t('staffDashboard.couponsEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-12 border-b">{t('staffDashboard.couponsTableCode')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.couponsTableDiscount')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.couponsTableUses')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.couponsTableExpires')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.couponsTableStatus')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {couponsList.map(c => (
                <tr key={c.id}>
                  <td className="p-12 font-600">{c.code}</td>
                  <td className="p-12 text-center">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                  <td className="p-12 text-center text-muted">{c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="p-12 text-center text-muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '-'}</td>
                  <td className="p-12 text-center">
                    <span className={`dash-appointment-status ${c.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                      {c.active ? t('staffDashboard.couponsActive') : t('staffDashboard.couponsInactive')}
                    </span>
                  </td>
                  <td className="p-12 text-center">
                    <button className="dash-btn dash-btn-success mr-8" onClick={() => setModal({ open: true, editing: c })}>{t('staffDashboard.staffEditButton')}</button>
                    <button className="dash-btn dash-btn-danger" onClick={() => deleteCoupon(c.id, c.code)}>{t('staffDashboard.staffDeleteButton')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal.open && <CouponModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />}
    </div>
  );
}
