import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { AdminDashboardProvider, useAdminDashboard } from './adminDashboardContext';
import StatsCards from './StatsCards';
import TenantList from './TenantList';
import TenantModal from './TenantModal';
import TwilioConfigPanel from './TwilioConfig';
import PlanPricesPanel from './PlanPricesPanel';
import '../../styles/admin.css';

function DashboardInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    stats, filtered, search, setSearch,
    twilioConfig, setTwilioConfig,
    planPrices, setPlanPrices,
    loadData, toastMsg, toastType, showToast,
  } = useAdminDashboard();

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  const handleSetTrial = async (id: number) => {
    if (!window.confirm(t('adminDashboard.confirmSetTrial'))) return;
    try {
      await api.post(`/api/super-admin/tenants/${id}/set-trial`, { days: 15 });
      showToast(t('adminDashboard.toastTrialSet'), 'success');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('adminDashboard.error'), 'error');
    }
  };

  return (
    <div className="admin-view">
      {toastMsg && (
        <div className="toast-container">
          <div className={`toast ${toastType}`}>
            <span className="toast-msg">{toastMsg}</span>
          </div>
        </div>
      )}

      <header className="header">
        <h1>{t('adminDashboard.title')}</h1>
        <div className="filters-bar" style={{ marginBottom: 0, padding: '12px 16px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <input
            type="text"
            placeholder={t('adminDashboard.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input"
            style={{ minWidth: 220, padding: '10px 14px', borderRadius: 10 }}
          />
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', borderRadius: 10 }}
          >
            {t('adminDashboard.logoutButton')}
          </button>
        </div>
      </header>

      <div className="container">
        <StatsCards stats={stats} />
        <TenantList
          filtered={filtered}
          onOpenModal={setSelectedTenantId}
          onSetTrial={handleSetTrial}
        />
        <TwilioConfigPanel
          config={twilioConfig}
          setConfig={setTwilioConfig}
          showToast={showToast}
        />
        <PlanPricesPanel
          planPrices={planPrices}
          setPlanPrices={setPlanPrices}
          showToast={showToast}
        />
      </div>

      <TenantModal
        tenantId={selectedTenantId}
        onClose={() => setSelectedTenantId(null)}
        onReactivate={() => { setSelectedTenantId(null); loadData(); }}
        showToast={showToast}
        loadData={loadData}
      />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminDashboardProvider>
      <DashboardInner />
    </AdminDashboardProvider>
  );
}