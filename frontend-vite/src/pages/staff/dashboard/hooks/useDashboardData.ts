import { useEffect, useCallback } from 'react';
import { api, clearApiCache } from '../../../../api/client';
import type {
  Appointment, PlanInfo, Invoice, StaffMember, ServiceItem,
  CategoryItem, TenantSettings, ClientSummary, ProductItem,
  CalendarStatus, AnalyticsSummary, Tab,
} from '../dashboardContext';

export interface DashboardDataParams {
  filterStatus: string;
  filterDate: string;
  filterMode: 'day' | 'week' | 'month';
  selectedStaff: number | '';
  page: number;
  analyticsDateRange: '6m' | '12m' | 'all';
  activeTab: Tab;
  addToast: (message: string, type: 'success' | 'error') => void;
  t: (key: string) => string;
  setSettings: React.Dispatch<React.SetStateAction<TenantSettings>>;
  setOpeningHours: React.Dispatch<React.SetStateAction<{ startHour: number; endHour: number; workDays: number[] }>>;
  setPlan: React.Dispatch<React.SetStateAction<PlanInfo | null>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  setServicesList: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  setCategories: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
  setClientsList: React.Dispatch<React.SetStateAction<ClientSummary[]>>;
  setProductsList: React.Dispatch<React.SetStateAction<ProductItem[]>>;
  setCalendarStatus: React.Dispatch<React.SetStateAction<CalendarStatus>>;
  setCouponsList: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>;
  setBlockedDates: React.Dispatch<React.SetStateAction<{ id: number; date: string; reason: string }[]>>;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  setTotalAppointments: React.Dispatch<React.SetStateAction<number>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setAnalyticsSummary: React.Dispatch<React.SetStateAction<AnalyticsSummary | null>>;
  setRevenueByMonth: React.Dispatch<React.SetStateAction<{ month: string; appointments: number; revenue: number }[]>>;
  setTopServices: React.Dispatch<React.SetStateAction<{ service: string; count: number; avg_price: number }[]>>;
  setRevenueByStaff: React.Dispatch<React.SetStateAction<{ id: number; name: string; appointments: number; revenue: number }[]>>;
  setAnalyticsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setAnalyticsError: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
}

export function useDashboardData(params: DashboardDataParams) {
  const {
    filterStatus, filterDate, filterMode, selectedStaff, page,
    analyticsDateRange, activeTab,
    addToast, t,
    setSettings, setOpeningHours, setPlan,
    setAppointments, setInvoices, setStaffList,
    setServicesList, setCategories, setClientsList,
    setProductsList, setCalendarStatus, setCouponsList,
    setBlockedDates, setTotalPages, setTotalAppointments,
    setLoading, setAnalyticsSummary, setRevenueByMonth,
    setTopServices, setRevenueByStaff, setAnalyticsLoading,
    setAnalyticsError, setActiveTab,
  } = params;

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterStatus) queryParams.set('status', filterStatus);
      if (filterMode === 'week') {
        const d = new Date(filterDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        queryParams.set('dateFrom', monday.toISOString().slice(0, 10));
        queryParams.set('dateTo', sunday.toISOString().slice(0, 10));
      } else if (filterMode === 'month') {
        const d = new Date(filterDate);
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        queryParams.set('dateFrom', firstDay.toISOString().slice(0, 10));
        queryParams.set('dateTo', lastDay.toISOString().slice(0, 10));
      } else {
        if (filterDate) queryParams.set('date', filterDate);
      }
      if (selectedStaff) queryParams.set('staffId', String(selectedStaff));
      queryParams.set('page', String(page));
      queryParams.set('limit', '20');
      const data = await api.get<{ appointments: Appointment[]; total: number; totalPages: number }>(`/api/appointments?${queryParams}`);
      setAppointments(data.appointments);
      setTotalPages(data.totalPages);
      setTotalAppointments(data.total);
    } catch { addToast(t('staffDashboard.toastLoadAppointmentsError'), 'error'); } finally { setLoading(false); }
  }, [filterStatus, filterDate, filterMode, selectedStaff, page, addToast, t, setAppointments, setTotalPages, setTotalAppointments, setLoading]);

  const loadServices = useCallback(async () => {
    try {
      const data = await api.get<{ services: ServiceItem[] }>('/api/tenant/services');
      setServicesList(data.services);
    } catch { addToast(t('staffDashboard.toastLoadServicesError'), 'error'); }
  }, [addToast, t, setServicesList]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<{ categories: CategoryItem[] }>('/api/tenant/categories');
      setCategories(data.categories);
    } catch { /* silent */ }
  }, [setCategories]);

  const loadClients = useCallback(async (q?: string) => {
    try {
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients${query}`);
      setClientsList(data.clients);
    } catch { addToast(t('staffDashboard.toastLoadClientsError'), 'error'); }
  }, [addToast, t, setClientsList]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await api.get<{ products: ProductItem[] }>('/api/tenant/products');
      setProductsList(data.products);
    } catch { addToast(t('staffDashboard.toastProductLoadError'), 'error'); }
  }, [addToast, t, setProductsList]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      const data = await api.get<CalendarStatus>('/api/calendar/status');
      setCalendarStatus(data);
    } catch { /* silent */ }
  }, [setCalendarStatus]);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await api.get<{ invoices: Invoice[] }>('/api/tenant/invoices');
      setInvoices(data.invoices);
    } catch { /* silent */ }
  }, [setInvoices]);

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
  }, [addToast, t, setAnalyticsSummary, setRevenueByMonth, setTopServices, setRevenueByStaff, setAnalyticsLoading, setAnalyticsError]);

  const loadCoupons = useCallback(async () => {
    try {
      const data = await api.get<{ coupons: Record<string, unknown>[] }>('/api/tenant/coupons');
      setCouponsList(data.coupons || []);
    } catch { addToast(t('staffDashboard.toastLoadCouponsError'), 'error'); }
  }, [addToast, t, setCouponsList]);

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
  }, [loadServices, loadCategories, loadClients, loadCoupons, loadProducts, loadCalendarStatus, addToast, t, setSettings, setOpeningHours, setPlan, setInvoices, setStaffList, setBlockedDates, setActiveTab]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  useEffect(() => { if (activeTab === 'analytics') loadAnalytics(false, analyticsDateRange); }, [activeTab, loadAnalytics, analyticsDateRange]);

  return {
    loadAppointments,
    loadServices,
    loadCategories,
    loadClients,
    loadProducts,
    loadCalendarStatus,
    loadInvoices,
    loadAnalytics,
    loadCoupons,
  };
}
