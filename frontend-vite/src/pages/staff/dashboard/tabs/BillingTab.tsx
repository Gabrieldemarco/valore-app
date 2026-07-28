import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import { exportInvoicePdf } from '../../../../utils/invoicePdf';

export default function BillingTab() {
  const { t } = useTranslation();
  const { plan, invoices, settings, loadInvoices } = useDashboard();
  const { subscribeToPlan, handlePayInvoice } = useDashboardCRUD();

  return (
    <div className="glass-panel mt-24 p-24">
      {plan ? (
        <div className="glass-panel mb-20 p-20" style={{ border: '1px solid rgba(197,168,128,0.35)' }}>
          <h3 className="text-gradient m-0 mb-8">{t('staffDashboard.billingYourPlan')}</h3>
          <p className="text-muted m-0 mb-14">
            {plan.plan && plan.status ? t('staffDashboard.billingPlanInfo', { plan: plan.plan, status: plan.status }) : t('staffDashboard.notAvailable')}
          </p>
          {plan.status !== 'active' && (
            <div className="flex flex-wrap gap-16 mt-16">
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>{t('staffDashboard.billingPlanPro')}</button>
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>{t('staffDashboard.billingPlanEnterprise')}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel mb-20 p-20" style={{ border: '1px solid rgba(197,168,128,0.35)' }}>
          <h3 className="text-gradient m-0 mb-8">{t('staffDashboard.billingYourPlan')}</h3>
          <p className="text-muted m-0 mb-14">{t('staffDashboard.notAvailable')}</p>
          <div className="flex flex-wrap gap-16 mt-16">
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>{t('staffDashboard.billingPlanPro')}</button>
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>{t('staffDashboard.billingPlanEnterprise')}</button>
          </div>
        </div>
      )}
      <div className="flex-between gap-16 mb-18">
        <div>
          <h3 className="m-0">{t('staffDashboard.billingTitle')}</h3>
          <p className="text-muted m-0 mt-6">{t('staffDashboard.billingDescription')}</p>
        </div>
        <button className="dash-btn dash-btn-success" onClick={() => loadInvoices()}>{t('staffDashboard.billingRefresh')}</button>
      </div>
      {invoices.length === 0 ? (
        <div className="dash-empty-state glass-panel">
          <h3 className="text-gradient">{t('staffDashboard.billingEmptyTitle')}</h3>
          <p>{t('staffDashboard.billingEmptyMessage')}</p>
        </div>
      ) : (
        <div className="dash-table-responsive overflow-x-auto">
          <table className="dash-invoice-table table-full">
            <thead>
              <tr>
                <th className="table-cell-left">{t('staffDashboard.invoiceTableNumber')}</th>
                <th className="table-cell-right">{t('staffDashboard.invoiceTableAmount')}</th>
                <th className="table-cell-left">{t('staffDashboard.invoiceTableDue')}</th>
                <th className="table-cell-left">{t('staffDashboard.invoiceTableStatus')}</th>
                <th className="table-cell-center">{t('staffDashboard.invoiceTableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="table-cell-pad">#{inv.id}</td>
                  <td className="table-cell-pad-right">${inv.amount}</td>
                  <td className="table-cell-pad">{inv.due_date}</td>
                  <td className="table-cell-pad"><span className={`dash-appointment-status dash-status-${inv.status}`}>{inv.status}</span></td>
                  <td className="table-cell-pad-center">
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
