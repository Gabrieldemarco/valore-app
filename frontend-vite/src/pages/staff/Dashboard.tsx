import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import '../../styles/global-premium.css';
import '../../styles/dashboard.css';
import '../../styles/fullcalendar.css';

interface Appointment {
  id: number;
  client_name: string;
  service: string;
  service_name?: string;
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
}

interface PlanInfo {
  plan: string;
  status: string;
  trial_end?: string;
  price?: number;
}

interface Invoice {
  id: number;
  amount: number;
  status: string;
  due_date: string;
  description?: string;
}

interface StaffMember {
  id: number;
  name: string;
  email?: string;
  role?: string;
  specialties?: string[];
  photo_url?: string;
  bio?: string;
  active?: boolean;
  individual_hours?: { startHour: number; endHour: number; workDays: number[] } | null;
}

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  image?: string;
}

interface TenantSettings {
  business_name: string;
  business_phone: string;
  business_address: string;
  notification_email: string;
  notification_whatsapp: string;
  slug?: string;
  smtp_email?: string;
  smtp_password?: string;
  opening_hours?: { startHour: number; endHour: number; workDays: number[] };
}

interface ClientSummary {
  client_name: string;
  client_phone: string;
  client_email?: string;
  total_appointments: string;
  last_appointment: string;
  first_appointment: string;
}

type Tab = 'list' | 'calendar' | 'billing' | 'staff' | 'services' | 'clients';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function StaffDashboard() {
  const { staffToken, staffName, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TenantSettings>({ business_name: '', business_phone: '', business_address: '', notification_email: '', notification_whatsapp: '' });
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterPhone, setFilterPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [staffModal, setStaffModal] = useState<{ open: boolean; editing: StaffMember | null }>({ open: false, editing: null });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', specialties: '', photo_url: '', bio: '', indStart: '9', indEnd: '19', indWorkDays: [1, 2, 3, 4, 5] as number[], useIndividualHours: false });
  const [servicesModal, setServicesModal] = useState<{ open: boolean; editing: ServiceItem | null }>({ open: false, editing: null });
  const [servicesForm, setServicesForm] = useState({ name: '', duration: '30', price: '0', image: '' });
  const [clientsList, setClientsList] = useState<ClientSummary[]>([]);
  const [clientsSearch, setClientsSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [openingHours, setOpeningHours] = useState<{ startHour: number; endHour: number; workDays: number[] }>({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] });
  const [newApptForm, setNewApptForm] = useState({ clientName: '', clientPhone: '', clientEmail: '', serviceId: '', staffId: '', appointmentDate: '', appointmentTime: '', notes: '' });
  const [suggestedClients, setSuggestedClients] = useState<ClientSummary[]>([]);
  const [selectedSuggested, setSelectedSuggested] = useState<ClientSummary | null>(null);

  useEffect(() => {
    if (!staffToken) navigate('/staff/login');
  }, [staffToken, navigate]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterDate) params.set('date', filterDate);
      if (selectedStaff) params.set('staffId', String(selectedStaff));
      params.set('page', String(page));
      params.set('limit', '20');
      const data = await api.get<{ appointments: Appointment[]; total: number; totalPages: number }>(`/api/appointments?${params}`);
      setAppointments(data.appointments);
      setTotalPages(data.totalPages);
      setTotalAppointments(data.total);
    } catch { addToast('Error al cargar turnos', 'error'); } finally { setLoading(false); }
  }, [filterStatus, filterDate, selectedStaff, page]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const loadServices = useCallback(async () => {
    try {
      const data = await api.get<{ services: ServiceItem[] }>('/api/tenant/services');
      setServicesList(data.services);
    } catch { addToast('Error al cargar servicios', 'error'); }
  }, []);

  const loadClients = useCallback(async (q?: string) => {
    try {
      setClientsLoading(true);
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients${query}`);
      setClientsList(data.clients);
    } catch { addToast('Error al cargar clientes', 'error'); } finally { setClientsLoading(false); }
  }, []);

  const openClientHistory = async (client: ClientSummary) => {
    setSelectedClient(client);
    setClientHistoryLoading(true);
    try {
      const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(client.client_phone)}/appointments`);
      setClientHistory(data.appointments);
    } catch { addToast('Error al cargar historial', 'error'); } finally { setClientHistoryLoading(false); }
  };

  const saveNewAppointment = async () => {
    if (!newApptForm.clientName || !newApptForm.clientPhone || !newApptForm.serviceId || !newApptForm.appointmentDate || !newApptForm.appointmentTime) {
      addToast('Completá nombre, teléfono, servicio, fecha y hora', 'error');
      return;
    }
    const apptDate = new Date(`${newApptForm.appointmentDate}T${newApptForm.appointmentTime}:00`);
    if (apptDate <= new Date()) {
      addToast('La fecha del turno debe ser futura', 'error');
      return;
    }
    try {
      const appointmentDate = new Date(`${newApptForm.appointmentDate}T${newApptForm.appointmentTime}:00`).toISOString();
      const body: Record<string, unknown> = {
        clientName: newApptForm.clientName,
        clientPhone: newApptForm.clientPhone,
        serviceId: parseInt(newApptForm.serviceId, 10),
        appointmentDate,
      };
      if (newApptForm.clientEmail) body.clientEmail = newApptForm.clientEmail;
      if (newApptForm.staffId) body.staffId = parseInt(newApptForm.staffId, 10);
      if (newApptForm.notes) body.notes = newApptForm.notes;
      await api.post('/api/appointments', body);
      addToast('Turno creado', 'success');
      setShowNewAppointment(false);
      loadAppointments();
      loadClients();
      try { new BroadcastChannel('dashboard-sync').postMessage('reload'); } catch {}
    } catch { addToast('Error al crear turno', 'error'); }
  };

  useEffect(() => {
    api.get<{ tenant: TenantSettings }>('/api/tenant/me').then(d => {
      setSettings(d.tenant);
      if (d.tenant.opening_hours) setOpeningHours(d.tenant.opening_hours);
    }).catch(() => {});
    api.get<{ tenant: PlanInfo }>('/api/tenant/plan').then(d => setPlan(d.tenant)).catch(() => {});
    api.get<{ invoices: Invoice[] }>('/api/tenant/invoices').then(d => setInvoices(d.invoices)).catch(() => {});
    api.get<{ staff: StaffMember[] }>('/api/tenant/staff').then(d => setStaffList(d.staff)).catch(() => {});
    loadServices();
    loadClients();

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') { addToast('Pago exitoso. Tu plan está activo.', 'success'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'failure') { addToast('El pago no pudo completarse. Intentá de nuevo.', 'error'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'pending') { addToast('Pago pendiente. Te avisaremos cuando se acredite.', 'success'); window.history.replaceState({}, '', window.location.pathname); }
    const billing = params.get('billing');
    if (billing === '1') setActiveTab('billing');
  }, [loadServices]);

  useEffect(() => {
    if (!showNewAppointment) { setSuggestedClients([]); return; }
    if (newApptForm.clientPhone.length < 3) { setSuggestedClients([]); return; }
    const t = setTimeout(() => {
      api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients?q=${encodeURIComponent(newApptForm.clientPhone)}`)
        .then(d => setSuggestedClients(d.clients)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [showNewAppointment, newApptForm.clientPhone]);

  // Sincronizar cambios entre pestañas
  useEffect(() => {
    const bc = new BroadcastChannel('dashboard-sync');
    bc.onmessage = (ev) => {
      if (ev.data === 'reload') {
        loadAppointments();
        api.get<{ staff: StaffMember[] }>('/api/tenant/staff').then(d => setStaffList(d.staff)).catch(() => {});
        loadServices();
        loadClients();
      }
    };
    return () => bc.close();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    const labels: Record<string, string> = { completed: 'completar', cancelled: 'cancelar', confirmed: 'confirmar' };
    if (!confirm(`¿Estás seguro de ${labels[status] || status} este turno?`)) return;
    try {
      await api.put(`/api/appointments/${id}/status`, { status });
      addToast('Estado actualizado', 'success');
      loadAppointments();
      try { new BroadcastChannel('dashboard-sync').postMessage('reload'); } catch {}
    } catch { addToast('Error al actualizar', 'error'); }
  };

  const saveSettings = async () => {
    try {
      await api.put('/api/tenant/settings', { ...settings, opening_hours: openingHours });
      addToast('Configuración guardada', 'success');
    } catch { addToast('Error al guardar', 'error'); }
  };

  const subscribeToPlan = async (planName: string) => {
    try {
      const res = await api.post<{ init_point: string }>('/api/tenant/subscribe', { plan: planName });
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast('Error al procesar suscripción', 'error'); }
  };

  const handlePayInvoice = async (invoiceId: number) => {
    try {
      const res = await api.post<{ init_point: string }>(`/api/tenant/invoices/${invoiceId}/pay`);
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast('Error al procesar pago', 'error'); }
  };

  const exportToCSV = () => {
    if (appointments.length === 0) return;
    const headers = ['Cliente', 'Servicio', 'Staff', 'Fecha', 'Hora', 'Estado', 'Teléfono'];
    const rows = appointments.map(a => [a.client_name, a.service_name || a.service || '', a.staff_name || '', a.date, a.time, a.status, a.phone || a.client_phone || '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `turnos-${filterDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => { logout(); navigate('/staff/login'); };

  const getStatusBadge = (status: string) => {
    const cls = status === 'confirmed' ? 'dash-status-confirmed'
      : status === 'completed' ? 'dash-status-completed'
      : status === 'cancelled' ? 'dash-status-cancelled'
      : 'dash-status-pending';
    return <span className={`dash-appointment-status ${cls}`}>{status}</span>;
  };

  // ===== STAFF CRUD =====
  const openStaffCreate = () => {
    setStaffForm({ name: '', email: '', specialties: '', photo_url: '', bio: '', indStart: '9', indEnd: '19', indWorkDays: [1, 2, 3, 4, 5], useIndividualHours: false });
    setStaffModal({ open: true, editing: null });
  };

  const openStaffEdit = (s: StaffMember) => {
    const ind = s.individual_hours as { startHour?: number; endHour?: number; workDays?: number[] } | null | undefined;
    setStaffForm({
      name: s.name,
      email: s.email || '',
      specialties: (s.specialties || []).join(', '),
      photo_url: s.photo_url || '',
      bio: s.bio || '',
      useIndividualHours: !!ind,
      indStart: String(ind?.startHour ?? 9),
      indEnd: String(ind?.endHour ?? 19),
      indWorkDays: ind?.workDays ?? [1, 2, 3, 4, 5],
    });
    setStaffModal({ open: true, editing: s });
  };

  const saveStaff = async () => {
    try {
      const body: any = {
        name: staffForm.name,
        email: staffForm.email,
        specialties: staffForm.specialties ? staffForm.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
        photo_url: staffForm.photo_url || undefined,
        bio: staffForm.bio || undefined,
      };
      if (staffForm.useIndividualHours) {
        body.individual_hours = {
          startHour: parseInt(staffForm.indStart, 10),
          endHour: parseInt(staffForm.indEnd, 10),
          workDays: staffForm.indWorkDays,
        };
      }
      if (staffModal.editing) {
        await api.put(`/api/tenant/staff/${staffModal.editing.id}`, body);
        addToast('Peluquero actualizado', 'success');
      } else {
        const res = await api.post<{ tempPassword: string }>('/api/tenant/staff', body);
        addToast(`Peluquero creado. Contraseña temporal: ${res.tempPassword}. Compartila de forma segura.`, 'success');
      }
      setStaffModal({ open: false, editing: null });
      const data = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff');
      setStaffList(data.staff);
    } catch (e: any) {
      const msg = e?.error || 'Error al guardar peluquero';
      addToast(msg, 'error');
    }
  };

  const deleteStaff = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/tenant/staff/${id}`);
      addToast('Peluquero eliminado', 'success');
      const data = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff');
      setStaffList(data.staff);
    } catch { addToast('Error al eliminar peluquero', 'error'); }
  };

  // ===== SERVICES CRUD =====
  const openServiceCreate = () => {
    setServicesForm({ name: '', duration: '30', price: '0', image: '' });
    setServicesModal({ open: true, editing: null });
  };

  const openServiceEdit = (s: ServiceItem) => {
    setServicesForm({
      name: s.name,
      duration: String(s.duration),
      price: String(s.price),
      image: s.image || '',
    });
    setServicesModal({ open: true, editing: s });
  };

  const saveService = async () => {
    if (!servicesForm.name || !servicesForm.duration) {
      addToast('Nombre y duración son obligatorios', 'error');
      return;
    }
    try {
      const body = {
        name: servicesForm.name,
        duration: parseInt(servicesForm.duration, 10),
        price: parseFloat(servicesForm.price),
        image: servicesForm.image || undefined,
      };
      if (servicesModal.editing) {
        await api.put(`/api/tenant/services/${servicesModal.editing.id}`, body);
        addToast('Servicio actualizado', 'success');
      } else {
        await api.post('/api/tenant/services', body);
        addToast('Servicio creado', 'success');
      }
      setServicesModal({ open: false, editing: null });
      loadServices();
    } catch (e: any) {
      addToast(e?.error || 'Error al guardar servicio', 'error');
    }
  };

  const deleteService = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/tenant/services/${id}`);
      addToast('Servicio eliminado', 'success');
      loadServices();
    } catch { addToast('Error al eliminar servicio', 'error'); }
  };

  const toggleServiceActive = async (s: ServiceItem) => {
    try {
      await api.put(`/api/tenant/services/${s.id}`, { active: !s.active });
      addToast(s.active ? 'Servicio desactivado' : 'Servicio activado', 'success');
      loadServices();
    } catch { addToast('Error al cambiar estado', 'error'); }
  };

  return (
    <div className="dash-body">
      {toasts.length > 0 && (
        <div className="dash-toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`dash-toast glass-panel ${t.type}`}>
              <span className="dash-toast-icon">{t.type === 'success' ? '✅' : '❌'}</span>
              <span className="dash-toast-message">{t.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dash-header">
        <h1 className="text-gradient">Gestión de Turnos</h1>
        <div className="dash-user-info">
          {plan && plan.trial_end && plan.status !== 'active' && (
            <span className={`dash-trial-badge${Math.max(0, Math.ceil((new Date(plan.trial_end).getTime() - Date.now()) / 86400000)) < 3 ? ' dash-trial-critical' : ''}`}>
              ⏳ Prueba · {Math.max(0, Math.ceil((new Date(plan.trial_end).getTime() - Date.now()) / 86400000))} días
            </span>
          )}
          <Link to="/staff/landing-editor" className="dash-btn dash-btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>Landing Page</Link>
          {settings.slug && <a href={`/landing?tenant=${settings.slug}`} target="_blank" rel="noopener noreferrer" className="dash-btn btn btn-secondary" style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}>👁️ Ver Landing</a>}
          <button onClick={() => setShowSettings(p => !p)} className="dash-btn btn btn-secondary" style={{ fontSize: 14, padding: '8px 16px', fontWeight: 500, borderRadius: 8 }}>Configuración</button>
          <span className="dash-user-name">{staffName || 'Cargando...'}</span>
          <button className="dash-btn dash-btn-danger" onClick={handleLogout}>Salir</button>
        </div>
      </div>

      {showSettings && (
        <div className="dash-container">
          <div className="glass-panel" style={{ padding: 32, marginBottom: 32, display: 'block' }}>
            <div className="dash-panel-header">
              <h3 className="text-gradient">Configuración de la Peluquería</h3>
              <button onClick={() => setShowSettings(false)} className="dash-close-btn">✕</button>
            </div>
            <form className="dash-form-grid" onSubmit={e => { e.preventDefault(); saveSettings(); }}>
              <div className="dash-form-group">
                <label>Nombre del Negocio</label>
                <input type="text" className="glass-input" value={settings.business_name} onChange={e => setSettings(p => ({ ...p, business_name: e.target.value }))} placeholder="Mi Peluquería" />
              </div>
              <div className="dash-form-group">
                <label>Dirección</label>
                <input type="text" className="glass-input" value={settings.business_address} onChange={e => setSettings(p => ({ ...p, business_address: e.target.value }))} placeholder="Av. Corrientes 1234" />
              </div>
              <div className="dash-form-group">
                <label>Email para recibir alertas</label>
                <input type="email" className="glass-input" value={settings.notification_email} onChange={e => setSettings(p => ({ ...p, notification_email: e.target.value }))} placeholder="tu@email.com" />
                <small>Aquí recibirás notificaciones de nuevos turnos</small>
              </div>
              <div className="dash-form-group">
                <label>WhatsApp de contacto</label>
                <input type="tel" className="glass-input" value={settings.business_phone} onChange={e => setSettings(p => ({ ...p, business_phone: e.target.value }))} placeholder="+54 9 11..." />
                <small>Número que verán los clientes</small>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>🕐 Horarios de Atención</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="dash-form-group">
                      <label>Hora de apertura</label>
                      <select className="glass-input" value={openingHours.startHour} onChange={e => setOpeningHours(p => ({ ...p, startHour: parseInt(e.target.value, 10) }))}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                    <div className="dash-form-group">
                      <label>Hora de cierre</label>
                      <select className="glass-input" value={openingHours.endHour} onChange={e => setOpeningHours(p => ({ ...p, endHour: parseInt(e.target.value, 10) }))}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="dash-form-group" style={{ marginTop: 8 }}>
                    <label>Días laborales</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' },
                        { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }, { v: 0, l: 'Dom' }
                      ].map(d => (
                        <label key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14, color: 'var(--text-main)' }}>
                          <input type="checkbox" checked={openingHours.workDays.includes(d.v)} onChange={() => {
                            setOpeningHours(p => ({
                              ...p,
                              workDays: p.workDays.includes(d.v) ? p.workDays.filter(w => w !== d.v) : [...p.workDays, d.v].sort(),
                            }));
                          }} />
                          {d.l}
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>🔧 Configuración SMTP (correo transaccional)</summary>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Usá Gmail con <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-hover)' }}>App Password</a>. La contraseña no se muestra por seguridad.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="dash-form-group">
                      <label>Email SMTP</label>
                      <input type="email" className="glass-input" value={settings.smtp_email || ''} onChange={e => setSettings(p => ({ ...p, smtp_email: e.target.value }))} placeholder="tu@email.com" />
                    </div>
                    <div className="dash-form-group">
                      <label>Contraseña (App Password)</label>
                      <input type="password" className="glass-input" value={settings.smtp_password || ''} onChange={e => setSettings(p => ({ ...p, smtp_password: e.target.value }))} placeholder="••••••••" />
                      <small style={{ color: 'var(--text-muted)' }}>No se muestra al cargar (guardada de forma segura)</small>
                    </div>
                  </div>
                </details>
              </div>

              <div className="dash-form-group full-width" style={{ textAlign: 'right', marginTop: 10 }}>
                <button type="submit" className="dash-btn dash-btn-success">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dash-container">
        <div className="dash-stats">
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">Turnos Hoy</div>
                <div className="dash-stat-value">{appointments.filter(a => a.date === filterDate).length}</div>
              </div>
              <div className="dash-stat-icon">📅</div>
            </div>
          </div>
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">Pendientes</div>
                <div className="dash-stat-value">{appointments.filter(a => a.status === 'pending').length}</div>
              </div>
              <div className="dash-stat-icon">⏳</div>
            </div>
          </div>
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">Completados</div>
                <div className="dash-stat-value">{appointments.filter(a => a.status === 'completed').length}</div>
              </div>
              <div className="dash-stat-icon">✅</div>
            </div>
          </div>
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">Tasa Cancelación</div>
                <div className="dash-stat-value">
                  {appointments.length > 0
                    ? Math.round((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100) + '%'
                    : '0%'}
                </div>
              </div>
              <div className="dash-stat-icon">📉</div>
            </div>
          </div>
        </div>

        <div className="dash-tabs glass-panel">
          {(['list', 'calendar', 'staff', 'services', 'clients', 'billing'] as Tab[]).map(tab => (
            <button key={tab} className={`dash-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'list' ? '📋 Turnos' : tab === 'calendar' ? '📆 Calendario' : tab === 'staff' ? '👥 Staff' : tab === 'services' ? '💇 Servicios' : tab === 'clients' ? '👤 Clientes' : '💳 Facturación'}
            </button>
          ))}
          <button className="dash-tab" onClick={exportToCSV}>📥 Exportar CSV</button>
        </div>

        {activeTab !== 'staff' && activeTab !== 'services' && activeTab !== 'clients' && staffList.length > 0 && (
          <div id="dashStaffFilterContainer" className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '20px 0', padding: 16 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Ver agenda de:</span>
            <div id="dashStaffFilterButtons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className={`dash-staff-filter-btn${selectedStaff === '' ? ' active' : ''}`} onClick={() => { setPage(1); setSelectedStaff(''); }}>Todos</button>
              {staffList.filter(s => s.active !== false).map(s => (
                <button key={s.id} className={`dash-staff-filter-btn${selectedStaff === s.id ? ' active' : ''}`} onClick={() => { setPage(1); setSelectedStaff(s.id); }}>{s.name}</button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <>
            <div className="dash-filters glass-panel">
              <div className="dash-filter-group">
                <label>Fecha</label>
                <input type="date" className="glass-input" value={filterDate} onChange={e => { setPage(1); setFilterDate(e.target.value); }} />
              </div>
              <div className="dash-filter-group">
                <label>Estado</label>
                <select className="glass-input" value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value); }}>
                  <option value="">Todos</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="completed">Completados</option>
                  <option value="cancelled">Cancelados</option>
                  <option value="pending">Pendientes</option>
                </select>
              </div>
              <div className="dash-filter-group">
                <label>Buscar por teléfono</label>
                <input type="text" className="glass-input" placeholder="+54 9..." value={filterPhone} onChange={e => setFilterPhone(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="dash-btn dash-btn-success" onClick={() => {
                setNewApptForm({ clientName: '', clientPhone: '', clientEmail: '', serviceId: '', staffId: '', appointmentDate: filterDate, appointmentTime: '', notes: '' });
                setShowNewAppointment(true);
              }}>+ Nuevo Turno</button>
            </div>

            {loading ? (
              <div className="dash-loading">
                <div className="dash-loading-spinner"></div>
                Cargando turnos...
              </div>
            ) : appointments.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">No hay turnos</h3>
                <p>No se encontraron turnos para los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="dash-appointments-list">
                {appointments.filter(a => !filterPhone || ((a.phone || a.client_phone || '') && (a.phone || a.client_phone || '').includes(filterPhone))).map(a => (
                  <div key={a.id} className={`dash-appointment-card glass-panel ${a.status}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedAppointment(a)}>
                    <div className="dash-appointment-header">
                      <div>
                        <div className="dash-appointment-time">{a.time}</div>
                        <div className="dash-appointment-date">{a.date}</div>
                      </div>
                      {getStatusBadge(a.status)}
                    </div>
                    <div className="dash-appointment-body">
                      <div className="dash-info-group">
                        <label>Cliente</label>
                        <span>{a.client_name}</span>
                      </div>
                      <div className="dash-info-group">
                        <label>Servicio</label>
                        <span>{a.service_name || a.service || '-'}</span>
                      </div>
                      <div className="dash-info-group">
                        <label>Staff</label>
                        <span>{a.staff_name || '-'}</span>
                      </div>
                    </div>
                    {a.notes && <div className="dash-appointment-notes">{a.notes}</div>}
                    {(a.phone || a.client_phone) && (
                      <div style={{ padding: '0 16px 8px' }}>
                        <a href={`https://wa.me/${(a.phone || a.client_phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>💬 WhatsApp</a>
                      </div>
                    )}
                    <div className="dash-appointment-actions" onClick={e => e.stopPropagation()}>
                      {a.status === 'pending' && (
                        <button className="dash-btn dash-btn-success" onClick={() => updateStatus(a.id, 'confirmed')}>Confirmar</button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button className="dash-btn dash-btn-complete" onClick={() => updateStatus(a.id, 'completed')}>Completar</button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button className="dash-btn dash-btn-cancel" onClick={() => updateStatus(a.id, 'cancelled')}>Cancelar</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20, padding: 12 }}>
                <button className="dash-btn dash-btn-success" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ opacity: page <= 1 ? 0.4 : 1 }}>← Anterior</button>
                <span style={{ color: 'var(--text-muted)', fontSize: 14, padding: '0 8px' }}>
                  Pág. {page} de {totalPages} ({totalAppointments} turnos)
                </span>
                <button className="dash-btn dash-btn-success" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ opacity: page >= totalPages ? 0.4 : 1 }}>Siguiente →</button>
              </div>
            )}
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="glass-panel" style={{ padding: 28, marginTop: 16, minHeight: 550 }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda' }}
              firstDay={1}
              height={650}
              events={appointments.map(a => {
                const start = a.appointment_date || (a.date && a.time ? `${a.date}T${a.time}` : a.date) || undefined;
                const colors: Record<string, { bg: string; border: string }> = {
                  confirmed: { bg: 'rgba(34,197,94,0.25)', border: '#22c55e' },
                  completed: { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6' },
                  cancelled: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444' },
                  pending: { bg: 'rgba(234,179,8,0.25)', border: '#eab308' },
                };
                const c = colors[a.status] || colors.pending;
                return {
                  id: String(a.id),
                  title: `${a.client_name}${(a.service_name || a.service) ? ` - ${a.service_name || a.service}` : ''}`,
                  start,
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  textColor: '#e2e8f0',
                  extendedProps: { appt: a },
                };
              })}
              eventContent={(arg) => ({
                html: `<div style="padding:2px 4px;font-size:12px;line-height:1.3">${arg.event.title}</div>`,
              })}
              eventClick={(info) => {
                const appt = info.event.extendedProps.appt as Appointment;
                if (appt) setSelectedAppointment(appt);
              }}
            />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>Clientes</h3>
            </div>
            <div className="dash-filters glass-panel" style={{ marginBottom: 20 }}>
              <div className="dash-filter-group" style={{ flex: 1 }}>
                <label>Buscar por nombre o teléfono</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Escribí para buscar..."
                  value={clientsSearch}
                  onChange={e => { setClientsSearch(e.target.value); loadClients(e.target.value); }}
                />
              </div>
            </div>
            {clientsLoading ? (
              <div className="dash-loading">
                <div className="dash-loading-spinner"></div>
                Cargando clientes...
              </div>
            ) : clientsList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">Sin clientes</h3>
                <p>{clientsSearch ? 'No se encontraron clientes con ese criterio.' : 'No hay clientes registrados.'}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Nombre</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Teléfono</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Email</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Turnos</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Última visita</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Acción</th>
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
                          <button className="dash-btn dash-btn-success" onClick={() => openClientHistory(c)}>Historial</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            {plan && (
              <div className="glass-panel" style={{ marginBottom: 20, padding: 20, border: '1px solid rgba(197,168,128,0.35)' }}>
                <h3 className="text-gradient" style={{ margin: '0 0 8px' }}>Tu plan</h3>
                <p id="planStatusText" style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>
                  Plan: {plan.plan} - Estado: {plan.status}
                </p>
                {plan.status !== 'active' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                    <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>Plan Profesional</button>
                    <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>Plan Empresarial</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0 }}>Facturación</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Prueba 15 días gratis. Después, pagá acá con Mercado Pago y tu plan se activa al instante.</p>
              </div>
              <button className="dash-btn dash-btn-success" onClick={() => api.get<{ invoices: Invoice[] }>('/api/tenant/invoices').then(d => setInvoices(d.invoices))}>Actualizar facturas</button>
            </div>
            {invoices.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">No hay facturas</h3>
                <p>No se encontraron facturas para tu peluquería.</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table className="dash-invoice-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Factura</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Monto</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Vencimiento</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Estado</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ padding: 12 }}>#{inv.id}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>${inv.amount}</td>
                        <td style={{ padding: 12 }}>{inv.due_date}</td>
                        <td style={{ padding: 12 }}><span className={`dash-appointment-status dash-status-${inv.status}`}>{inv.status}</span></td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {inv.status === 'pending' && (
                            <button className="dash-btn dash-btn-success" onClick={() => handlePayInvoice(inv.id)}>Pagar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>Peluqueros</h3>
              <button className="dash-btn dash-btn-success" onClick={openStaffCreate}>+ Nuevo Peluquero</button>
            </div>
            {staffList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">Sin peluqueros</h3>
                <p>Agregá peluqueros para empezar a recibir turnos.</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Nombre</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Especialidades</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Estado</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{s.email || '-'}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{(s.specialties || []).join(', ') || '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span className={`dash-appointment-status ${s.active !== false ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                            {s.active !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => openStaffEdit(s)}>Editar</button>
                          <button className="dash-btn dash-btn-danger" onClick={() => deleteStaff(s.id, s.name)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>Servicios</h3>
              <button className="dash-btn dash-btn-success" onClick={openServiceCreate}>+ Nuevo Servicio</button>
            </div>
            {servicesList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">Sin servicios</h3>
                <p>Agregá servicios para que los clientes puedan reservar.</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Nombre</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Duración</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Precio</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Activo</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesList.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{s.duration} min</td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>${s.price}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button
                            onClick={() => toggleServiceActive(s)}
                            className={`dash-appointment-status ${s.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {s.active ? 'Sí' : 'No'}
                          </button>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => openServiceEdit(s)}>Editar</button>
                          <button className="dash-btn dash-btn-danger" onClick={() => deleteService(s.id, s.name)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff Modal */}
      {staffModal.open && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setStaffModal({ open: false, editing: null })}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{staffModal.editing ? 'Editar Peluquero' : 'Nuevo Peluquero'}</h3>
              <button onClick={() => setStaffModal({ open: false, editing: null })} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>Nombre *</label>
                <input type="text" className="glass-input" value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del peluquero" />
              </div>
              <div className="dash-form-group">
                <label>Email *</label>
                <input type="email" className="glass-input" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" disabled={!!staffModal.editing} />
                {!staffModal.editing && <small>Se generará una contraseña temporal automáticamente</small>}
              </div>
              <div className="dash-form-group">
                <label>Especialidades</label>
                <input type="text" className="glass-input" value={staffForm.specialties} onChange={e => setStaffForm(p => ({ ...p, specialties: e.target.value }))} placeholder="Corte, Color, Barba (separado por comas)" />
              </div>
              <div className="dash-form-group">
                <label>URL de Foto</label>
                <input type="text" className="glass-input" value={staffForm.photo_url} onChange={e => setStaffForm(p => ({ ...p, photo_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="dash-form-group">
                <label>Bio</label>
                <textarea className="glass-input" value={staffForm.bio} onChange={e => setStaffForm(p => ({ ...p, bio: e.target.value }))} placeholder="Breve descripción..." rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div className="dash-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={staffForm.useIndividualHours} onChange={e => setStaffForm(p => ({ ...p, useIndividualHours: e.target.checked }))} />
                  Horarios personalizados
                </label>
              </div>
              {staffForm.useIndividualHours && (
                <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <div className="dash-form-group">
                    <label>Hora inicio</label>
                    <select className="glass-input" value={staffForm.indStart} onChange={e => setStaffForm(p => ({ ...p, indStart: e.target.value }))}>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                  <div className="dash-form-group">
                    <label>Hora cierre</label>
                    <select className="glass-input" value={staffForm.indEnd} onChange={e => setStaffForm(p => ({ ...p, indEnd: e.target.value }))}>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                  <div className="dash-form-group">
                    <label>Días laborales</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { v: 0, l: 'Dom' }, { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' },
                        { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }
                      ].map(d => (
                        <label key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={staffForm.indWorkDays.includes(d.v)}
                            onChange={() => setStaffForm(p => ({
                              ...p,
                              indWorkDays: p.indWorkDays.includes(d.v)
                                ? p.indWorkDays.filter(w => w !== d.v)
                                : [...p.indWorkDays, d.v].sort()
                            }))} />
                          {d.l}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setStaffModal({ open: false, editing: null })}>Cancelar</button>
                <button className="dash-btn dash-btn-success" onClick={saveStaff}>{staffModal.editing ? 'Guardar Cambios' : 'Crear Peluquero'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {servicesModal.open && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setServicesModal({ open: false, editing: null })}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{servicesModal.editing ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
              <button onClick={() => setServicesModal({ open: false, editing: null })} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>Nombre *</label>
                <input type="text" className="glass-input" value={servicesForm.name} onChange={e => setServicesForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Corte de cabello" />
              </div>
              <div className="dash-form-group">
                <label>Duración (minutos) *</label>
                <input type="number" className="glass-input" value={servicesForm.duration} onChange={e => setServicesForm(p => ({ ...p, duration: e.target.value }))} min="5" step="5" />
              </div>
              <div className="dash-form-group">
                <label>Precio ($) *</label>
                <input type="number" className="glass-input" value={servicesForm.price} onChange={e => setServicesForm(p => ({ ...p, price: e.target.value }))} min="0" step="0.01" />
              </div>
              <div className="dash-form-group">
                <label>URL de Imagen</label>
                <input type="text" className="glass-input" value={servicesForm.image} onChange={e => setServicesForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setServicesModal({ open: false, editing: null })}>Cancelar</button>
                <button className="dash-btn dash-btn-success" onClick={saveService}>{servicesModal.editing ? 'Guardar Cambios' : 'Crear Servicio'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewAppointment && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setShowNewAppointment(false)}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">Nuevo Turno</h3>
              <button onClick={() => setShowNewAppointment(false)} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>Nombre del Cliente *</label>
                <input type="text" className="glass-input" value={newApptForm.clientName} onChange={e => setNewApptForm(p => ({ ...p, clientName: e.target.value }))} placeholder="Nombre y apellido" />
              </div>
              <div className="dash-form-group">
                <label>Teléfono *</label>
                <input type="tel" className="glass-input" value={newApptForm.clientPhone} onChange={e => { setNewApptForm(p => ({ ...p, clientPhone: e.target.value })); setSelectedSuggested(null); }} placeholder="099 123 456" />
                {suggestedClients.length > 0 && (
                  <div style={{ position: 'relative', marginTop: 4 }}>
                    <div style={{ position: 'absolute', zIndex: 10, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {suggestedClients.map(c => (
                        <div key={c.client_phone} onClick={() => {
                          setNewApptForm(p => ({ ...p, clientName: c.client_name, clientPhone: c.client_phone, clientEmail: c.client_email || '' }));
                          setSelectedSuggested(c);
                          setSuggestedClients([]);
                        }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span><strong>{c.client_name}</strong> - {c.client_phone}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{c.total_appointments} turnos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedSuggested && <small style={{ color: 'var(--accent)', marginTop: 2, display: 'block' }}>✓ Cliente recurrente ({selectedSuggested.total_appointments} turnos previos)</small>}
              </div>
              <div className="dash-form-group">
                <label>Email</label>
                <input type="email" className="glass-input" value={newApptForm.clientEmail} onChange={e => setNewApptForm(p => ({ ...p, clientEmail: e.target.value }))} placeholder="cliente@email.com" />
              </div>
              <div className="dash-form-group">
                <label>Servicio *</label>
                <select className="glass-input" value={newApptForm.serviceId} onChange={e => setNewApptForm(p => ({ ...p, serviceId: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {servicesList.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name} (${s.price} - {s.duration}min)</option>
                  ))}
                </select>
              </div>
              {staffList.filter(s => s.active !== false).length > 0 && (
                <div className="dash-form-group">
                  <label>Peluquero</label>
                  <select className="glass-input" value={newApptForm.staffId} onChange={e => setNewApptForm(p => ({ ...p, staffId: e.target.value }))}>
                    <option value="">Cualquier peluquero</option>
                    {staffList.filter(s => s.active !== false).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="dash-form-group">
                <label>Fecha *</label>
                <input type="date" className="glass-input" min={new Date().toISOString().split('T')[0]} value={newApptForm.appointmentDate} onChange={e => setNewApptForm(p => ({ ...p, appointmentDate: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>Hora *</label>
                <input type="time" className="glass-input" value={newApptForm.appointmentTime} onChange={e => setNewApptForm(p => ({ ...p, appointmentTime: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>Notas</label>
                <textarea className="glass-input" value={newApptForm.notes} onChange={e => setNewApptForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notas opcionales..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setShowNewAppointment(false)}>Cancelar</button>
                <button className="dash-btn dash-btn-success" onClick={saveNewAppointment}>Crear Turno</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => { setSelectedClient(null); setClientHistory([]); }}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">Historial de {selectedClient.client_name}</h3>
              <button onClick={() => { setSelectedClient(null); setClientHistory([]); }} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div><strong>Teléfono:</strong> {selectedClient.client_phone}</div>
                <div><strong>Email:</strong> {selectedClient.client_email || '-'}</div>
                <div><strong>Total turnos:</strong> {selectedClient.total_appointments}</div>
              </div>
              {clientHistoryLoading ? (
                <div className="dash-loading">
                  <div className="dash-loading-spinner"></div>
                  Cargando historial...
                </div>
              ) : clientHistory.length === 0 ? (
                <p>Sin turnos registrados.</p>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>Fecha</th>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>Servicio</th>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>Staff</th>
                        <th style={{ textAlign: 'center', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientHistory.map(a => (
                        <tr key={a.id}>
                          <td style={{ padding: 10 }}>{new Date(a.appointment_date || a.date).toLocaleDateString('es-UY')} {a.time}</td>
                          <td style={{ padding: 10 }}>{a.service_name || a.service}</td>
                          <td style={{ padding: 10 }}>{a.staff_name || '-'}</td>
                          <td style={{ padding: 10, textAlign: 'center' }}>{getStatusBadge(a.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setSelectedAppointment(null)}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">Detalles del Turno</h3>
              <button onClick={() => setSelectedAppointment(null)} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-modal-info-grid">
                <div className="dash-info-group">
                  <label>Cliente</label>
                  <span>{selectedAppointment.client_name}</span>
                </div>
                <div className="dash-info-group">
                  <label>Servicio</label>
                  <span>{selectedAppointment.service_name || selectedAppointment.service || '-'}</span>
                </div>
                <div className="dash-info-group">
                  <label>Staff</label>
                  <span>{selectedAppointment.staff_name || '-'}</span>
                </div>
                <div className="dash-info-group">
                  <label>Fecha</label>
                  <span>{selectedAppointment.date}</span>
                </div>
                <div className="dash-info-group">
                  <label>Horario</label>
                  <span>{selectedAppointment.time}</span>
                </div>
                <div className="dash-info-group">
                  <label>Estado</label>
                  <span>{getStatusBadge(selectedAppointment.status)}</span>
                </div>
              </div>
              {(selectedAppointment.phone || selectedAppointment.client_phone) && (
                <div className="dash-modal-info-full">
                  <div className="dash-info-group">
                    <label>Teléfono</label>
                    <span>
                      <a href={`tel:${selectedAppointment.phone || selectedAppointment.client_phone}`} style={{ color: 'var(--primary-hover)', textDecoration: 'none', fontWeight: 600 }}>{selectedAppointment.phone || selectedAppointment.client_phone}</a>
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a href={`https://wa.me/${(selectedAppointment.phone || selectedAppointment.client_phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>💬 WhatsApp</a>
                  </div>
                </div>
              )}
              {selectedAppointment.email && (
                <div className="dash-modal-info-full">
                  <div className="dash-info-group">
                    <label>Email</label>
                    <span>{selectedAppointment.email}</span>
                  </div>
                </div>
              )}
              {selectedAppointment.notes && (
                <div className="dash-appointment-notes">{selectedAppointment.notes}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
