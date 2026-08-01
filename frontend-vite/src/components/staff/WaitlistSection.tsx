import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

interface WaitlistEntry {
  id: number;
  client_name?: string;
  name?: string;
  phone?: string;
  client_phone?: string;
  service_name?: string;
  service?: string;
  staff_name?: string;
  status: string;
  created_at?: string;
  date?: string;
}

interface Props {
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function WaitlistSection({ addToast }: Props) {
  const { t, i18n } = useTranslation();
  const [waitlistList, setWaitlistList] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const data = await api.get<{ entries: WaitlistEntry[] }>('/api/tenant/waitlist');
      setWaitlistList(data.entries || []);
    } catch { addToast(t('staffDashboard.toastLoadWaitlistError'), 'error'); }
    setWaitlistLoading(false);
  }, [addToast, t]);

  useEffect(() => { loadWaitlist(); }, [loadWaitlist]); // eslint-disable-line react-hooks/set-state-in-effect

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
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between mb-20">
        <h3 className="text-gradient m-0">{t('staffDashboard.waitlistTitle')}</h3>
        <button className="dash-btn dash-btn-secondary flex-center gap-6" onClick={loadWaitlist}>
          {waitlistLoading ? <span className="dash-loading-spinner w-14 h-14" /> : null}
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
        <div className="dash-table-responsive overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-cell-left">{t('staffDashboard.waitlistTableClient')}</th>
                <th className="table-cell-left">{t('staffDashboard.waitlistTablePhone')}</th>
                <th className="table-cell-center">{t('staffDashboard.waitlistTableService')}</th>
                <th className="table-cell-center">{t('staffDashboard.waitlistTableStaff')}</th>
                <th className="table-cell-center">{t('staffDashboard.waitlistTableStatus')}</th>
                <th className="table-cell-center">{t('staffDashboard.waitlistTableDate')}</th>
                <th className="table-cell-center">{t('staffDashboard.staffTableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {waitlistList.map(e => (
                <tr key={e.id}>
                  <td className="p-12 font-600">{e.client_name || e.name}</td>
                  <td className="p-12 text-muted">{e.phone || e.client_phone}</td>
                  <td className="p-12 text-center">{e.service_name || e.service || '-'}</td>
                  <td className="p-12 text-center">{e.staff_name || '-'}</td>
                  <td className="p-12 text-center">
                    <span className={`dash-appointment-status ${e.status === 'waiting' ? 'dash-status-confirmed' : e.status === 'notified' ? 'dash-status-pending' : e.status === 'converted' ? 'dash-status-completed' : 'dash-status-cancelled'}`}>
                      {e.status === 'waiting' ? t('staffDashboard.waitlistStatusWaiting') : e.status === 'notified' ? t('staffDashboard.waitlistStatusNotified') : e.status === 'converted' ? t('staffDashboard.waitlistStatusConverted') : t('staffDashboard.waitlistStatusExpired')}
                    </span>
                  </td>
                  <td className="p-12 text-center text-muted">{new Date(e.created_at || e.date || '').toLocaleDateString(i18n.language)}</td>
                  <td className="p-12 text-center">
                    {e.status === 'waiting' && (
                      <button className="dash-btn dash-btn-success mr-8" onClick={() => notifyWaitlistEntry(e.id)}>
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
