import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';

export default function ClientsTab() {
  const { t, i18n } = useTranslation();
  const { clientsList, openClientHistory, loadClients } = useDashboard();
  const [search, setSearch] = useState('');

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.clientsTitle')}</h3>
      </div>
      <div className="dash-filters glass-panel mb-20">
        <div className="dash-filter-group flex-1">
          <label>{t('staffDashboard.clientsSearchLabel')}</label>
          <input type="text" className="glass-input" placeholder={t('staffDashboard.clientsSearchPlaceholder')} value={search}
            onChange={e => { setSearch(e.target.value); loadClients(e.target.value); }} />
        </div>
      </div>
      {clientsList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.clientsEmptyTitle')}</h3>
          <p>{search ? t('staffDashboard.clientsEmptyNoMatch') : t('staffDashboard.clientsEmptyNone')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-cell-left">{t('staffDashboard.clientsTableName')}</th>
                <th className="table-cell-left">{t('staffDashboard.clientsTablePhone')}</th>
                <th className="table-cell-left">{t('staffDashboard.clientsTableEmail')}</th>
                <th className="table-cell-center">{t('staffDashboard.clientsTableAppointments')}</th>
                <th className="table-cell-right">{t('staffDashboard.clientsTableLastVisit')}</th>
                <th className="table-cell-center">{t('staffDashboard.clientsTableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {clientsList.map(c => (
                <tr key={c.client_phone}>
                  <td className="p-12 font-600">{c.client_name}</td>
                  <td className="p-12 text-muted">{c.client_phone}</td>
                  <td className="p-12 text-muted">{c.client_email || '-'}</td>
                  <td className="p-12 text-center">{c.total_appointments}</td>
                  <td className="p-12 text-right text-muted">{new Date(c.last_appointment).toLocaleDateString(i18n.language)}</td>
                  <td className="p-12 text-center">
                    <button className="dash-btn dash-btn-success" onClick={() => openClientHistory(c)}>{t('staffDashboard.clientsHistoryButton')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
