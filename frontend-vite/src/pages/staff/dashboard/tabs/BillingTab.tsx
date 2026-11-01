import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Wallet } from 'lucide-react';
import { useDashboard } from '../dashboardContext';
import { useDashboardCRUD } from '../../dashboard/useDashboardCRUD';
import { exportInvoicePdf } from '../../../../utils/invoicePdf';

const INVOICE_STATUS_TRANSLATION_KEYS: Record<string, string> = {
  paid: 'invoiceStatusPaid',
  pending: 'invoiceStatusPending',
  cancelled: 'invoiceStatusCancelled',
  overdue: 'invoiceStatusOverdue',
};

export default function BillingTab() {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<'mercadopago' | 'stripe'>('mercadopago');
  const { plan, invoices, settings, loadInvoices } = useDashboard();
  const { subscribeToPlan, handlePayInvoice } = useDashboardCRUD();

  return (
    <div className="glass-panel mt-24 p-24">
      <div className="flex-between gap-16 mb-18">
        <div>
          <h3 className="text-gradient m-0">{t('staffDashboard.billingTitle')}</h3>
          <p className="text-muted m-0 mt-6">{t('staffDashboard.billingDescription')}</p>
        </div>
      </div>
      <div className="billing-provider-picker">
        <div className="billing-provider-copy">
          <h4>{t('staffDashboard.billingPaymentMethod')}</h4>
          <p>{t('staffDashboard.billingProviderHint')}</p>
        </div>
        <div className="billing-provider-options" role="radiogroup" aria-label={t('staffDashboard.billingPaymentMethod')}>
          <button
            type="button"
            role="radio"
            aria-checked={provider === 'mercadopago'}
            tabIndex={provider === 'mercadopago' ? 0 : -1}
            data-provider="mercadopago"
            className={`billing-provider-option${provider === 'mercadopago' ? ' selected' : ''}`}
            onClick={() => setProvider('mercadopago')}
            onKeyDown={event => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                setProvider('stripe');
                event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-provider="stripe"]')?.focus();
              }
            }}
          >
            <Wallet size={21} aria-hidden="true" />
            <span className="billing-provider-details">
              <strong>Mercado Pago</strong>
              <small>{t('staffDashboard.billingLocalCurrency')}</small>
            </span>
            <span className="billing-provider-currency">UYU</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={provider === 'stripe'}
            tabIndex={provider === 'stripe' ? 0 : -1}
            data-provider="stripe"
            className={`billing-provider-option${provider === 'stripe' ? ' selected' : ''}`}
            onClick={() => setProvider('stripe')}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                setProvider('mercadopago');
                event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-provider="mercadopago"]')?.focus();
              }
            }}
          >
            <CreditCard size={21} aria-hidden="true" />
            <span className="billing-provider-details">
              <strong>Stripe</strong>
              <small>{t('staffDashboard.billingDollars')}</small>
            </span>
            <span className="billing-provider-currency">USD</span>
          </button>
        </div>
      </div>
      {plan ? (
        <div className="glass-panel mb-20 p-20" style={{ border: '1px solid rgba(197,168,128,0.35)' }}>
          <h3 className="text-gradient m-0 mb-8">{t('staffDashboard.billingYourPlan')}</h3>
          <div className="dash-plan-badges">
            <span className={`dash-plan-badge dash-plan-${plan.plan}`}>{plan.plan.toUpperCase()}</span>
            <span className={`dash-plan-badge dash-plan-status-${plan.status}`}>{t(`staffDashboard.billingStatus_${plan.status}`, plan.status)}</span>
          </div>
          {plan.last_payment_date && (
            <p className="text-muted m-0 mt-8">{t('staffDashboard.billingLastPayment', { date: new Date(plan.last_payment_date).toLocaleDateString() })}</p>
          )}
          {plan.plan === 'free' && plan.trialDaysLeft != null && (
            <p className="text-muted m-0 mt-8">{t('staffDashboard.billingTrialDays', { days: plan.trialDaysLeft })}</p>
          )}
          {plan.plan !== 'premium' && (
            <div className="flex flex-wrap gap-16 mt-16">
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('basico', provider)}>{t('staffDashboard.billingPlanBasic')}</button>
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('estandar', provider)}>{t('staffDashboard.billingPlanEstandar')}</button>
              <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('premium', provider)}>{t('staffDashboard.billingPlanPremium')}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel mb-20 p-20" style={{ border: '1px solid rgba(197,168,128,0.35)' }}>
          <h3 className="text-gradient m-0 mb-8">{t('staffDashboard.billingYourPlan')}</h3>
          <p className="text-muted m-0 mb-14">{t('staffDashboard.notAvailable')}</p>
          <div className="flex flex-wrap gap-16 mt-16">
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('basico', provider)}>{t('staffDashboard.billingPlanBasic')}</button>
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('estandar', provider)}>{t('staffDashboard.billingPlanEstandar')}</button>
            <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('premium', provider)}>{t('staffDashboard.billingPlanPremium')}</button>
          </div>
        </div>
      )}
      <div className="flex-between gap-16 mb-18 billing-invoices-heading">
        <h3 className="m-0">{t('staffDashboard.invoiceTableNumber')}</h3>
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
                  <td className="table-cell-pad">
                    <span className={`dash-appointment-status dash-status-${inv.status}`}>
                      {INVOICE_STATUS_TRANSLATION_KEYS[inv.status]
                        ? t(`staffDashboard.${INVOICE_STATUS_TRANSLATION_KEYS[inv.status]}`)
                        : inv.status}
                    </span>
                  </td>
                  <td className="table-cell-pad-center">
                    {inv.status === 'pending' && (
                      <button className="dash-btn dash-btn-success" onClick={() => handlePayInvoice(inv.id, provider)}>{t('staffDashboard.invoicePayButton')}</button>
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
