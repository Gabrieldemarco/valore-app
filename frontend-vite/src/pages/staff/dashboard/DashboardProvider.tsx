import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api, clearApiCache } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import DashboardContext from './dashboardContext';
import type {
  Appointment, PlanInfo, Invoice, StaffMember, ServiceItem,
  CategoryItem, TenantSettings, ClientSummary, ProductItem,
  CalendarStatus, AnalyticsSummary, Tab, Toast,
} from './dashboardContext';

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
  const [couponsList, setCouponsList] = useState<any[]>([]);
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
  const [apptClientHistory, setApptClientHistory] = useState<Appointment[]>([]);
  const [apptClientHistoryLoading, setApptClientHistoryLoading] = useState(false);
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

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterMode === 'week') {
        const d = new Date(filterDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        params.set('dateFrom', monday.toISOString().slice(0, 10));
        params.set('dateTo', sunday.toISOString().slice(0, 10));
      } else if (filterMode === 'month') {
        const d = new Date(filterDate);
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        params.set('dateFrom', firstDay.toISOString().slice(0, 10));
        params.set('dateTo', lastDay.toISOString().slice(0, 10));
      } else {
        if (filterDate) params.set('date', filterDate);
      }
      if (selectedStaff) params.set('staffId', String(selectedStaff));
      params.set('page', String(page));
      params.set('limit', '20');
      const data = await api.get<{ appointments: Appointment[]; total: number; totalPages: number }>(`/api/appointments?${params}`);
      setAppointments(data.appointments);
      setTotalPages(data.totalPages);
      setTotalAppointments(data.total);
    } catch { addToast(t('staffDashboard.toastLoadAppointmentsError'), 'error'); } finally { setLoading(false); }
  }, [filterStatus, filterDate, filterMode, selectedStaff, page, addToast, t]);

  const loadServices = useCallback(async () => {
    try {
      const data = await api.get<{ services: ServiceItem[] }>('/api/tenant/services');
      setServicesList(data.services);
    } catch { addToast(t('staffDashboard.toastLoadServicesError'), 'error'); }
  }, [addToast, t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<{ categories: CategoryItem[] }>('/api/tenant/categories');
      setCategories(data.categories);
    } catch { /* silent */ }
  }, []);

  const loadClients = useCallback(async (q?: string) => {
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients${query}`);
      setClientsList(data.clients);
    } catch { addToast(t('staffDashboard.toastLoadClientsError'), 'error'); }
  }, [addToast, t]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.get<{ products: ProductItem[] }>('/api/tenant/products');
      setProductsList(data.products);
    } catch { addToast(t('staffDashboard.toastProductLoadError'), 'error'); }
  }, [addToast, t]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      const data = await api.get<CalendarStatus>('/api/calendar/status');
      setCalendarStatus(data);
    } catch { /* silent */ }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await api.get<{ invoices: Invoice[] }>('/api/tenant/invoices');
      setInvoices(data.invoices);
    } catch { /* silent */ }
  }, []);

  const loadAnalytics = useCallback(async (isRefresh?: boolean, range?: string) => {
    try {
      if (isRefresh) clearApiCache();
      setAnalyticsLoading(true);
      setAnalyticsError(false);
      const [summaryResult, revenueResult, servicesResult, staffResult] = await Promise.allSettled([
        api.get<AnalyticsSummary>('/api/tenant/stats/summary'),
        api.get<{ months: { month: string; appointments: number; revenue: number }[] }>('/api/tenant/stats/revenue-by-month'),
        api.get<{ services: { service: string; count: number; avg_price: number }[] }>('/api/tenant/stats/top-services'),
        api.get<{ staff: { id: number; name: string; appointments: number; revenue: number }[] }>('/api/tenant/stats/revenue-by-staff'),
      ]);
      if (summaryResult.status === 'fulfilled') setAnalyticsSummary(summaryResult.value);
      if (revenueResult.status === 'fulfilled') {
        let months = revenueResult.value.months || [];
        if (range && range !== 'all') {
          const limit = range === '6m' ? 6 : 12;
          months = months.slice(-limit);
        }
        setRevenueByMonth(months);
      }
      if (servicesResult.status === 'fulfilled') setTopServices(servicesResult.value.services || []);
      if (staffResult.status === 'fulfilled') setRevenueByStaff(staffResult.value.staff || []);
      const rejected = [summaryResult, revenueResult, servicesResult, staffResult].filter(r => r.status === 'rejected');
      if (rejected.length > 0) {
        if (rejected.length === 3) { setAnalyticsError(true); addToast(t('staffDashboard.toastLoadAnalyticsError'), 'error'); }
        else { addToast(t('staffDashboard.toastLoadAnalyticsPartial'), 'error'); }
      }
    } catch {
      setAnalyticsError(true);
      addToast(t('staffDashboard.toastLoadAnalyticsError'), 'error');
    } finally { setAnalyticsLoading(false); }
  }, [addToast, t]);

  const openClientHistory = useCallback(async (client: ClientSummary) => {
    setSelectedClient(client);
    setClientHistoryLoading(true);
    try {
      const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(client.client_phone)}/appointments`);
      setClientHistory(data.appointments);
    } catch { addToast(t('staffDashboard.toastLoadHistoryError'), 'error'); } finally { setClientHistoryLoading(false); }
  }, [addToast, t]);

  const loadCoupons = useCallback(async () => {
    try {
      const data = await api.get<{ coupons: any[] }>('/api/tenant/coupons');
      setCouponsList(data.coupons || []);
    } catch { addToast(t('staffDashboard.toastLoadCouponsError'), 'error'); }
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
      addToast(t('staffDashboard.calendarSyncSyncSuccess'), 'success');
      const url = new URL(window.location.href);
      url.searchParams.delete('calendar');
      window.history.replaceState({}, '', url.toString());
    } else if (calResult === 'error') {
      addToast(t('staffDashboard.calendarSyncConnectError'), 'error');
      const url = new URL(window.location.href);
      url.searchParams.delete('calendar');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Load initial data
  useEffect(() => {
    api.get<{ tenant: TenantSettings }>('/api/tenant/me').then(d => {
      setSettings(d.tenant);
      if (d.tenant.opening_hours) setOpeningHours(d.tenant.opening_hours);
    }).catch(() => {});
    api.get<{ tenant: PlanInfo }>('/api/tenant/plan').then(d => setPlan(d.tenant)).catch(() => {});
    api.get<{ invoices: Invoice[] }>('/api/tenant/invoices').then(d => setInvoices(d.invoices)).catch(() => {});
    api.get<{ staff: StaffMember[] }>('/api/tenant/staff').then(d => setStaffList(d.staff)).catch(() => {});
    loadServices();
    loadCategories();
    loadClients();
    loadCoupons();
    loadProducts();
    loadCalendarStatus();
    api.get<{ blockedDates: { id: number; date: string; reason: string }[] }>('/api/tenant/blocked-dates')
      .then(d => setBlockedDates(d.blockedDates)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') { addToast(t('staffDashboard.toastPaymentSuccess'), 'success'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'failure') { addToast(t('staffDashboard.toastPaymentFailure'), 'error'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'pending') { addToast(t('staffDashboard.toastPaymentPending'), 'success'); window.history.replaceState({}, '', window.location.pathname); }
    const billing = params.get('billing');
    if (billing === '1') setActiveTab('billing');
  }, [loadServices]);

  // BroadcastChannel sync
  useEffect(() => {
    const bc = new BroadcastChannel('dashboard-sync');
    bc.onmessage = (ev) => {
      if (ev.data === 'reload') {
        loadAppointments();
        api.get<{ staff: StaffMember[] }>('/api/tenant/staff').then(d => setStaffList(d.staff)).catch(() => {});
        loadServices();
        loadClients();
      }
    };
    return () => bc.close();
  }, []);

  // Auto-load appointments on filter change
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Auto-load analytics when tab changes
  useEffect(() => { if (activeTab === 'analytics') loadAnalytics(false, analyticsDateRange); }, [activeTab, loadAnalytics, analyticsDateRange]);

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
      setApptClientHistory([]);
    }
  }, [selectedAppointment]);

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
