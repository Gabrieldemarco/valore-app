import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../services/logger';

import '../../styles/auth.css';
import '../../styles/admin.css';

interface Tenant {
  id: number;
  business_name: string;
  slug: string;
  notification_email: string;
  plan: string;
  status: string;
  trial_end_date: string | null;
  created_at: string;
}

interface TenantDetail extends Tenant {
  business_phone: string;
  trial_expired: boolean;
  trial_days_left: number;
  [key: string]: unknown;
}

interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  status: string;
  issue_date: string;
  payment_method: string | null;
  paid_date: string | null;
}

interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  currency: string;
  method: string;
  mp_payment_id: string | null;
  status: string;
  created_at: string;
  invoice_number: string | null;
  invoice_description: string | null;
}

interface Stats {
  totalInvoiced: number;
  activeTenants: number;
  pendingInvoices: number;
}

export default function AdminDashboard() {
  const { superAdminToken, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [apiError, setApiError] = useState('');

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [modalTab, setModalTab] = useState<'info' | 'invoices' | 'payments'>('info');
  const [reactivateMode, setReactivateMode] = useState<'extend_trial' | 'upgrade_pro'>('extend_trial');
  const [extendDays, setExtendDays] = useState(15);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState('');
  const [newInvoiceDesc, setNewInvoiceDesc] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [twilioConfig, setTwilioConfig] = useState({ account_sid: '', auth_token: '', from: '' });

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  useEffect(() => {
    if (!superAdminToken) navigate('/admin/login');
  }, [superAdminToken, navigate]);

  const loadData = useCallback(() => {
    setApiError('');
    api.get<Stats>('/api/super-admin/stats/billing').then(setStats).catch((e: Error) => setApiError(e.message || 'Error al cargar estadísticas'));
    api.get<{ tenants: Tenant[] }>('/api/super-admin/tenants').then(r => setTenants(r.tenants)).catch((e: Error) => setApiError(e.message || 'Error al cargar peluquerías'));
    api.get<{ config: Record<string, any> }>('/api/super-admin/config').then(r => {
      if (r.config?.twilio) setTwilioConfig(r.config.twilio);
    }).catch(() => {});
  }, []);

  useEffect(loadData, [loadData]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const openModal = async (id: number) => {
    setSelectedTenantId(id);
    setModalTab('info');
    setReactivateMode('extend_trial');
    setNewInvoiceAmount('');
    setNewInvoiceDesc('');
    try {
      const res = await api.get<{ tenant: TenantDetail }>(`/api/super-admin/tenants/${id}`);
      setTenantDetail(res.tenant);
    } catch {
      showToast('Error al cargar detalles', 'error');
    }
    loadInvoices(id);
    loadPayments(id);
  };

  const closeModal = () => {
    setSelectedTenantId(null);
    setTenantDetail(null);
    setInvoices([]);
    setPayments([]);
  };

  const loadInvoices = async (id: number) => {
    try {
      const res = await api.get<{ invoices: Invoice[] }>(`/api/super-admin/tenants/${id}/invoices`);
      setInvoices(res.invoices || []);
    } catch {
      setInvoices([]);
    }
  };

  const loadPayments = async (id: number) => {
    try {
      const res = await api.get<{ payments: Payment[] }>(`/api/super-admin/tenants/${id}/payments`);
      setPayments(res.payments || []);
    } catch {
      setPayments([]);
    }
  };

  const handleReactivate = async () => {
    if (!selectedTenantId || !tenantDetail) return;
    const msg = reactivateMode === 'upgrade_pro'
      ? `¿Reactivar y cambiar a plan PRO la cuenta de "${tenantDetail.business_name}"?`
      : `¿Reactivar "${tenantDetail.business_name}" con ${extendDays} días adicionales de prueba gratuita?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await api.post<{ message: string }>(`/api/super-admin/tenants/${selectedTenantId}/reactivate`, {
        mode: reactivateMode,
        days: extendDays,
      });
      showToast(res.message, 'success');
      closeModal();
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleSuspend = async () => {
    if (!selectedTenantId || !tenantDetail) return;
    if (!window.confirm(`¿Suspender la cuenta de "${tenantDetail.business_name}"? Perderán acceso inmediato.`)) return;
    try {
      await api.put(`/api/super-admin/tenants/${selectedTenantId}`, { status: 'suspended' });
      showToast('Cuenta suspendida', 'success');
      closeModal();
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const { t } = useTranslation();
  const handleDelete = async () => {
    if (!selectedTenantId || !tenantDetail) return;
    if (!window.confirm(t('adminDashboard.confirmDeletePermanent', { name: tenantDetail.business_name }))) return;
    const confirmStr = window.prompt(t('adminDashboard.confirmDeletePrompt'));
    if (confirmStr !== 'ELIMINAR') { showToast(t('adminDashboard.toastDeleted'), 'error'); return; }
    try {
      await api.delete(`/api/super-admin/tenants/${selectedTenantId}`);
      showToast('Peluquería eliminada permanentemente', 'success');
      closeModal();
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handlePayInvoiceMP = async (invoiceId: number) => {
    try {
      const res = await api.post<{ init_point: string }>('/api/payments/mercadopago/create', { invoiceId });
      if (res.init_point) window.location.href = res.init_point;
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handlePayInvoiceManual = async (invoiceId: number) => {
    try {
      const res = await api.put<{ message: string }>(`/api/super-admin/invoices/${invoiceId}/pay`, { payment_method: 'manual' });
      showToast(res.message, 'success');
      if (selectedTenantId) loadInvoices(selectedTenantId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    try {
      await api.post('/api/super-admin/invoices', {
        tenant_id: selectedTenantId,
        amount: parseFloat(newInvoiceAmount),
        description: newInvoiceDesc,
      });
      showToast('Factura creada', 'success');
      setNewInvoiceAmount('');
      setNewInvoiceDesc('');
      loadInvoices(selectedTenantId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
  };

  const handleSaveTwilio = async () => {
    try {
      await api.put('/api/super-admin/config', { key: 'twilio', value: twilioConfig });
      showToast('Configuración de Twilio guardada', 'success');
    } catch { showToast('Error al guardar Twilio', 'error'); }
  };

  const handleSetTrial = async (id: number) => {
    if (!window.confirm('¿Poner esta cuenta en trial por 15 días? Se reseteará a plan free y se activará inmediatamente.')) return;
    try {
      await api.post(`/api/super-admin/tenants/${id}/set-trial`, { days: 15 });
      showToast('Cuenta puesta en trial correctamente', 'success');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al poner en trial', 'error');
    }
  };

  const filtered = tenants.filter(t =>
    t.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.notification_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();

  return (
    <div className="admin-view">
      {toastMsg && (
        <div className="toast-container" style={{ display: 'block' }}>
          <div className={`toast ${toastType}`}>
            <span className="toast-msg">{toastMsg}</span>
          </div>
        </div>
      )}

      <header className="header">
        <h1>Panel de Administración</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="text"
            placeholder="Buscar salón..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'rgba(10,10,16,0.9)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#e2e8f0',
              padding: '9px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "'Outfit', sans-serif",
              minWidth: 180,
            }}
          />
          <button onClick={handleLogout} className="btn btn-primary">Cerrar sesión</button>
        </div>
      </header>

      <div className="container">
        {stats && (
          <div className="stats">
            <div className="stat-card success">
              <div className="stat-label">Activos</div>
              <div className="stat-value">{stats.activeTenants}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">Facturas Pendientes</div>
              <div className="stat-value">{stats.pendingInvoices}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Facturado Total</div>
              <div className="stat-value">${stats.totalInvoiced.toLocaleString()}</div>
            </div>
          </div>
        )}

        {apiError && (
          <div className="alert-expired" style={{ marginBottom: 16 }}>{apiError}</div>
        )}

        <div className="table-wrapper">
          <div className="table-header">
            <h2>Peluquerías</h2>
            <span className="table-count">{filtered.length} registros</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Slug</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Trial / Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const trialEnd = t.trial_end_date ? new Date(t.trial_end_date) : null;
                const isExpired = t.plan === 'free' && trialEnd && !isNaN(trialEnd.getTime()) && trialEnd < now;
                const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000) : null;

                let trialBadge: React.ReactNode = <span className="badge badge-free">-</span>;
                if (trialEnd && !isNaN(trialEnd.getTime())) {
                  if (isExpired) {
                    trialBadge = <span className="badge badge-expired">Vencido</span>;
                  } else if (daysLeft !== null && daysLeft <= 3) {
                    trialBadge = <span className="badge badge-suspended">{daysLeft} días</span>;
                  } else {
                    trialBadge = <span className="badge badge-active">{daysLeft} días</span>;
                  }
                } else if (t.plan === 'pro' || t.plan === 'enterprise') {
                  trialBadge = <span className="badge badge-pro">Sin límite</span>;
                }

                const planBadge = t.plan === 'pro' || t.plan === 'enterprise'
                  ? <span className="badge badge-pro">{t.plan}</span>
                  : <span className="badge badge-free">Free</span>;

                let statusBadge: React.ReactNode;
                if (t.status === 'suspended') {
                  statusBadge = <span className="badge badge-suspended">Suspendida</span>;
                } else if (isExpired) {
                  statusBadge = <span className="badge badge-expired">Trial Vencido</span>;
                } else {
                  statusBadge = <span className="badge badge-active">Activa</span>;
                }

                return (
                  <tr key={t.id}>
                    <td><strong style={{ color: '#e2e8f0' }}>{t.business_name || '-'}</strong></td>
                    <td><span style={{ fontSize: 12, color: '#64748b' }}>{t.slug}</span></td>
                    <td>{planBadge}</td>
                    <td>{statusBadge}</td>
                    <td>{trialBadge}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => openModal(t.id)}>Ver</button>
                      <button className="btn btn-warning btn-sm" style={{ marginLeft: 4 }} onClick={() => handleSetTrial(t.id)}>Poner en Trial</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No se encontraron peluquerías</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrapper" style={{ marginTop: 24 }}>
          <div className="table-header">
            <h2>Configuración Global</h2>
          </div>
          <div style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14, color: '#e2e8f0' }}>💬 Twilio (WhatsApp)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Account SID</label>
                <input type="text" value={twilioConfig.account_sid} onChange={e => setTwilioConfig(p => ({ ...p, account_sid: e.target.value }))} placeholder="ACxxxxxxxxxx" style={{ background: 'rgba(10,10,16,0.9)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0', padding: '9px 14px', borderRadius: 8, fontSize: 13, width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Auth Token</label>
                <input type="password" value={twilioConfig.auth_token} onChange={e => setTwilioConfig(p => ({ ...p, auth_token: e.target.value }))} placeholder="••••••••" style={{ background: 'rgba(10,10,16,0.9)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0', padding: '9px 14px', borderRadius: 8, fontSize: 13, width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Número WhatsApp (from)</label>
                <input type="text" value={twilioConfig.from} onChange={e => setTwilioConfig(p => ({ ...p, from: e.target.value }))} placeholder="whatsapp:+14155238886" style={{ background: 'rgba(10,10,16,0.9)', border: '1px solid rgba(99,102,241,0.2)', color: '#e2e8f0', padding: '9px 14px', borderRadius: 8, fontSize: 13, width: '100%' }} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveTwilio}>Guardar Twilio</button>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLES */}
      {selectedTenantId !== null && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tenantDetail?.business_name || 'Detalles'}</h2>
              <button className="close-modal" onClick={closeModal}>&times;</button>
            </div>

            <div className="modal-tabs">
              <button className={`modal-tab ${modalTab === 'info' ? 'active' : ''}`} onClick={() => setModalTab('info')}>Info</button>
              <button className={`modal-tab ${modalTab === 'invoices' ? 'active' : ''}`} onClick={() => setModalTab('invoices')}>Facturas</button>
              <button className={`modal-tab ${modalTab === 'payments' ? 'active' : ''}`} onClick={() => setModalTab('payments')}>Pagos MP</button>
            </div>

            {/* TAB INFO */}
            {modalTab === 'info' && tenantDetail && (
              <div>
                {tenantDetail.trial_expired && (
                  <div className="alert-expired">
                    El período de prueba de esta cuenta ha <strong>vencido</strong>. El servicio está suspendido para este cliente.
                  </div>
                )}

                <div className="detail-grid">
                  <div className="detail-item"><label>Nombre</label><span>{tenantDetail.business_name || '-'}</span></div>
                  <div className="detail-item"><label>Slug</label><span>{tenantDetail.slug || '-'}</span></div>
                  <div className="detail-item"><label>Email</label><span>{tenantDetail.notification_email || '-'}</span></div>
                  <div className="detail-item"><label>Teléfono</label><span>{tenantDetail.business_phone || '-'}</span></div>
                  <div className="detail-item"><label>Plan</label><span>{(tenantDetail.plan || 'free').toUpperCase()}</span></div>
                  <div className="detail-item"><label>Estado</label><span>{tenantDetail.status || '-'}</span></div>
                  <div className="detail-item"><label>Fin del Trial</label><span>{tenantDetail.trial_end_date ? new Date(tenantDetail.trial_end_date).toLocaleDateString() : 'Sin vencimiento'}</span></div>
                  <div className="detail-item"><label>Registrado</label><span>{tenantDetail.created_at ? new Date(tenantDetail.created_at).toLocaleDateString() : '-'}</span></div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button className="btn btn-warning btn-sm" onClick={handleSuspend} style={tenantDetail.trial_expired || tenantDetail.status === 'suspended' ? { display: 'none' } : {}}>Suspender</button>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>Eliminar</button>
                </div>

                {(tenantDetail.trial_expired || tenantDetail.status === 'suspended') && (
                  <div className="reactivation-box">
                    <h4>Reactivar Cuenta</h4>
                    <div className="reactivation-options">
                      <label className={`reactivation-option ${reactivateMode === 'extend_trial' ? 'selected' : ''}`} onClick={() => setReactivateMode('extend_trial')}>
                        <input type="radio" name="reactivateMode" value="extend_trial" checked={reactivateMode === 'extend_trial'} onChange={() => setReactivateMode('extend_trial')} />
                        <div className="reactivation-option-label">
                          <strong>Extender período de prueba</strong>
                          <span>Dar N días adicionales de plan gratuito</span>
                        </div>
                      </label>
                      <label className={`reactivation-option ${reactivateMode === 'upgrade_pro' ? 'selected' : ''}`} onClick={() => setReactivateMode('upgrade_pro')}>
                        <input type="radio" name="reactivateMode" value="upgrade_pro" checked={reactivateMode === 'upgrade_pro'} onChange={() => setReactivateMode('upgrade_pro')} />
                        <div className="reactivation-option-label">
                          <strong>Activar plan Pro</strong>
                          <span>Sin límite de tiempo, acceso completo</span>
                        </div>
                      </label>
                    </div>
                    {reactivateMode === 'extend_trial' && (
                      <div className="days-input-row">
                        <input type="number" value={extendDays} min="1" max="365" onChange={e => setExtendDays(parseInt(e.target.value) || 15)} />
                        <label>días adicionales de prueba gratuita</label>
                      </div>
                    )}
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <button className="btn btn-reactivate" onClick={handleReactivate}>Reactivar Ahora</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB PAGOS MP */}
            {modalTab === 'payments' && (
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 14, color: '#e2e8f0' }}>Pagos por MercadoPago</h3>
                <table className="small-table">
                  <thead>
                    <tr><th>ID Pago</th><th>Factura</th><th>Monto</th><th>Moneda</th><th>Estado MP</th><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Sin pagos por MercadoPago</td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontSize: 12, color: '#94a3b8' }}>{p.mp_payment_id || p.id}</td>
                        <td>{p.invoice_number || '-'}</td>
                        <td style={{ fontWeight: 700 }}>${parseFloat(String(p.amount)).toLocaleString()}</td>
                        <td style={{ fontSize: 12, color: '#94a3b8' }}>{p.currency}</td>
                        <td><span className={`badge ${p.status === 'approved' ? 'badge-active' : p.status === 'pending' ? 'badge-expired' : 'badge-suspended'}`}>{p.status}</span></td>
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB FACTURAS */}
            {modalTab === 'invoices' && (
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 14, color: '#e2e8f0' }}>Historial de Facturas</h3>
                <table className="small-table">
                  <thead>
                    <tr><th>Nro</th><th>Monto</th><th>Estado</th><th>Método</th><th>Fecha</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Sin facturas</td></tr>
                    ) : invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>{inv.invoice_number}</td>
                        <td style={{ fontWeight: 700 }}>${parseFloat(String(inv.amount)).toLocaleString()}</td>
                        <td><span className={`badge ${inv.status === 'paid' ? 'badge-active' : 'badge-expired'}`}>{inv.status === 'paid' ? 'Pagada' : 'Pendiente'}</span></td>
                        <td style={{ fontSize: 12, color: '#94a3b8' }}>{inv.payment_method || '-'}</td>
                        <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                        <td>{inv.status !== 'paid' ? <><button className="btn btn-success btn-sm" onClick={() => handlePayInvoiceMP(inv.id)}>MP</button><button className="btn btn-primary btn-sm" style={{ marginLeft: 4 }} onClick={() => handlePayInvoiceManual(inv.id)}>Manual</button></> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 14, color: '#e2e8f0' }}>Nueva Factura</h3>
                <form className="invoice-form" onSubmit={handleCreateInvoice}>
                  <div className="full-width">
                    <label>Monto ($)</label>
                    <input type="number" value={newInvoiceAmount} required step="0.01" placeholder="0.00" onChange={e => setNewInvoiceAmount(e.target.value)} />
                  </div>
                  <div className="full-width">
                    <label>Descripción</label>
                    <input type="text" value={newInvoiceDesc} placeholder="Ej: Plan Mensual Pro" onChange={e => setNewInvoiceDesc(e.target.value)} />
                  </div>
                  <div className="full-width" style={{ textAlign: 'right' }}>
                    <button type="submit" className="btn btn-primary">Crear Factura</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
