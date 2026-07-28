import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import type { TenantDetail, Invoice, Payment } from './types';

interface Props {
  tenantId: number | null;
  onClose: () => void;
  onReactivate: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  loadData: () => void;
}

type ModalTab = 'info' | 'invoices' | 'payments';

export default function TenantModal({ tenantId, onClose, onReactivate, showToast, loadData }: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<ModalTab>('info');
  const [reactivateMode, setReactivateMode] = useState<'extend_trial' | 'upgrade_pro'>('extend_trial');
  const [extendDays, setExtendDays] = useState(15);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState('');
  const [newInvoiceDesc, setNewInvoiceDesc] = useState('');

  useEffect(() => {
    if (tenantId === null) return;
    setActiveTab('info');
    setReactivateMode('extend_trial');
    setNewInvoiceAmount('');
    setNewInvoiceDesc('');
    api.get<{ tenant: TenantDetail }>(`/api/super-admin/tenants/${tenantId}`).then(r => setDetail(r.tenant)).catch(() => showToast(t('adminDashboard.toastLoadError'), 'error'));
    api.get<{ invoices: Invoice[] }>(`/api/super-admin/tenants/${tenantId}/invoices`).then(r => setInvoices(r.invoices || [])).catch(() => setInvoices([]));
    api.get<{ payments: Payment[] }>(`/api/super-admin/tenants/${tenantId}/payments`).then(r => setPayments(r.payments || [])).catch(() => setPayments([]));
  }, [tenantId]);

  if (tenantId === null) return null;

  const handleReactivate = async () => {
    if (!detail) return;
    const msg = reactivateMode === 'upgrade_pro'
      ? t('adminDashboard.confirmReactivateUpgrade', { name: detail.business_name })
      : t('adminDashboard.confirmReactivateExtend', { name: detail.business_name, days: extendDays });
    if (!window.confirm(msg)) return;
    try {
      const res = await api.post<{ message: string }>(`/api/super-admin/tenants/${tenantId}/reactivate`, { mode: reactivateMode, days: extendDays });
      showToast(res.message, 'success');
      onClose();
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    }
  };

  const handleSuspend = async () => {
    if (!detail) return;
    if (!window.confirm(t('adminDashboard.confirmSuspend', { name: detail.business_name }))) return;
    try {
      await api.put(`/api/super-admin/tenants/${tenantId}`, { status: 'suspended' });
      showToast(t('adminDashboard.toastAccountSuspended'), 'success');
      onClose();
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!window.confirm(t('adminDashboard.confirmDeletePermanent', { name: detail.business_name }))) return;
    const confirmStr = window.prompt(t('adminDashboard.confirmDeletePrompt'));
    if (confirmStr !== 'ELIMINAR') { showToast(t('adminDashboard.toastDeleted'), 'error'); return; }
    try {
      await api.delete(`/api/super-admin/tenants/${tenantId}`);
      showToast(t('adminDashboard.toastDeletedPermanent'), 'success');
      onClose();
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    }
  };

  const handlePayInvoiceMP = async (invoiceId: number) => {
    try {
      const res = await api.post<{ init_point: string }>('/api/payments/mercadopago/create', { invoiceId });
      if (res.init_point) window.location.href = res.init_point;
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    }
  };

  const handlePayInvoiceManual = async (invoiceId: number) => {
    try {
      const res = await api.put<{ message: string }>(`/api/super-admin/invoices/${invoiceId}/pay`, { payment_method: 'manual' });
      showToast(res.message, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/super-admin/invoices', {
        tenant_id: tenantId,
        amount: parseFloat(newInvoiceAmount),
        description: newInvoiceDesc,
      });
      showToast(t('adminDashboard.toastInvoiceCreated'), 'success');
      setNewInvoiceAmount('');
      setNewInvoiceDesc('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error'), 'error');
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>{detail?.business_name || t('adminDashboard.detailName')}</h2>
          <button className="admin-close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="admin-modal-tabs">
          <button className={`admin-modal-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>{t('adminDashboard.modalTabInfo')}</button>
          <button className={`admin-modal-tab ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>{t('adminDashboard.modalTabInvoices')}</button>
          <button className={`admin-modal-tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>{t('adminDashboard.modalTabPayments')}</button>
        </div>

        {activeTab === 'info' && detail && (
          <div>
            {detail.trial_expired && (
              <div className="admin-alert-expired">
                {t('adminDashboard.alertTrialExpired')}
              </div>
            )}
            <div className="admin-detail-grid">
              <div className="admin-detail-item"><label>{t('adminDashboard.detailName')}</label><span>{detail.business_name || '-'}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailSlug')}</label><span>{detail.slug || '-'}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailEmail')}</label><span>{detail.notification_email || '-'}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailPhone')}</label><span>{detail.business_phone || '-'}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailPlan')}</label><span>{(detail.plan || 'free').toUpperCase()}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailStatus')}</label><span>{detail.status || '-'}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailTrialEnd')}</label><span>{detail.trial_end_date ? new Date(detail.trial_end_date).toLocaleDateString() : t('adminDashboard.detailNoExpiry')}</span></div>
              <div className="admin-detail-item"><label>{t('adminDashboard.detailRegistered')}</label><span>{detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '-'}</span></div>
            </div>
            <div className="admin-actions-row">
              {!detail.trial_expired && detail.status !== 'suspended' && (
                <button className="admin-btn admin-btn-warning admin-btn-sm" onClick={handleSuspend}>{t('adminDashboard.suspendButton')}</button>
              )}
              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={handleDelete}>{t('adminDashboard.deleteButton')}</button>
            </div>
            {(detail.trial_expired || detail.status === 'suspended') && (
              <div className="admin-reactivation-box">
                <h4>{t('adminDashboard.reactivateTitle')}</h4>
                <div className="admin-reactivation-options">
                  <label className={`admin-reactivation-option ${reactivateMode === 'extend_trial' ? 'selected' : ''}`} onClick={() => setReactivateMode('extend_trial')}>
                    <input type="radio" name="reactivateMode" checked={reactivateMode === 'extend_trial'} onChange={() => setReactivateMode('extend_trial')} />
                    <div className="admin-reactivation-option-label">
                      <strong>{t('adminDashboard.reactivateExtendTrial')}</strong>
                      <span>{t('adminDashboard.reactivateExtendTrialDesc')}</span>
                    </div>
                  </label>
                  <label className={`admin-reactivation-option ${reactivateMode === 'upgrade_pro' ? 'selected' : ''}`} onClick={() => setReactivateMode('upgrade_pro')}>
                    <input type="radio" name="reactivateMode" checked={reactivateMode === 'upgrade_pro'} onChange={() => setReactivateMode('upgrade_pro')} />
                    <div className="admin-reactivation-option-label">
                      <strong>{t('adminDashboard.reactivateUpgradePro')}</strong>
                      <span>{t('adminDashboard.reactivateUpgradeProDesc')}</span>
                    </div>
                  </label>
                </div>
                {reactivateMode === 'extend_trial' && (
                  <div className="admin-days-input-row">
                    <input type="number" value={extendDays} min="1" max="365" onChange={e => setExtendDays(parseInt(e.target.value) || 15)} />
                    <label>{t('adminDashboard.reactivateDaysLabel', { days: extendDays })}</label>
                  </div>
                )}
                <div className="admin-reactivate-action">
                  <button className="admin-btn admin-btn-reactivate" onClick={handleReactivate}>{t('adminDashboard.reactivateNowButton')}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h3 className="admin-section-title">{t('adminDashboard.paymentsTitle')}</h3>
            <table className="admin-small-table">
              <thead>
                <tr><th>{t('adminDashboard.paymentsTableID')}</th><th>{t('adminDashboard.paymentsTableInvoice')}</th><th>{t('adminDashboard.paymentsTableAmount')}</th><th>{t('adminDashboard.paymentsTableCurrency')}</th><th>{t('adminDashboard.paymentsTableStatus')}</th><th>{t('adminDashboard.paymentsTableDate')}</th></tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="admin-empty-row">{t('adminDashboard.paymentsEmpty')}</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td className="admin-muted">{p.mp_payment_id || p.id}</td>
                    <td>{p.invoice_number || '-'}</td>
                    <td className="admin-bold">${parseFloat(String(p.amount)).toLocaleString()}</td>
                    <td className="admin-muted">{p.currency}</td>
                    <td><span className={`admin-badge ${p.status === 'approved' ? 'admin-badge-active' : p.status === 'pending' ? 'admin-badge-expired' : 'admin-badge-suspended'}`}>{p.status}</span></td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h3 className="admin-section-title">{t('adminDashboard.invoicesTitle')}</h3>
            <table className="admin-small-table">
              <thead>
                <tr><th>{t('adminDashboard.invoicesTableNumber')}</th><th>{t('adminDashboard.invoicesTableAmount')}</th><th>{t('adminDashboard.invoicesTableStatus')}</th><th>{t('adminDashboard.invoicesTableMethod')}</th><th>{t('adminDashboard.invoicesTableDate')}</th><th>{t('adminDashboard.invoicesTableAction')}</th></tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="admin-empty-row">{t('adminDashboard.invoicesEmpty')}</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td>
                    <td className="admin-bold">${parseFloat(String(inv.amount)).toLocaleString()}</td>
                    <td><span className={`admin-badge ${inv.status === 'paid' ? 'admin-badge-active' : 'admin-badge-expired'}`}>{inv.status === 'paid' ? t('adminDashboard.invoiceStatusPaid') : t('adminDashboard.invoiceStatusPending')}</span></td>
                    <td className="admin-muted">{inv.payment_method || '-'}</td>
                    <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td>
                      {inv.status !== 'paid' && (
                        <>
                          <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => handlePayInvoiceMP(inv.id)}>{t('adminDashboard.invoicePayMP')}</button>
                          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => handlePayInvoiceManual(inv.id)}>{t('adminDashboard.invoicePayManual')}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="admin-section-title">{t('adminDashboard.newInvoiceTitle')}</h3>
            <form className="admin-invoice-form" onSubmit={handleCreateInvoice}>
              <div className="admin-full-width">
                <label>{t('adminDashboard.newInvoiceAmountLabel')}</label>
                <input type="number" value={newInvoiceAmount} required step="0.01" placeholder={t('adminDashboard.newInvoiceAmountPlaceholder')} onChange={e => setNewInvoiceAmount(e.target.value)} />
              </div>
              <div className="admin-full-width">
                <label>{t('adminDashboard.newInvoiceDescLabel')}</label>
                <input type="text" value={newInvoiceDesc} placeholder={t('adminDashboard.newInvoiceDescPlaceholder')} onChange={e => setNewInvoiceDesc(e.target.value)} />
              </div>
              <div className="admin-full-width admin-form-action">
                <button type="submit" className="admin-btn admin-btn-primary">{t('adminDashboard.newInvoiceCreateButton')}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
