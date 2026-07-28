import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import { exportInvoicePdf } from '../../../../utils/invoicePdf';

export default function BillingTab() {
  const { t } = useTranslation();
  const { plan, invoices, settings, loadInvoices } = useDashboard();
  const { subscribeToPlan, handlePayInvoice } = useDashboardCRUD();

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      {plan ? (
        <div className="glass-panel" style={{ marginBottom: 20, padding: 20, border: '1px solid rgba(197,168,128,0.35)' }}>
          <h3 className="text-gradient" style={{ margin: '0 0 8px' }}>{t('staffDashboard.billingYourPlan')}</h3>
          <p style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>
            {plan.plan && plan.status ? t('staffDashboard.billingPlanInfo', { plan: plan.plan, status: plan.status }) : t('staffDashboard.notAvailable')}
          </p>
          {plan.status !== 'active' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>{t('staffDashboard.billingPlanPro')}</button>
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>{t('staffDashboard.billingPlanEnterprise')}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ marginBottom: 20, padding: 20, border: '1px solid rgba(197,168,128,0.35)' }}>
          <h3 className="text-gradient" style={{ margin: '0 0 8px' }}>{t('staffDashboard.billingYourPlan')}</h3>
          <p style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>{t('staffDashboard.notAvailable')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>{t('staffDashboard.billingPlanPro')}</button>
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>{t('staffDashboard.billingPlanEnterprise')}</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t('staffDashboard.billingTitle')}</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>{t('staffDashboard.billingDescription')}</p>
        </div>
        <button className="dash-btn dash-btn-success" onClick={() => loadInvoices()}>{t('staffDashboard.billingRefresh')}</button>
      </div>
      {invoices.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.billingEmptyTitle')}</h3>
          <p>{t('staffDashboard.billingEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
          <table className="dash-invoice-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableNumber')}</th>
                <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableAmount')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableDue')}</th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableStatus')}</th>
                <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableAction')}</th>
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
                      <button className="dash-btn dash-btn-success" onClick={() => handlePayInvoice(inv.id)}>{t('staffDashboard.invoicePayButton')}</button>
                    )}
                    <button className="dash-btn" onClick={() => exportInvoicePdf(inv, settings)}>{t('staffDashboard.invoiceDownloadPdf')}</button>
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
