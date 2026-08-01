import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../services/logger';
import OnboardingTour from '../../components/OnboardingTour';
import type { TourStep } from '../../components/OnboardingTour';
import ClientDashboardHeader from './components/ClientDashboardHeader';
import AppointmentCard from './components/AppointmentCard';
import EmptyState from './components/EmptyState';
import ProfileSection from './components/ProfileSection';
import ExploreSection from './components/ExploreSection';
import AgendaSection from './components/AgendaSection';
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
  }, [clientToken, login, navigate]);

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

  const loadTenants = async () => {
    setTenantsLoading(true);
    try {
      const data = await api.get<{ tenants: Tenant[] }>('/api/tenants');
      setTenants(data.tenants || []);
    } catch (err) { logger.error('Error loading tenants:', err); }
    finally { setTenantsLoading(false); }
  };

  useEffect(() => {
    if (!clientToken) return;
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
    loadTenants();
  }, [clientToken]);

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
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : t('clientDashboard.profileError'));
    }
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

  const handleAgendaNew = () => {
    setEditingAgenda(null);
    setAgendaForm({ titulo: '', fecha: '', descripcion: '' });
    setShowAgendaForm(true);
  };

  const handleAgendaCancel = () => {
    setShowAgendaForm(false);
    setEditingAgenda(null);
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
      <div className="dash-container text-center p-40">
        <div className="spinner m-0-auto" />
        <p className="text-muted mt-12">{t('clientDashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="dash-container p-24">
      <ClientDashboardHeader clientName={clientName ?? ''} onLogout={handleLogout} />

      <OnboardingTour tourId="client-dashboard" steps={clientTourSteps} enabled={!!clientToken} onComplete={() => {}} />

      <div className="glass-panel card-padded">
        <h3 className="m-0 mb-16">{t('clientDashboard.upcomingTitle')}</h3>
        {upcomingAppts.length === 0 ? (
          <EmptyState message={t('clientDashboard.noUpcoming')} />
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
                  <AppointmentCard key={a.id} appointment={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProfileSection
        profileName={profileName}
        profilePhone={profilePhone}
        profileMsg={profileMsg}
        profileError={profileError}
        onNameChange={setProfileName}
        onPhoneChange={setProfilePhone}
        onSave={saveProfile}
      />

      <ExploreSection tenants={tenants} loading={tenantsLoading} onTenantClick={goToTenant} />

      <div className="glass-panel card-padded">
        <h3 className="m-0 mb-16">{t('clientDashboard.historyTitle')}</h3>
        {pastAppts.length === 0 ? (
          <EmptyState message={t('clientDashboard.noHistory')} />
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
                  <AppointmentCard key={a.id} appointment={a} showPrice />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AgendaSection
        events={agendaEvents}
        showForm={showAgendaForm}
        form={agendaForm}
        isEditing={!!editingAgenda}
        onSave={saveAgendaEvent}
        onDelete={deleteAgendaEvent}
        onEdit={editAgendaEvent}
        onCancel={handleAgendaCancel}
        onFormChange={setAgendaForm}
        onNew={handleAgendaNew}
      />
    </div>
  );
}
