import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import PhoneInput from '../../components/PhoneInput';
import { logger } from '../../services/logger';
import OnboardingTour from '../../components/OnboardingTour';
import type { TourStep } from '../../components/OnboardingTour';
import '../../styles/dashboard.css';

interface Appointment {
  id: number;
  client_name: string;
  service: string;
  service_name?: string;
  service_price?: number;
  staff_name?: string;
  staff_id?: number;
  date: string;
  time: string;
  appointment_date: string;
  status: string;
  client_phone?: string;
  phone?: string;
  email?: string;
  notes?: string;
  internal_notes?: string;
  discount_amount?: number;
  coupon_code?: string;
  tenant_slug?: string;
  client_token?: string;
}

interface AgendaEvent {
  id: number;
  titulo: string;
  fecha: string;
  descripcion?: string;
}

interface Tenant {
  id: number;
  slug: string;
  business_name: string;
  brand_logo_url: string | null;
  business_address: string | null;
  landing_hero_image: string | null;
  category: string | null;
}

export default function ClientDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clientToken, clientName, login, logout } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agendaForm, setAgendaForm] = useState({ titulo: '', fecha: '', descripcion: '' });
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaEvent | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      login(token, 'client', params.get('name') || '');
      if (params.get('name')) localStorage.setItem('clientDisplayName', params.get('name')!);
      window.history.replaceState(null, '', '/client/dashboard');
    } else if (!clientToken) {
      navigate('/client/login');
    }
  }, []);

  useEffect(() => {
    if (!clientToken) return;
    loadData();
    loadTenants();
  }, [clientToken]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, apptsRes, agendaRes] = await Promise.allSettled([
        api.get<{ user: { name: string; phone: string; email: string } }>('/api/client/me', 'client'),
        api.get<{ appointments: Appointment[] }>('/api/tenant/client-appointments', 'client'),
        api.get<AgendaEvent[]>('/api/agenda', 'client'),
      ]);
      if (profileRes.status === 'fulfilled') {
        setProfileName(profileRes.value.user?.name || '');
        setProfilePhone(profileRes.value.user?.phone || '');
        if (profileRes.value.user?.email) localStorage.setItem('clientEmail', profileRes.value.user.email);
      }
      if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.appointments || []);
      if (agendaRes.status === 'fulfilled') setAgendaEvents(agendaRes.value || []);
    } catch (err) { logger.error('Error loading client data:', err); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    setProfileMsg(''); setProfileError('');
    try {
      const res = await api.put<{ user: { name: string; phone: string } }>('/api/client/me', { name: profileName, phone: profilePhone }, 'client');
      if (res.user?.name) {
        localStorage.setItem('clientDisplayName', res.user.name);
        localStorage.setItem('clientName', res.user.name);
      }
      if (res.user?.phone) localStorage.setItem('clientPhone', res.user.phone);
      setProfileMsg(t('clientDashboard.profileUpdated'));
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileError(err?.message || t('clientDashboard.profileError'));
    }
  };

  const loadTenants = async () => {
    setTenantsLoading(true);
    try {
      const data = await api.get<{ tenants: Tenant[] }>('/api/tenants');
      setTenants(data.tenants || []);
    } catch (err) { logger.error('Error loading tenants:', err); }
    finally { setTenantsLoading(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const goToTenant = (slug: string) => {
    navigate(`/p/${slug}`);
  };

  const saveAgendaEvent = async () => {
    if (!agendaForm.titulo || !agendaForm.fecha) return;
    try {
      if (editingAgenda) {
        await api.put(`/api/agenda/${editingAgenda.id}`, agendaForm, 'client');
      } else {
        await api.post('/api/agenda', agendaForm, 'client');
      }
      setAgendaForm({ titulo: '', fecha: '', descripcion: '' });
      setShowAgendaForm(false);
      setEditingAgenda(null);
      clearApiCache();
      const data = await api.get<AgendaEvent[]>('/api/agenda', 'client');
      setAgendaEvents(data || []);
    } catch (err) { logger.error(err); }
  };

  const deleteAgendaEvent = async (id: number) => {
    if (!confirm(t('clientDashboard.confirmDeleteEvent'))) return;
    try {
      await api.delete(`/api/agenda/${id}`, 'client');
      clearApiCache();
      const data = await api.get<AgendaEvent[]>('/api/agenda', 'client');
      setAgendaEvents(data || []);
    } catch (err) { logger.error(err); }
  };

  const editAgendaEvent = (ev: AgendaEvent) => {
    setAgendaForm({ titulo: ev.titulo, fecha: ev.fecha.slice(0, 16), descripcion: ev.descripcion || '' });
    setEditingAgenda(ev);
    setShowAgendaForm(true);
  };

  const clientTourSteps: TourStep[] = [
    { target: '', title: t('clientDashboard.tourWelcomeTitle'), content: t('clientDashboard.tourWelcomeContent') },
    { target: '.glass-panel:nth-child(2)', title: t('clientDashboard.tourUpcomingTitle'), content: t('clientDashboard.tourUpcomingContent'), position: 'bottom' },
    { target: '.glass-panel:nth-child(3)', title: t('clientDashboard.tourProfileTitle'), content: t('clientDashboard.tourProfileContent'), position: 'bottom' },
    { target: '.glass-panel:nth-child(4)', title: t('clientDashboard.tourExploreTitle'), content: t('clientDashboard.tourExploreContent'), position: 'bottom' },
    { target: '.glass-panel:nth-child(5)', title: t('clientDashboard.tourHistoryTitle'), content: t('clientDashboard.tourHistoryContent'), position: 'bottom' },
    { target: '.glass-panel:nth-child(6)', title: t('clientDashboard.tourAgendaTitle'), content: t('clientDashboard.tourAgendaContent'), position: 'bottom' },
  ];

  const upcomingAppts = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
  const pastAppts = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show');

  if (loading) {
    return (
      <div className="dash-container text-center" style={{ padding: 40 }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p className="text-muted mt-12">{t('clientDashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="dash-container p-24">
      <div className="flex-between mb-24">
        <h2 className="text-gradient m-0">{t('clientDashboard.welcome', { name: clientName })}</h2>
        <div className="flex-gap-8">
          <button className="dash-btn dash-btn-danger" onClick={handleLogout}>{t('clientDashboard.logout')}</button>
        </div>
      </div>

      <OnboardingTour tourId="client-dashboard" steps={clientTourSteps} enabled={!!clientToken} onComplete={() => {}} />

      <div className="glass-panel card-padded">
        <h3 className="m-0 mb-16">{t('clientDashboard.upcomingTitle')}</h3>
        {upcomingAppts.length === 0 ? (
          <p className="text-muted">{t('clientDashboard.noUpcoming')}</p>
        ) : (
          <div className="dash-table-responsive table-wrapper">
            <table className="table-full">
              <thead>
                <tr>
                  <th className="table-cell-left">{t('clientDashboard.tableService')}</th>
                  <th className="table-cell-left">{t('clientDashboard.tableDate')}</th>
                  <th className="table-cell-left">{t('clientDashboard.tableTime')}</th>
                  <th className="table-cell-center">{t('clientDashboard.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppts.map(a => (
                  <tr key={a.id}>
                    <td className="table-cell-label">{a.service}</td>
                    <td className="p-12">{new Date(a.appointment_date).toLocaleDateString()}</td>
                    <td className="p-12">{new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="table-cell-pad-center">
                      <span className={`dash-appointment-status ${a.status === 'confirmed' ? 'dash-status-confirmed' : 'dash-status-pending'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel card-padded">
        <h3 className="m-0 mb-16">{t('clientDashboard.profileTitle')}</h3>
        {profileMsg && <div className="auth-success mb-12">{profileMsg}</div>}
        {profileError && <div className="auth-error mb-12">{profileError}</div>}
        <div className="flex flex-gap-16 flex-wrap">
          <div style={{ flex: '1 1 200px' }}>
            <label className="block text-xs-secondary mb-4">{t('clientDashboard.profileNameLabel')}</label>
            <input type="text" className="glass-input w-full" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder={t('clientDashboard.profileNamePlaceholder')} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="block text-xs-secondary mb-4">{t('clientDashboard.profilePhoneLabel')}</label>
            <PhoneInput value={profilePhone} onChange={setProfilePhone} placeholder="099 123 456" className="glass-input w-full" />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveProfile}>{t('clientDashboard.profileSaveButton')}</button>
        </div>
      </div>

      <div className="glass-panel card-padded">
        <h3 className="m-0 mb-16">{t('clientDashboard.exploreTitle')}</h3>
        {tenantsLoading ? (
          <p className="text-muted">{t('common.loading')}</p>
        ) : tenants.length === 0 ? (
          <p className="text-muted">{t('clientDashboard.exploreEmpty')}</p>
        ) : (
          <div className="grid-auto-fill">
            {tenants.map(tenant => (
              <div key={tenant.id} onClick={() => goToTenant(tenant.slug)} className="card-border"
                   onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                   onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)')}>
                <div className="font-600 mb-4" style={{ color: 'var(--border-color)' }}>{tenant.business_name}</div>
                {tenant.business_address && <div className="text-xs-secondary">{tenant.business_address}</div>}
                <div className="text-secondary mt-8" style={{ fontSize: 11 }}>{t('clientDashboard.exploreBookButton')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel card-padded">
        <h3 className="m-0 mb-16">{t('clientDashboard.historyTitle')}</h3>
        {pastAppts.length === 0 ? (
          <p className="text-muted">{t('clientDashboard.noHistory')}</p>
        ) : (
          <div className="dash-table-responsive table-wrapper">
            <table className="table-full">
              <thead>
                <tr>
                  <th className="table-cell-left">{t('clientDashboard.tableService')}</th>
                  <th className="table-cell-left">{t('clientDashboard.tableDate')}</th>
                  <th className="table-cell-left">{t('clientDashboard.tablePrice')}</th>
                  <th className="table-cell-center">{t('clientDashboard.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {pastAppts.map(a => (
                  <tr key={a.id}>
                    <td className="table-cell-label">{a.service}</td>
                    <td className="p-12">{new Date(a.appointment_date).toLocaleDateString()}</td>
                    <td className="p-12">${a.service_price || 0}</td>
                    <td className="table-cell-pad-center">
                      <span className="dash-appointment-status dash-status-cancelled">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel p-24">
        <div className="flex-between mb-16">
          <h3 className="m-0">{t('clientDashboard.agendaTitle')}</h3>
          <button className="dash-btn dash-btn-primary" onClick={() => { setEditingAgenda(null); setAgendaForm({ titulo: '', fecha: '', descripcion: '' }); setShowAgendaForm(true); }}>
            {t('clientDashboard.agendaNewButton')}
          </button>
        </div>
        {showAgendaForm && (
          <div className="card-base mb-16">
            <div className="dash-form-group">
              <label>{t('clientDashboard.agendaTitleLabel')}</label>
              <input type="text" className="glass-input" value={agendaForm.titulo} onChange={e => setAgendaForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="dash-form-group">
              <label>{t('clientDashboard.agendaDateLabel')}</label>
              <input type="datetime-local" className="glass-input" value={agendaForm.fecha} onChange={e => setAgendaForm(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div className="dash-form-group">
              <label>{t('clientDashboard.agendaDescLabel')}</label>
              <textarea className="glass-input" value={agendaForm.descripcion} onChange={e => setAgendaForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} />
            </div>
            <div className="flex-gap-8">
              <button className="dash-btn dash-btn-success" onClick={saveAgendaEvent}>
                {editingAgenda ? t('clientDashboard.agendaSaveButton') : t('clientDashboard.agendaCreateButton')}
              </button>
              <button className="dash-btn dash-btn-danger" onClick={() => { setShowAgendaForm(false); setEditingAgenda(null); }}>
                {t('clientDashboard.agendaCancelButton')}
              </button>
            </div>
          </div>
        )}
        {agendaEvents.length === 0 ? (
          <p className="text-muted">{t('clientDashboard.agendaEmpty')}</p>
        ) : (
          <div className="dash-table-responsive table-wrapper">
            <table className="table-full">
              <thead>
                <tr>
                  <th className="table-cell-left">{t('clientDashboard.agendaTableTitle')}</th>
                  <th className="table-cell-left">{t('clientDashboard.agendaTableDate')}</th>
                  <th className="table-cell-center">{t('clientDashboard.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {agendaEvents.map(ev => (
                  <tr key={ev.id}>
                    <td className="table-cell-label">{ev.titulo}</td>
                    <td className="p-12">{new Date(ev.fecha).toLocaleString()}</td>
                    <td className="table-cell-pad-center">
                      <button className="dash-btn dash-btn-success mr-8" onClick={() => editAgendaEvent(ev)}>{t('clientDashboard.editButton')}</button>
                      <button className="dash-btn dash-btn-danger" onClick={() => deleteAgendaEvent(ev.id)}>{t('clientDashboard.deleteButton')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
