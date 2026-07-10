import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

interface Props {
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function WaitlistSection({ addToast }: Props) {
  const { t } = useTranslation();
  const [waitlistList, setWaitlistList] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const data = await api.get<{ entries: any[] }>('/api/tenant/waitlist');
      setWaitlistList(data.entries || []);
    } catch { addToast(t('staffDashboard.toastLoadWaitlistError'), 'error'); }
    setWaitlistLoading(false);
  }, [addToast, t]);

  useEffect(() => { loadWaitlist(); }, [loadWaitlist]);

  const notifyWaitlistEntry = useCallback(async (id: number) => {
    try {
      await api.put(`/api/tenant/waitlist/${id}/notify`);
      loadWaitlist();
      addToast(t('staffDashboard.toastWaitlistNotified'), 'success');
    } catch { addToast(t('staffDashboard.toastError'), 'error'); }
  }, [loadWaitlist, addToast, t]);

  const deleteWaitlistEntry = useCallback(async (id: number) => {
    try {
      await api.delete(`/api/tenant/waitlist/${id}`);
      loadWaitlist();
      addToast(t('staffDashboard.toastWaitlistDeleted'), 'success');
    } catch { addToast(t('staffDashboard.toastError'), 'error'); }
  }, [loadWaitlist, addToast, t]);

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.waitlistTitle')}</h3>
        <button className="dash-btn dash-btn-secondary" onClick={loadWaitlist} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {waitlistLoading ? <span className="dash-loading-spinner" style={{ width: 14, height: 14 }} /> : null}
          {t('staffDashboard.waitlistRefresh')}
        </button>
      </div>
      {waitlistLoading ? (
        <div className="dash-loading"><div className="dash-loading-spinner"></div></div>
      ) : waitlistList.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h4>{t('staffDashboard.waitlistEmptyTitle')}</h4>
          <p>{t('staffDashboard.waitlistEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableClient')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTablePhone')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableService')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableStaff')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableStatus')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableDate')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {waitlistList.map(e => (
                <tr key={e.id}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{e.client_name || e.name}</td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{e.phone || e.client_phone}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{e.service_name || e.service || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>{e.staff_name || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span className={`dash-appointment-status ${e.status === 'waiting' ? 'dash-status-confirmed' : e.status === 'notified' ? 'dash-status-pending' : e.status === 'converted' ? 'dash-status-completed' : 'dash-status-cancelled'}`}>
                      {e.status === 'waiting' ? t('staffDashboard.waitlistStatusWaiting') : e.status === 'notified' ? t('staffDashboard.waitlistStatusNotified') : e.status === 'converted' ? t('staffDashboard.waitlistStatusConverted') : t('staffDashboard.waitlistStatusExpired')}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>{new Date(e.created_at || e.date).toLocaleDateString('es-UY')}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {e.status === 'waiting' && (
                      <button className="dash-btn dash-btn-success" onClick={() => notifyWaitlistEntry(e.id)} style={{ marginRight: 4 }}>
                        {t('staffDashboard.waitlistNotify')}
                      </button>
                    )}
                    <button className="dash-btn dash-btn-danger" onClick={() => deleteWaitlistEntry(e.id)}>
                      {t('staffDashboard.waitlistDelete')}
                    </button>
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
