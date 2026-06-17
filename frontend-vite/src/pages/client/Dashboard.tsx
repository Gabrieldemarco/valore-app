import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../services/logger';
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
    if (clientToken) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      login(token, 'client', params.get('name') || '');
      if (params.get('name')) localStorage.setItem('clientDisplayName', params.get('name')!);
      window.history.replaceState(null, '', '/client/dashboard');
    } else {
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
        api.get<{ user: { name: string; phone: string } }>('/api/client/me'),
        api.get<{ appointments: Appointment[] }>('/api/tenant/client-appointments'),
        api.get<AgendaEvent[]>('/api/agenda'),
      ]);
      if (profileRes.status === 'fulfilled') {
        setProfileName(profileRes.value.user?.name || '');
        setProfilePhone(profileRes.value.user?.phone || '');
      }
      if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.appointments || []);
      if (agendaRes.status === 'fulfilled') setAgendaEvents(agendaRes.value || []);
    } catch (err) { logger.error('Error loading client data:', err); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    setProfileMsg(''); setProfileError('');
    try {
      const res = await api.put<{ user: { name: string; phone: string } }>('/api/client/me', { name: profileName, phone: profilePhone });
      if (res.user?.name) {
        localStorage.setItem('clientDisplayName', res.user.name);
        localStorage.setItem('clientName', res.user.name);
      }
      if (res.user?.phone) localStorage.setItem('clientPhone', res.user.phone);
      setProfileMsg('Datos actualizados');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      setProfileError(err?.message || 'Error al guardar');
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
        await api.put(`/api/agenda/${editingAgenda.id}`, agendaForm);
      } else {
        await api.post('/api/agenda', agendaForm);
      }
      setAgendaForm({ titulo: '', fecha: '', descripcion: '' });
      setShowAgendaForm(false);
      setEditingAgenda(null);
      clearApiCache();
      const data = await api.get<AgendaEvent[]>('/api/agenda');
      setAgendaEvents(data || []);
    } catch (err) { logger.error(err); }
  };

  const deleteAgendaEvent = async (id: number) => {
    if (!confirm(t('clientDashboard.confirmDeleteEvent'))) return;
    try {
      await api.delete(`/api/agenda/${id}`);
      clearApiCache();
      const data = await api.get<AgendaEvent[]>('/api/agenda');
      setAgendaEvents(data || []);
    } catch (err) { logger.error(err); }
  };

  const editAgendaEvent = (ev: AgendaEvent) => {
    setAgendaForm({ titulo: ev.titulo, fecha: ev.fecha.slice(0, 16), descripcion: ev.descripcion || '' });
    setEditingAgenda(ev);
    setShowAgendaForm(true);
  };

  const upcomingAppts = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
  const pastAppts = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show');

  if (loading) {
    return (
      <div className="dash-container" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>{t('clientDashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="dash-container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="text-gradient" style={{ margin: 0 }}>{t('clientDashboard.welcome', { name: clientName })}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="dash-btn dash-btn-danger" onClick={handleLogout}>{t('clientDashboard.logout')}</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>{t('clientDashboard.upcomingTitle')}</h3>
        {upcomingAppts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{t('clientDashboard.noUpcoming')}</p>
        ) : (
          <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableService')}</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableDate')}</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableTime')}</th>
                  <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppts.map(a => (
                  <tr key={a.id}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{a.service}</td>
                    <td style={{ padding: 12 }}>{new Date(a.appointment_date).toLocaleDateString()}</td>
                    <td style={{ padding: 12 }}>{new Date(a.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
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

      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>Mi Perfil</h3>
        {profileMsg && <div className="auth-success" style={{ marginBottom: 12 }}>{profileMsg}</div>}
        {profileError && <div className="auth-error" style={{ marginBottom: 12 }}>{profileError}</div>}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Nombre completo</label>
            <input type="text" className="glass-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Tu nombre" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Teléfono</label>
            <input type="tel" className="glass-input" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="099 123 456" style={{ width: '100%' }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveProfile}>Guardar</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>Explorar Negocios</h3>
        {tenantsLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        ) : tenants.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay negocios disponibles</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {tenants.map(t => (
              <div key={t.id} onClick={() => goToTenant(t.slug)} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, cursor: 'pointer',
                border: '1px solid rgba(99,102,241,0.15)', transition: 'all .2s',
              }} onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                 onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)')}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{t.business_name}</div>
                {t.business_address && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.business_address}</div>}
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Reservar turno →</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px' }}>{t('clientDashboard.historyTitle')}</h3>
        {pastAppts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{t('clientDashboard.noHistory')}</p>
        ) : (
          <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableService')}</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableDate')}</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tablePrice')}</th>
                  <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {pastAppts.map(a => (
                  <tr key={a.id}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{a.service}</td>
                    <td style={{ padding: 12 }}>{new Date(a.appointment_date).toLocaleDateString()}</td>
                    <td style={{ padding: 12 }}>${a.service_price || 0}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span className="dash-appointment-status dash-status-cancelled">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{t('clientDashboard.agendaTitle')}</h3>
          <button className="dash-btn dash-btn-primary" onClick={() => { setEditingAgenda(null); setAgendaForm({ titulo: '', fecha: '', descripcion: '' }); setShowAgendaForm(true); }}>
            {t('clientDashboard.agendaNewButton')}
          </button>
        </div>
        {showAgendaForm && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
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
          <p style={{ color: 'var(--text-muted)' }}>{t('clientDashboard.agendaEmpty')}</p>
        ) : (
          <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.agendaTableTitle')}</th>
                  <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.agendaTableDate')}</th>
                  <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('clientDashboard.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {agendaEvents.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{ev.titulo}</td>
                    <td style={{ padding: 12 }}>{new Date(ev.fecha).toLocaleString()}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => editAgendaEvent(ev)}>{t('clientDashboard.editButton')}</button>
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
