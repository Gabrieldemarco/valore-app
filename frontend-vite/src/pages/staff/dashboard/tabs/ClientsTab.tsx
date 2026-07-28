import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';

export default function ClientsTab() {
  const { t } = useTranslation();
  const { clientsList, openClientHistory, loadClients } = useDashboard();
  const [search, setSearch] = useState('');

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.clientsTitle')}</h3>
      </div>
      <div className="dash-filters glass-panel" style={{ marginBottom: 20 }}>
        <div className="dash-filter-group" style={{ flex: 1 }}>
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
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableName')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTablePhone')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableEmail')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableAppointments')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableLastVisit')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {clientsList.map(c => (
                <tr key={c.client_phone}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{c.client_name}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{c.client_phone}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{c.client_email || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{c.total_appointments}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{new Date(c.last_appointment).toLocaleDateString('es-UY')}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
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
