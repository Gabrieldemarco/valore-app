import { useTranslation } from 'react-i18next';
import type { Stats } from './types';

interface Props {
  stats: Stats | null;
}

export default function StatsCards({ stats }: Props) {
  const { t } = useTranslation();
  if (!stats) return null;

  return (
    <div className="admin-stats-grid">
      <div className="admin-stat-card admin-stat-success">
        <div className="admin-stat-icon">🏢</div>
        <div className="admin-stat-body">
          <span className="admin-stat-label">{t('adminDashboard.statActive')}</span>
          <span className="admin-stat-value">{stats.activeTenants}</span>
        </div>
      </div>
      <div className="admin-stat-card admin-stat-warning">
        <div className="admin-stat-icon">📄</div>
        <div className="admin-stat-body">
          <span className="admin-stat-label">{t('adminDashboard.statPendingInvoices')}</span>
          <span className="admin-stat-value">{stats.pendingInvoices}</span>
        </div>
      </div>
      <div className="admin-stat-card admin-stat-info">
        <div className="admin-stat-icon">💰</div>
        <div className="admin-stat-body">
          <span className="admin-stat-label">{t('adminDashboard.statTotalInvoiced')}</span>
          <span className="admin-stat-value">${stats.totalInvoiced.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
