import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import CouponModal from '../modals/CouponModal';

export default function CouponsTab() {
  const { t } = useTranslation();
  const { couponsList } = useDashboard();
  const { deleteCoupon } = useDashboardCRUD();
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.couponsTitle')}</h3>
        <button className="dash-btn dash-btn-primary" onClick={() => setModal({ open: true, editing: null })}>{t('staffDashboard.couponsNewButton')}</button>
      </div>
      {couponsList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h4>{t('staffDashboard.couponsEmptyTitle')}</h4>
          <p>{t('staffDashboard.couponsEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableCode')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableDiscount')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableUses')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableExpires')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableStatus')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {couponsList.map(c => (
                <tr key={c.id}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                  <td style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>{c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span className={`dash-appointment-status ${c.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                      {c.active ? t('staffDashboard.couponsActive') : t('staffDashboard.couponsInactive')}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => setModal({ open: true, editing: c })}>{t('staffDashboard.staffEditButton')}</button>
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
