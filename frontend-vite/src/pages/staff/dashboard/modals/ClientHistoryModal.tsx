import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';

export default function ClientHistoryModal() {
  const { t, i18n } = useTranslation();
  const { selectedClient, setSelectedClient, clientHistory, clientHistoryLoading } = useDashboard();

  if (!selectedClient) return null;

  return (
    <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => { setSelectedClient(null); }}>
      <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
        <div className="dash-modal-header">
          <h3 className="text-gradient">{t('staffDashboard.clientHistoryTitle', { name: selectedClient.client_name })}</h3>
          <button onClick={() => setSelectedClient(null)} className="dash-close-btn">✕</button>
        </div>
        <div className="dash-modal-body">
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div><strong>{t('staffDashboard.clientHistoryPhone')}</strong> {selectedClient.client_phone}</div>
            <div><strong>{t('staffDashboard.clientHistoryEmail')}</strong> {selectedClient.client_email || '-'}</div>
            <div><strong>{t('staffDashboard.clientHistoryTotal')}</strong> {selectedClient.total_appointments}</div>
          </div>
          {clientHistoryLoading ? (
            <div className="dash-loading"><div className="dash-loading-spinner"></div>{t('staffDashboard.clientHistoryLoading')}</div>
          ) : clientHistory.length === 0 ? (
            <p>{t('staffDashboard.clientHistoryEmpty')}</p>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryDate')}</th>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryService')}</th>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryStaff')}</th>
                    <th style={{ textAlign: 'center', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryStatus')}</th>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryNotes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clientHistory.map(a => (
                    <tr key={a.id}>
                      <td style={{ padding: 10 }}>{new Date(a.appointment_date || a.date).toLocaleDateString(i18n.language)} {a.time}</td>
                      <td style={{ padding: 10 }}>{a.service_name || a.service}</td>
                      <td style={{ padding: 10 }}>{a.staff_name || '-'}</td>
                      <td style={{ padding: 10, textAlign: 'center' }}>{a.status}</td>
                      <td style={{ padding: 10, color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.internal_notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
