import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardProvider from './dashboard/DashboardProvider';
import DashboardShell from './dashboard/DashboardShell';
import { useDashboard } from './dashboard/dashboardContext';
import '../../styles/dashboard.css';
import '../../styles/fullcalendar.css';

const AppointmentListTab = lazy(() => import('./dashboard/tabs/AppointmentListTab'));
const CalendarTab = lazy(() => import('./dashboard/tabs/CalendarTab'));
const StaffTab = lazy(() => import('./dashboard/tabs/StaffTab'));
const ServicesTab = lazy(() => import('./dashboard/tabs/ServicesTab'));
const CategoriesTab = lazy(() => import('./dashboard/tabs/CategoriesTab'));
const ClientsTab = lazy(() => import('./dashboard/tabs/ClientsTab'));
const BillingTab = lazy(() => import('./dashboard/tabs/BillingTab'));
const AnalyticsTab = lazy(() => import('./dashboard/tabs/AnalyticsTab'));
const CouponsTab = lazy(() => import('./dashboard/tabs/CouponsTab'));
const WaitlistTab = lazy(() => import('./dashboard/tabs/WaitlistTab'));
const ProductsTab = lazy(() => import('./dashboard/tabs/ProductsTab'));
const PosTab = lazy(() => import('./dashboard/tabs/PosTab'));

const tabFallback = <div className="dash-loading"><div className="dash-loading-spinner" /></div>;

function TabRouter() {
  const { activeTab } = useDashboard();
  return (
    <Suspense fallback={tabFallback}>
      {activeTab === 'list' && <AppointmentListTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'billing' && <BillingTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
      {activeTab === 'coupons' && <CouponsTab />}
      {activeTab === 'waitlist' && <WaitlistTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'pos' && <PosTab />}
    </Suspense>
  );
}

export default function StaffDashboard() {
  const { staffToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!staffToken) navigate('/staff/login');
  }, [staffToken, navigate]);

  return (
    <DashboardProvider>
      <DashboardShell>
        <TabRouter />
      </DashboardShell>
    </DashboardProvider>
  );
}
