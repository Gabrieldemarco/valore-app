import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import type { StaffMember } from '../dashboardContext';
import StaffModal from '../modals/StaffModal';

export default function StaffTab() {
  const { t } = useTranslation();
  const { staffList } = useDashboard();
  const { deleteStaffMember } = useDashboardCRUD();
  const [modal, setModal] = useState<{ open: boolean; editing: StaffMember | null }>({ open: false, editing: null });

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.staffTitle')}</h3>
        <button className="dash-btn dash-btn-success" onClick={() => setModal({ open: true, editing: null })}>{t('staffDashboard.staffNewButton')}</button>
      </div>
      {staffList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.staffEmptyTitle')}</h3>
          <p>{t('staffDashboard.staffEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-12 border-b">{t('staffDashboard.staffTableName')}</th>
                <th className="text-left p-12 border-b">{t('staffDashboard.staffTableEmail')}</th>
                <th className="text-left p-12 border-b">{t('staffDashboard.staffTableSpecialties')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.staffTableCommission')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.staffTableStatus')}</th>
                <th className="text-center p-12 border-b">{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id}>
                  <td className="p-12 font-600">{s.name}</td>
                  <td className="p-12 text-muted">{s.email || '-'}</td>
                  <td className="p-12 text-muted">{(s.specialties || []).join(', ') || '-'}</td>
                  <td className="p-12 text-center">
                    {s.commission_type === 'percentage' ? `${s.commission_value}%` : s.commission_type === 'fixed' ? `$${s.commission_value}` : '-'}
                  </td>
                  <td className="p-12 text-center">
                    <span className={`dash-appointment-status ${s.active !== false ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                      {s.active !== false ? t('staffDashboard.staffActive') : t('staffDashboard.staffInactive')}
                    </span>
                  </td>
                  <td className="p-12 text-center">
                    <button className="dash-btn dash-btn-success mr-8" onClick={() => setModal({ open: true, editing: s })}>{t('staffDashboard.staffEditButton')}</button>
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
