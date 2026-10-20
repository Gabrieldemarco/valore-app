import { useTranslation } from 'react-i18next';
import type { Stats } from './types';

interface Props {
  stats: Stats | null;
}

export default function StatsCards({ stats }: Props) {
  const { t } = useTranslation();
  if (!stats) return null;

  return (
    <div className="stats-grid">
      <div className="stat-card success">
        <div className="stat-icon">🏢</div>
        <div className="stat-body">
          <span className="stat-label">{t('adminDashboard.statActive')}</span>
          <span className="stat-value">{stats.activeTenants}</span>
        </div>
      </div>
      <div className="stat-card warning">
        <div className="stat-icon">📄</div>
        <div className="stat-body">
          <span className="stat-label">{t('adminDashboard.statPendingInvoices')}</span>
          <span className="stat-value">{stats.pendingInvoices}</span>
        </div>
      </div>
      <div className="stat-card info">
        <div className="stat-icon">💰</div>
        <div className="stat-body">
          <span className="stat-label">{t('adminDashboard.statTotalInvoiced')}</span>
          <span className="stat-value">${stats.totalInvoiced.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}