import { useTranslation } from 'react-i18next';
import type { AdminInvoice } from './types';

interface Props {
  status: 'pending' | 'paid';
  invoices: AdminInvoice[];
  loading: boolean;
}

export default function BillingInvoicesList({ status, invoices, loading }: Props) {
  const { t } = useTranslation();

  const formatAmount = (amount: number | string) => new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t(status === 'pending' ? 'adminDashboard.pendingInvoicesTitle' : 'adminDashboard.paidInvoicesTitle')}</h2>
        {!loading && <span className="panel-count">{t('adminDashboard.invoiceCount', { count: invoices.length })}</span>}
      </div>
      <table>
        <thead>
          <tr>
            <th>{t('adminDashboard.invoiceNumber')}</th>
            <th>{t('adminDashboard.tableBusiness')}</th>
            <th>{t('adminDashboard.invoicesTableAmount')}</th>
            <th>{t('adminDashboard.invoicesTableStatus')}</th>
            <th>{t('adminDashboard.invoicesTableDate')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="empty-row">{t('adminDashboard.loadingInvoices')}</td></tr>
          ) : invoices.map(invoice => (
            <tr key={invoice.id}>
              <td><strong>{invoice.invoice_number}</strong></td>
              <td>{invoice.business_name}</td>
              <td>{formatAmount(invoice.amount)} {invoice.currency}</td>
              <td>
                <span className={`badge ${status === 'paid' ? 'badge-active' : 'badge-expired'}`}>
                  {t(status === 'paid' ? 'adminDashboard.invoiceStatusPaid' : 'adminDashboard.invoiceStatusPending')}
                </span>
              </td>
              <td>{new Date(invoice.issue_date).toLocaleDateString()}</td>
            </tr>
          ))}
          {!loading && invoices.length === 0 && (
            <tr><td colSpan={5} className="empty-row">{t('adminDashboard.noInvoicesForFilter')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
