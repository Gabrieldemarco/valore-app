import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDashboard } from './dashboardContext';
import SalonQR from '../../../components/SalonQR';
import PushNotificationToggle from '../../../components/PushNotificationToggle';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { CalendarDays, Clock, CheckCheck, TrendingDown } from 'lucide-react';
import { exportAppointmentsPdf } from '../../../utils/invoicePdf';
import type { Tab } from './dashboardContext';
import SettingsPanel from './SettingsPanel';
import AppointmentDetailModal from './modals/AppointmentDetailModal';
import ClientHistoryModal from './modals/ClientHistoryModal';

interface Props {
  children: ReactNode;
}

export default function DashboardShell({ children }: Props) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const {
    activeTab, setActiveTab,
    showSettings, setShowSettings,
    settings, staffName, plan,
    servicesList, appointments, filterDate,
    selectedStaff, setSelectedStaff, setPage,
    staffList, toasts,
  } = useDashboard();
  const [showQR, setShowQR] = useState(false);
  const daysLeft = plan && plan.trial_end_date && plan.status !== 'active'
    ? Math.max(0, Math.ceil((new Date(plan.trial_end_date).getTime() - Date.now()) / 86400000)) // eslint-disable-line react-hooks/purity
    : 0;

  const handleLogout = useCallback(() => { logout(); navigate('/staff/login'); }, [logout, navigate]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'list', label: t('staffDashboard.tabList') },
    { key: 'calendar', label: t('staffDashboard.tabCalendar') },
    { key: 'staff', label: t('staffDashboard.tabStaff') },
    { key: 'services', label: t('staffDashboard.tabServices') },
    { key: 'categories', label: t('staffDashboard.tabCategories') },
    { key: 'clients', label: t('staffDashboard.tabClients') },
    { key: 'billing', label: t('staffDashboard.tabBilling') },
    { key: 'analytics', label: t('staffDashboard.tabAnalytics') },
    { key: 'coupons', label: t('staffDashboard.tabCoupons') },
    { key: 'products', label: t('staffDashboard.tabProducts') },
    { key: 'pos', label: t('staffDashboard.tabPOS') },
    { key: 'waitlist', label: t('staffDashboard.tabWaitlist') },
  ];

  const exportToCSV = useCallback(() => {
    if (appointments.length === 0) return;
    const headers = [t('staffDashboard.apptClient'), t('staffDashboard.apptService'), t('staffDashboard.apptStaff'), t('staffDashboard.filterDateLabel'), t('booking.stepHorario'), t('staffDashboard.filterStatusLabel'), t('staffDashboard.clientsTablePhone')];
    const rows = appointments.map(a => [a.client_name, a.service_name || a.service || '', a.staff_name || '', a.date, a.time, a.status, a.phone || a.client_phone || '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `turnos-${filterDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [appointments, filterDate, t]);

  const showStaffFilter = activeTab !== 'staff' && activeTab !== 'services' && activeTab !== 'clients' && staffList.length > 0;

  return (
    <div className="dash-body">
      {toasts.length > 0 && (
        <div className="dash-toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`dash-toast glass-panel ${toast.type}`}>
              <span className="dash-toast-icon">{toast.type === 'success' ? 'OK' : 'ERR'}</span>
              <span className="dash-toast-message">{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dash-header">
        <h1 className="text-gradient">{t('staffDashboard.title')}</h1>
        <div className="dash-user-info">
          {daysLeft > 0 && (
            <span className={`dash-trial-badge${daysLeft < 3 ? ' dash-trial-critical' : ''}`}>
              {t('staffDashboard.trialBadge', { days: daysLeft })}
            </span>
          )}
          <Link to="/staff/landing-editor" className="dash-btn dash-btn-primary fs-14 px-18 py-8">{t('staffDashboard.landingPageLink')}</Link>
          {settings.slug && <a href={`/p/${settings.slug}`} target="_blank" rel="noopener noreferrer" className="dash-btn btn btn-secondary fs-14 no-underline px-18 py-8">{t('staffDashboard.viewLanding')}</a>}
          {settings.slug && <button onClick={() => setShowQR(true)} className="dash-btn btn btn-secondary fs-14 no-underline px-14 py-8">{t('staffDashboard.qrButton')}</button>}
          <button onClick={() => setShowSettings(p => !p)} className="dash-btn btn btn-secondary fs-15 px-16 py-8 font-500 rounded">{t('staffDashboard.settingsButton')}</button>
          <span className="dash-user-name">{staffName || t('staffDashboard.userNameLoading')}</span>
          <button className="dash-btn dash-btn-danger" onClick={handleLogout}>{t('staffDashboard.logoutButton')}</button>
        </div>
      </div>

      {showSettings && (
        <div className="dash-container max-w-700 m-0-auto-24">
          <PushNotificationToggle />
        </div>
      )}

      {showSettings && <SettingsPanel />}

      <div className="dash-container">
        <div className="dash-stats">
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">{t('staffDashboard.statToday')}</div>
                <div className="dash-stat-value">{appointments.filter(a => a.date === filterDate).length}</div>
              </div>
              <div className="dash-stat-icon"><CalendarDays size={28} /></div>
            </div>
          </div>
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">{t('staffDashboard.statPending')}</div>
                <div className="dash-stat-value">{appointments.filter(a => a.status === 'pending').length}</div>
              </div>
              <div className="dash-stat-icon"><Clock size={28} /></div>
            </div>
          </div>
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">{t('staffDashboard.statCompleted')}</div>
                <div className="dash-stat-value">{appointments.filter(a => a.status === 'completed').length}</div>
              </div>
              <div className="dash-stat-icon"><CheckCheck size={28} /></div>
            </div>
          </div>
          <div className="dash-stat-card glass-panel">
            <div className="dash-stat-header">
              <div>
                <div className="dash-stat-label">{t('staffDashboard.statCancellationRate')}</div>
                <div className="dash-stat-value">
                  {appointments.length > 0
                    ? Math.round((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100) + '%'
                    : '0%'}
                </div>
              </div>
              <div className="dash-stat-icon"><TrendingDown size={28} /></div>
            </div>
          </div>
        </div>

        <div className="dash-tabs glass-panel">
          {tabs.map(tab => (
            <button key={tab.key} className={`dash-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
          <button className="dash-tab" onClick={exportToCSV}>{t('staffDashboard.exportCSV')}</button>
          <button className="dash-tab" onClick={() => exportAppointmentsPdf(appointments as unknown as Record<string, unknown>[], settings)}>{t('staffDashboard.exportPDF')}</button>
        </div>

        {showStaffFilter && (
          <div id="dashStaffFilterContainer" className="glass-panel flex flex-wrap gap-10 items-center my-20 p-16">
            <span className="font-700 text-main">{t('staffDashboard.staffFilterLabel')}</span>
            <div id="dashStaffFilterButtons" className="flex flex-wrap gap-8">
              <button className={`dash-staff-filter-btn${selectedStaff === '' ? ' active' : ''}`} onClick={() => { setPage(1); setSelectedStaff(''); }}>{t('staffDashboard.staffFilterAll')}</button>
              {staffList.filter(s => s.active !== false).map(s => (
                <button key={s.id} className={`dash-staff-filter-btn${selectedStaff === s.id ? ' active' : ''}`} onClick={() => { setPage(1); setSelectedStaff(s.id); }}>{s.name}</button>
              ))}
            </div>
          </div>
        )}

        {children}
      </div>

      <AppointmentDetailModal />
      <ClientHistoryModal />

      {showQR && settings.slug && <SalonQR slug={settings.slug} services={servicesList} onClose={() => setShowQR(false)} />}
    </div>
  );
}
