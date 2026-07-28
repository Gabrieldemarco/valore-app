import { useTranslation } from 'react-i18next';
import { useDashboard } from '../dashboardContext';
import RevenueChart from '../../RevenueChart';
import TopServicesChart from '../../TopServicesChart';

export default function AnalyticsTab() {
  const { t } = useTranslation();
  const {
    analyticsSummary, revenueByMonth, topServices, revenueByStaff,
    analyticsLoading, analyticsError, analyticsDateRange, setAnalyticsDateRange,
    loadAnalytics,
  } = useDashboard();

  if (analyticsLoading && !analyticsSummary) {
    return (
      <div className="glass-panel section-card">
        <div className="flex-col flex-gap-20">
          <div className="dash-stats m-0">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="dash-stat-card glass-panel" style={{ height: 96 }}>
                <div className="mb-12" style={{ width: '60%', height: 14, background: 'rgba(148,163,184,0.12)', borderRadius: 6 }} />
                <div style={{ width: '40%', height: 28, background: 'rgba(148,163,184,0.08)', borderRadius: 6 }} />
              </div>
            ))}
          </div>
          <div className="grid-2" style={{ gap: 20 }}>
            {[1, 2].map(i => (
              <div key={i} className="glass-panel p-20" style={{ height: 320 }}>
                <div className="mb-20" style={{ width: '50%', height: 16, background: 'rgba(148,163,184,0.12)', borderRadius: 6 }} />
                <div style={{ width: '100%', height: 260, background: 'rgba(148,163,184,0.06)', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="glass-panel section-card">
        <div className="dash-empty-state glass-panel">
          <p>{t('staffDashboard.analyticsErrorState')}</p>
          <button className="dash-btn dash-btn-primary mt-12" onClick={() => loadAnalytics(true, analyticsDateRange)}>
            {t('staffDashboard.analyticsRetry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel section-card">
        <div className="flex-between flex-wrap mb-20" style={{ gap: 10 }}>
        <h3 className="text-gradient m-0">{t('staffDashboard.analyticsTitle')}</h3>
        <div className="flex-center flex-gap-8">
          <div className="flex flex-gap-4" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
            {(['6m', '12m', 'all'] as const).map(r => (
              <button key={r} onClick={() => { setAnalyticsDateRange(r); loadAnalytics(false, r); }}
                style={{
                  padding: '4px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                  background: analyticsDateRange === r ? 'rgba(197,168,128,0.25)' : 'transparent',
                  color: analyticsDateRange === r ? '#c5a880' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}>
                {r === '6m' ? t('staffDashboard.analytics6m') : r === '12m' ? t('staffDashboard.analytics12m') : t('staffDashboard.analyticsAll')}
              </button>
            ))}
          </div>
          <button className="dash-btn dash-btn-secondary flex-center flex-gap-8" onClick={() => loadAnalytics(true, analyticsDateRange)}>
            ↻ {t('staffDashboard.analyticsRefresh')}
          </button>
        </div>
      </div>

      <div className="dash-stats mb-24">
        <div className="dash-stat-card glass-panel">
          <div className="dash-stat-header">
            <div>
              <div className="dash-stat-label">{t('staffDashboard.analyticsRevenueMonth')}</div>
              <div className="dash-stat-value">${analyticsSummary?.monthRevenue?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>
        <div className="dash-stat-card glass-panel">
          <div className="dash-stat-header">
            <div>
              <div className="dash-stat-label">{t('staffDashboard.analyticsAppointmentsMonth')}</div>
              <div className="dash-stat-value">{analyticsSummary?.monthAppointments || 0}</div>
            </div>
          </div>
        </div>
        <div className="dash-stat-card glass-panel">
          <div className="dash-stat-header">
            <div>
              <div className="dash-stat-label">{t('staffDashboard.analyticsAvgTicket')}</div>
              <div className="dash-stat-value">
                ${analyticsSummary && analyticsSummary.monthAppointments > 0
                  ? Math.round(analyticsSummary.monthRevenue / analyticsSummary.monthAppointments).toLocaleString()
                  : '0'}
              </div>
            </div>
          </div>
        </div>
        <div className="dash-stat-card glass-panel">
          <div className="dash-stat-header">
            <div>
              <div className="dash-stat-label">{t('staffDashboard.analyticsCancellationRate')}</div>
              <div className="dash-stat-value">{analyticsSummary?.cancellationRate || 0}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 20 }}>
        <div className="glass-panel p-20">
          <h4 className="m-0 mb-16 text-main">{t('staffDashboard.analyticsRevenueChart')}</h4>
          {revenueByMonth.length > 0 ? <RevenueChart data={revenueByMonth} /> : <p className="text-muted text-center p-20">{t('staffDashboard.analyticsNoData')}</p>}
        </div>
        <div className="glass-panel p-20">
          <h4 className="m-0 mb-16 text-main">{t('staffDashboard.analyticsTopServices')}</h4>
          {topServices.length > 0 ? <TopServicesChart data={topServices} /> : <p className="text-muted text-center p-20">{t('staffDashboard.analyticsNoData')}</p>}
        </div>
      </div>

      <div className="glass-panel p-20">
        <h4 className="m-0 mb-16 text-main">{t('staffDashboard.analyticsTopServicesTable')}</h4>
        {topServices.length > 0 ? (
          <div className="dash-table-responsive table-wrapper">
            <table className="table-full">
              <thead>
                <tr>
                  <th className="table-cell-left">{t('staffDashboard.analyticsServiceName')}</th>
                  <th className="table-cell-right">{t('staffDashboard.analyticsServiceCount')}</th>
                  <th className="table-cell-right">{t('staffDashboard.analyticsServiceAvgPrice')}</th>
                  <th className="table-cell-right">{t('staffDashboard.analyticsServiceRevenue')}</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map(s => (
                  <tr key={s.service}>
                    <td className="table-cell-label">{s.service}</td>
                    <td className="table-cell-pad-right">{s.count}</td>
                    <td className="table-cell-pad-right text-muted">${Math.round(s.avg_price).toLocaleString()}</td>
                    <td className="table-cell-pad-right text-muted">${Math.round(s.count * s.avg_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-muted text-center p-20">{t('staffDashboard.analyticsNoData')}</p>}
      </div>

      <div className="glass-panel p-20 mt-24">
        <h4 className="m-0 mb-16 text-main">{t('staffDashboard.analyticsRevenueByStaff')}</h4>
        {revenueByStaff.length > 0 ? (
          <div className="dash-table-responsive table-wrapper">
            <table className="table-full">
              <thead>
                <tr>
                  <th className="table-cell-left">{t('staffDashboard.staffTableName')}</th>
                  <th className="table-cell-right">{t('staffDashboard.analyticsStaffAppointments')}</th>
                  <th className="table-cell-right">{t('staffDashboard.analyticsStaffRevenue')}</th>
                </tr>
              </thead>
              <tbody>
                {revenueByStaff.map(s => (
                  <tr key={s.id}>
                    <td className="table-cell-label">{s.name}</td>
                    <td className="table-cell-pad-right">{s.appointments}</td>
                    <td className="table-cell-pad-right text-muted">${Math.round(s.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-muted text-center p-20">{t('staffDashboard.analyticsNoData')}</p>}
      </div>
    </div>
  );
}
