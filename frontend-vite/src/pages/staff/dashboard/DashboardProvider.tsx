import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import DashboardContext from './dashboardContext';
import type {
  Appointment, PlanInfo, Invoice, StaffMember, ServiceItem,
  CategoryItem, TenantSettings, ClientSummary, ProductItem,
  CalendarStatus, AnalyticsSummary, Tab, Toast,
} from './dashboardContext';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardSync } from './hooks/useDashboardSync';

export default function DashboardProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { staffToken, staffName } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TenantSettings>({ business_name: '', business_phone: '', business_address: '', notification_email: '', notification_whatsapp: '' });
  const [openingHours, setOpeningHours] = useState<{ startHour: number; endHour: number; workDays: number[] }>({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] });
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [clientsList, setClientsList] = useState<ClientSummary[]>([]);
  const [productsList, setProductsList] = useState<ProductItem[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [couponsList, setCouponsList] = useState<Record<string, unknown>[]>([]);
  const [blockedDates, setBlockedDates] = useState<{ id: number; date: string; reason: string }[]>([]);

  const [selectedStaff, setSelectedStaff] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMode, setFilterMode] = useState<'day' | 'week' | 'month'>('day');
  const [filterPhone, setFilterPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_apptClientHistory, setApptClientHistory] = useState<Appointment[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_apptClientHistoryLoading, setApptClientHistoryLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);

  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; appointments: number; revenue: number }[]>([]);
  const [topServices, setTopServices] = useState<{ service: string; count: number; avg_price: number }[]>([]);
  const [revenueByStaff, setRevenueByStaff] = useState<{ id: number; name: string; appointments: number; revenue: number }[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<'6m' | '12m' | 'all'>('12m');

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000);
  }, []);

  const {
    loadAppointments, loadServices, loadCategories, loadClients, loadProducts,
    loadCalendarStatus, loadInvoices, loadAnalytics,
  } = useDashboardData({
    filterStatus, filterDate, filterMode, selectedStaff, page,
    analyticsDateRange, activeTab, addToast, t,
    setSettings, setOpeningHours, setPlan,
    setAppointments, setInvoices, setStaffList,
    setServicesList, setCategories, setClientsList,
    setProductsList, setCalendarStatus, setCouponsList,
    setBlockedDates, setTotalPages, setTotalAppointments,
    setLoading, setAnalyticsSummary, setRevenueByMonth,
    setTopServices, setRevenueByStaff, setAnalyticsLoading,
    setAnalyticsError, setActiveTab,
  });

  useDashboardSync({ loadAppointments, loadServices, loadClients, setStaffList });

  const openClientHistory = useCallback(async (client: ClientSummary) => {
    setSelectedClient(client);
    setClientHistoryLoading(true);
    try {
      const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(client.client_phone)}/appointments`);
      setClientHistory(data.appointments);
    } catch { addToast(t('staffDashboard.toastLoadHistoryError'), 'error'); } finally { setClientHistoryLoading(false); }
  }, [addToast, t]);

  const flatCats = useMemo(() => {
    const result: { id: number; name: string; depth: number }[] = [];
    const walk = (items: CategoryItem[], depth: number) => {
      for (const c of items) {
        result.push({ id: c.id, name: c.name, depth });
        walk(c.children, depth + 1);
      }
    };
    walk(categories, 0);
    return result;
  }, [categories]);

  // Redirect
  useEffect(() => {
    if (!staffToken) navigate('/staff/login');
  }, [staffToken, navigate]);

  // Calendar sync params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calResult = params.get('calendar');
    if (calResult === 'connected') {
      addToast(t('staffDashboard.calendarSyncSyncSuccess'), 'success'); // eslint-disable-line react-hooks/set-state-in-effect
      const url = new URL(window.location.href);
      url.searchParams.delete('calendar');
      window.history.replaceState({}, '', url.toString());
    } else if (calResult === 'error') {
      addToast(t('staffDashboard.calendarSyncConnectError'), 'error');
      const url = new URL(window.location.href);
      url.searchParams.delete('calendar');
      window.history.replaceState({}, '', url.toString());
    }
  }, [addToast, t]);

  // Load client history when appointment selected
  useEffect(() => {
    if (selectedAppointment) {
      const phone = selectedAppointment.client_phone || selectedAppointment.phone;
      if (phone) {
        (async () => {
          setApptClientHistoryLoading(true);
          try {
            const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(phone)}/appointments`);
            setApptClientHistory(data.appointments);
          } catch { addToast(t('staffDashboard.toastLoadHistoryError'), 'error'); } finally { setApptClientHistoryLoading(false); }
        })();
      }
    } else {
      setApptClientHistory([]); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [selectedAppointment, addToast, t]);

  const value = useMemo<DashboardContextType>(() => ({
    activeTab, setActiveTab,
    showSettings, setShowSettings,
    settings, setSettings,
    openingHours, setOpeningHours,
    plan,
    appointments,
    invoices,
    staffList, setStaffList,
    servicesList,
    categories,
    clientsList,
    productsList,
    calendarStatus,
    analyticsSummary,
    revenueByMonth,
    topServices,
    revenueByStaff,
    analyticsLoading, analyticsError,
    analyticsDateRange, setAnalyticsDateRange,
    loading,
    page, setPage,
    totalPages, totalAppointments,
    filterStatus, setFilterStatus,
    filterDate, setFilterDate,
    filterMode, setFilterMode,
    filterPhone, setFilterPhone,
    selectedStaff, setSelectedStaff,
    toasts, addToast,
    selectedAppointment, setSelectedAppointment,
    selectedClient, setSelectedClient,
    clientHistory, clientHistoryLoading,
    openClientHistory,
    loadAppointments, loadServices, loadCategories, loadClients, loadProducts,
    loadAnalytics, loadCalendarStatus, loadInvoices,
    flatCats,
    couponsList, setCouponsList,
    blockedDates, setBlockedDates,
    staffName,
  }), [
    activeTab, showSettings, settings, openingHours, plan, appointments, invoices,
    staffList, servicesList, categories, clientsList, productsList, calendarStatus,
    couponsList, blockedDates,
    analyticsSummary, revenueByMonth, topServices, revenueByStaff,
    analyticsLoading, analyticsError, analyticsDateRange,
    loading, page, totalPages, totalAppointments,
    filterStatus, filterDate, filterMode, filterPhone, selectedStaff,
    toasts, selectedAppointment, selectedClient, clientHistory, clientHistoryLoading,
    flatCats, staffName,
    addToast, openClientHistory,
    loadAppointments, loadServices, loadCategories, loadClients, loadProducts,
    loadAnalytics, loadCalendarStatus, loadInvoices,
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
