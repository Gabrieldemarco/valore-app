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
import '../../styles/admin.css';

function DashboardInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    stats, filtered, search, setSearch,
    twilioConfig, setTwilioConfig,
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
        <div className="toast-container" style={{ display: 'block' }}>
          <div className={`toast ${toastType}`}>
            <span className="toast-msg">{toastMsg}</span>
          </div>
        </div>
      )}

      <header className="header">
        <h1>{t('adminDashboard.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="text"
            placeholder={t('adminDashboard.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'rgba(10,10,16,0.9)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: 'var(--border-color)',
              padding: '9px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "'Outfit', sans-serif",
              minWidth: 180,
            }}
          />
          <button onClick={() => { logout(); navigate('/admin/login'); }} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger-light)', padding: '9px 14px', borderRadius: 8, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: 'pointer' }}>{t('adminDashboard.logoutButton')}</button>
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
