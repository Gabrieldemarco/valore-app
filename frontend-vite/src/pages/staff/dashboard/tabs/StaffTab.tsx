import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import StaffModal from '../modals/StaffModal';

export default function StaffTab() {
  const { t } = useTranslation();
  const { staffList } = useDashboard();
  const { deleteStaffMember } = useDashboardCRUD();
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.staffTitle')}</h3>
        <button className="dash-btn dash-btn-success" onClick={() => setModal({ open: true, editing: null })}>{t('staffDashboard.staffNewButton')}</button>
      </div>
      {staffList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.staffEmptyTitle')}</h3>
          <p>{t('staffDashboard.staffEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableName')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableEmail')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableSpecialties')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableCommission')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableStatus')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{s.email || '-'}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{(s.specialties || []).join(', ') || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {s.commission_type === 'percentage' ? `${s.commission_value}%` : s.commission_type === 'fixed' ? `$${s.commission_value}` : '-'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span className={`dash-appointment-status ${s.active !== false ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                      {s.active !== false ? t('staffDashboard.staffActive') : t('staffDashboard.staffInactive')}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => setModal({ open: true, editing: s })}>{t('staffDashboard.staffEditButton')}</button>
                    <button className="dash-btn dash-btn-danger" onClick={() => deleteStaffMember(s.id, s.name)}>{t('staffDashboard.staffDeleteButton')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal.open && <StaffModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />}
    </div>
  );
}
