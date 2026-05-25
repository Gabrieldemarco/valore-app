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
}

interface TenantSettings {
  business_name: string;
  business_phone: string;
  business_address: string;
  notification_email: string;
  notification_whatsapp: string;
  smtp_email?: string;
  smtp_password?: string;
}

type Tab = 'list' | 'calendar' | 'billing';

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
  const [selectedStaff, setSelectedStaff] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterPhone, setFilterPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

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
      const data = await api.get<{ appointments: Appointment[] }>(`/api/appointments?${params}`);
      setAppointments(data.appointments);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filterStatus, filterDate, selectedStaff]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  useEffect(() => {
    api.get<{ tenant: TenantSettings }>('/api/tenant/me').then(d => setSettings(d.tenant)).catch(() => {});
    api.get<{ tenant: PlanInfo }>('/api/tenant/plan').then(d => setPlan(d.tenant)).catch(() => {});
    api.get<{ invoices: Invoice[] }>('/api/tenant/invoices').then(d => setInvoices(d.invoices)).catch(() => {});
    api.get<{ staff: StaffMember[] }>('/api/tenant/staff').then(d => setStaffList(d.staff)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') { addToast('Pago exitoso. Tu plan está activo.', 'success'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'failure') { addToast('El pago no pudo completarse. Intentá de nuevo.', 'error'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'pending') { addToast('Pago pendiente. Te avisaremos cuando se acredite.', 'success'); window.history.replaceState({}, '', window.location.pathname); }
    const billing = params.get('billing');
    if (billing === '1') setActiveTab('billing');
  }, []);

  const updateStatus = async (id: number, status: string) => {
    const labels: Record<string, string> = { completed: 'completar', cancelled: 'cancelar', confirmed: 'confirmar' };
    if (!confirm(`¿Estás seguro de ${labels[status] || status} este turno?`)) return;
    try {
      await api.put(`/api/appointments/${id}/status`, { status });
      addToast('Estado actualizado', 'success');
      loadAppointments();
    } catch { addToast('Error al actualizar', 'error'); }
  };

  const saveSettings = async () => {
    try {
      await api.put('/api/tenant/settings', settings);
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
          {(['list', 'calendar', 'billing'] as Tab[]).map(tab => (
            <button key={tab} className={`dash-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'list' ? '📋 Lista' : tab === 'calendar' ? '📆 Calendario' : '💳 Facturación'}
            </button>
          ))}
          <button className="dash-tab" onClick={exportToCSV}>📥 Exportar CSV</button>
        </div>

        {staffList.length > 0 && (
          <div id="dashStaffFilterContainer" className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '20px 0', padding: 16 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Ver agenda de:</span>
            <div id="dashStaffFilterButtons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className={`dash-staff-filter-btn${selectedStaff === '' ? ' active' : ''}`} onClick={() => setSelectedStaff('')}>Todos</button>
              {staffList.map(s => (
                <button key={s.id} className={`dash-staff-filter-btn${selectedStaff === s.id ? ' active' : ''}`} onClick={() => setSelectedStaff(s.id)}>{s.name}</button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <>
            <div className="dash-filters glass-panel">
              <div className="dash-filter-group">
                <label>Fecha</label>
                <input type="date" className="glass-input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
              </div>
              <div className="dash-filter-group">
                <label>Estado</label>
                <select className="glass-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
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
      </div>

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
