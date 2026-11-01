import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { getAppointmentStatusLabel } from '../../utils/appointmentStatus';

interface GlobalClient {
  client_key: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  client_timezone: string | null;
  total_appointments: number;
  salons_visited_count: number;
  salons_visited: string[] | null;
  services_requested: string[] | null;
  first_appointment: string;
  last_appointment: string;
}

interface ClientAppointment {
  id: number;
  appointment_date: string;
  client_timezone: string | null;
  business_name: string;
  service: string;
  staff_name: string | null;
  status: string;
  notes: string | null;
}

interface ClientPage {
  clients: GlobalClient[];
  total: number;
  totalPages: number;
}

interface AppointmentHistory {
  appointments: ClientAppointment[];
}

function formatLocalDate(value: string, timeZone: string | null, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export default function GlobalClientsPanel() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [clientPage, setClientPage] = useState<ClientPage>({ clients: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedClient, setSelectedClient] = useState<GlobalClient | null>(null);
  const [history, setHistory] = useState<ClientAppointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError('');
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search.trim()) params.set('q', search.trim());
      api.getFresh<ClientPage>(`/api/super-admin/clients?${params}`, 'superAdmin')
        .then(result => {
          if (active) setClientPage(result);
        })
        .catch((err: unknown) => {
          if (active) setLoadError(err instanceof Error ? err.message : t('adminDashboard.clientLoadError'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, search, t]);

  const openHistory = async (client: GlobalClient) => {
    setSelectedClient(client);
    setHistory([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const result = await api.getFresh<AppointmentHistory>(
        `/api/super-admin/clients/${encodeURIComponent(client.client_key)}/appointments`,
        'superAdmin',
      );
      setHistory(result.appointments);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : t('adminDashboard.clientHistoryLoadError'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setSelectedClient(null);
    setHistory([]);
    setHistoryError('');
  };

  const distinctNotes = [...new Set(history.map(appointment => appointment.notes?.trim()).filter((note): note is string => Boolean(note)))];

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <h2>{t('adminDashboard.clientsTitle')}</h2>
          <span className="panel-count">{t('adminDashboard.clientCount', { count: clientPage.total })}</span>
        </div>
        <div className="filters-bar" style={{ margin: 20 }}>
          <input
            type="search"
            value={search}
            placeholder={t('adminDashboard.clientSearchPlaceholder')}
            aria-label={t('adminDashboard.clientSearchPlaceholder')}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {loadError ? (
          <p role="alert" className="empty-row">{loadError}</p>
        ) : loading ? (
          <p className="empty-row">{t('adminDashboard.clientsLoading')}</p>
        ) : clientPage.clients.length === 0 ? (
          <p className="empty-row">{t('adminDashboard.clientsEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>{t('adminDashboard.clientName')}</th>
                  <th>{t('adminDashboard.clientPhone')}</th>
                  <th>{t('adminDashboard.clientEmail')}</th>
                  <th>{t('adminDashboard.clientSalons')}</th>
                  <th>{t('adminDashboard.clientAppointments')}</th>
                  <th>{t('adminDashboard.clientLastVisit')}</th>
                  <th>{t('adminDashboard.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {clientPage.clients.map(client => (
                  <tr key={client.client_key}>
                    <td><strong>{client.client_name}</strong></td>
                    <td>{client.client_phone}</td>
                    <td>{client.client_email || '-'}</td>
                    <td>{client.salons_visited_count}</td>
                    <td>{client.total_appointments}</td>
                    <td>{formatLocalDate(client.last_appointment, client.client_timezone, i18n.language)}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => void openHistory(client)}>{t('adminDashboard.clientHistoryButton')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {clientPage.totalPages > 1 && (
          <div className="filters-bar" style={{ justifyContent: 'center', margin: 20 }}>
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>
              {t('adminDashboard.previousPage')}
            </button>
            <span>{t('adminDashboard.pageOf', { page, total: clientPage.totalPages })}</span>
            <button className="btn btn-secondary" disabled={page >= clientPage.totalPages} onClick={() => setPage(current => current + 1)}>
              {t('adminDashboard.nextPage')}
            </button>
          </div>
        )}
      </section>

      {selectedClient && (
        <div className="modal-overlay open" onClick={closeHistory} role="presentation">
          <section
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-client-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="global-client-title">{selectedClient.client_name}</h2>
                <p>{selectedClient.client_phone} · {selectedClient.client_email || '-'}</p>
              </div>
              <button className="close-modal" onClick={closeHistory} aria-label={t('adminDashboard.closeClientHistory')}>×</button>
            </div>
            <div>
              <h3>{t('adminDashboard.clientInterests')}</h3>
              <p><strong>{t('adminDashboard.clientSalonsVisited')}:</strong> {(selectedClient.salons_visited || []).join(', ') || '-'}</p>
              <p><strong>{t('adminDashboard.clientServicesRequested')}:</strong> {(selectedClient.services_requested || []).join(', ') || '-'}</p>
              {selectedClient.client_timezone && <p><strong>{t('adminDashboard.clientTimezone')}:</strong> {selectedClient.client_timezone}</p>}
              {historyLoading ? (
                <p>{t('adminDashboard.clientsLoading')}</p>
              ) : historyError ? (
                <p role="alert">{historyError}</p>
              ) : (
                <>
                  <h3>{t('adminDashboard.clientHistoryTitle')}</h3>
                  {distinctNotes.length > 0 ? (
                    <div>
                      <strong>{t('adminDashboard.clientNotes')}</strong>
                      <ul>{distinctNotes.map(note => <li key={note}>{note}</li>)}</ul>
                    </div>
                  ) : (
                    <p>{t('adminDashboard.noClientPreferences')}</p>
                  )}
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('adminDashboard.clientDate')}</th>
                          <th>{t('adminDashboard.clientSalons')}</th>
                          <th>{t('adminDashboard.clientServicesRequested')}</th>
                          <th>{t('adminDashboard.clientProfessional')}</th>
                          <th>{t('adminDashboard.clientStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(appointment => (
                          <tr key={appointment.id}>
                            <td>
                              {formatLocalDate(appointment.appointment_date, appointment.client_timezone, i18n.language)}
                              {appointment.client_timezone && <small className="block">{appointment.client_timezone}</small>}
                            </td>
                            <td>{appointment.business_name}</td>
                            <td>{appointment.service}</td>
                            <td>{appointment.staff_name || '-'}</td>
                            <td>{getAppointmentStatusLabel(appointment.status, t)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
