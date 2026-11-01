import { useTranslation } from 'react-i18next';
import type { Stats } from './types';

export type AdminOverviewFilter = 'all' | 'active' | 'pending' | 'paid';

interface Props {
  stats: Stats | null;
  selected: AdminOverviewFilter;
  onSelect: (filter: AdminOverviewFilter) => void;
}

export default function StatsCards({ stats, selected, onSelect }: Props) {
  const { t } = useTranslation();
  if (!stats) return null;

  const totalByCurrency = stats.totalInvoicedByCurrency || { USD: stats.totalInvoiced };
  const totalText = Object.entries(totalByCurrency)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => `${new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${currency}`)
    .join(' · ') || `${new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0)} USD`;

  const toggleFilter = (filter: AdminOverviewFilter) => {
    onSelect(selected === filter ? 'all' : filter);
  };

  return (
    <div className="stats-grid">
      <button
        type="button"
        className={`stat-card stat-card-button success ${selected === 'active' ? 'selected' : ''}`}
        aria-pressed={selected === 'active'}
        onClick={() => toggleFilter('active')}
      >
        <div className="stat-icon">🏢</div>
        <div className="stat-body">
          <span className="stat-label">{t('adminDashboard.statActive')}</span>
          <span className="stat-value">{stats.activeTenants}</span>
        </div>
      </button>
      <button
        type="button"
        className={`stat-card stat-card-button warning ${selected === 'pending' ? 'selected' : ''}`}
        aria-pressed={selected === 'pending'}
        onClick={() => toggleFilter('pending')}
      >
        <div className="stat-icon">📄</div>
        <div className="stat-body">
          <span className="stat-label">{t('adminDashboard.statPendingInvoices')}</span>
          <span className="stat-value">{stats.pendingInvoices}</span>
        </div>
      </button>
      <button
        type="button"
        className={`stat-card stat-card-button info ${selected === 'paid' ? 'selected' : ''}`}
        aria-pressed={selected === 'paid'}
        onClick={() => toggleFilter('paid')}
      >
        <div className="stat-icon">💰</div>
        <div className="stat-body">
          <span className="stat-label">{t('adminDashboard.statTotalInvoiced')}</span>
          <span className="stat-value stat-value-currencies">{totalText}</span>
        </div>
      </button>
    </div>
  );
}