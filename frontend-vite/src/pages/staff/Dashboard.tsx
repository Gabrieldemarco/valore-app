import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, clearApiCache } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import PushNotificationToggle from '../../components/PushNotificationToggle';
import SalonQR from '../../components/SalonQR';
import { CalendarDays, Clock, CheckCheck, TrendingDown } from 'lucide-react';
import { exportInvoicePdf, exportAppointmentsPdf } from '../../utils/invoicePdf';
import RevenueChart from './RevenueChart';
import TopServicesChart from './TopServicesChart';
import { logger } from '../../services/logger';
import '../../styles/dashboard.css';
import '../../styles/fullcalendar.css';

interface Appointment {
  id: number;
  client_name: string;
  service: string;
  service_name?: string;
  service_price?: number;
  staff_name?: string;
  staff_id?: number;
  date: string;
  time: string;
  appointment_date: string;
  status: string;
  client_phone?: string;
  phone?: string;
  email?: string;
  notes?: string;
  internal_notes?: string;
}

interface PlanInfo {
  plan: string;
  status: string;
  trial_end_date?: string;
  trialDaysLeft?: number | null;
  price?: number;
}

interface Invoice {
  id: number;
  amount: number;
  status: string;
  due_date: string;
  issue_date?: string;
  invoice_number?: string;
  description?: string;
}

interface StaffMember {
  id: number;
  name: string;
  email?: string;
  role?: string;
  specialties?: string[];
  photo_url?: string;
  bio?: string;
  active?: boolean;
  individual_hours?: { startHour: number; endHour: number; workDays: number[] } | null;
  commission_type?: string;
  commission_value?: number;
}

interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  category?: string;
  active: boolean;
  image?: string;
}

interface TenantSettings {
  business_name: string;
  business_phone: string;
  business_address: string;
  notification_email: string;
  notification_whatsapp: string;
  slug?: string;
  smtp_email?: string;
  smtp_password?: string;
  opening_hours?: { startHour: number; endHour: number; workDays: number[] };
  reminder_hours?: number;
  captcha_enabled?: boolean;
}

interface ClientSummary {
  client_name: string;
  client_phone: string;
  client_email?: string;
  total_appointments: string;
  last_appointment: string;
  first_appointment: string;
}

type Tab = 'list' | 'calendar' | 'billing' | 'staff' | 'services' | 'clients' | 'analytics' | 'coupons' | 'waitlist';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function StaffDashboard() {
  const { t } = useTranslation();
  const { staffToken, staffName, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [settings, setSettings] = useState<TenantSettings>({ business_name: '', business_phone: '', business_address: '', notification_email: '', notification_whatsapp: '' });
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
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
  const [showApptClientHistory, setShowApptClientHistory] = useState(false);

  const [staffModal, setStaffModal] = useState<{ open: boolean; editing: StaffMember | null }>({ open: false, editing: null });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', specialties: '', photo_url: '', bio: '', indStart: '9', indEnd: '19', indWorkDays: [1, 2, 3, 4, 5] as number[], useIndividualHours: false, commission_type: 'none', commission_value: '' });
  const [staffUploadingPhoto, setStaffUploadingPhoto] = useState(false);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [couponModal, setCouponModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [couponForm, setCouponForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', min_appointment_amount: '', max_uses: '', expires_at: '' });
  const [waitlistList, setWaitlistList] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [servicesModal, setServicesModal] = useState<{ open: boolean; editing: ServiceItem | null }>({ open: false, editing: null });
  const [servicesForm, setServicesForm] = useState({ name: '', duration: '30', price: '0', category: '', image: '' });
  const [clientsList, setClientsList] = useState<ClientSummary[]>([]);
  const [clientsSearch, setClientsSearch] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);

  const [analyticsSummary, setAnalyticsSummary] = useState<{
    todayAppointments: number; monthAppointments: number; monthRevenue: number;
    pendingAppointments: number; completedAppointments: number; cancellationRate: number;
  } | null>(null);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; appointments: number; revenue: number }[]>([]);
  const [topServices, setTopServices] = useState<{ service: string; count: number; avg_price: number }[]>([]);
  const [revenueByStaff, setRevenueByStaff] = useState<{ id: number; name: string; appointments: number; revenue: number }[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<'6m' | '12m' | 'all'>('12m');
  const [clientHistory, setClientHistory] = useState<Appointment[]>([]);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [openingHours, setOpeningHours] = useState<{ startHour: number; endHour: number; workDays: number[] }>({ startHour: 9, endHour: 19, workDays: [1, 2, 3, 4, 5] });
  const [blockedDates, setBlockedDates] = useState<{ id: number; date: string; reason: string }[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState({ date: '', reason: '' });
  const [newApptForm, setNewApptForm] = useState({ clientName: '', clientPhone: '', clientEmail: '', serviceId: '', staffId: '', appointmentDate: '', appointmentTime: '', notes: '' });
  const [suggestedClients, setSuggestedClients] = useState<ClientSummary[]>([]);
  const [selectedSuggested, setSelectedSuggested] = useState<ClientSummary | null>(null);

  useEffect(() => {
    if (!staffToken) navigate('/staff/login');
  }, [staffToken, navigate]);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
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
  }, [filterStatus, filterDate, filterMode, selectedStaff, page]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const loadServices = useCallback(async () => {
    try {
      const data = await api.get<{ services: ServiceItem[] }>('/api/tenant/services');
      setServicesList(data.services);
    } catch { addToast(t('staffDashboard.toastLoadServicesError'), 'error'); }
  }, []);

  const loadClients = useCallback(async (q?: string) => {
    try {
      setClientsLoading(true);
      const query = q ? `?q=${encodeURIComponent(q)}` : '';
      const data = await api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients${query}`);
      setClientsList(data.clients);
    } catch { addToast(t('staffDashboard.toastLoadClientsError'), 'error'); } finally { setClientsLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async (isRefresh?: boolean, range?: string) => {
    try {
      if (isRefresh) clearApiCache();
      setAnalyticsLoading(true);
      setAnalyticsError(false);
      const [summaryResult, revenueResult, servicesResult, staffResult] = await Promise.allSettled([
        api.get<{
          todayAppointments: number; monthAppointments: number; monthRevenue: number;
          pendingAppointments: number; completedAppointments: number; cancellationRate: number;
        }>('/api/tenant/stats/summary'),
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
        rejected.forEach(r => logger.error('Analytics endpoint failed:', (r as PromiseRejectedResult).reason));
        if (rejected.length === 3) {
          setAnalyticsError(true);
          addToast(t('staffDashboard.toastLoadAnalyticsError'), 'error');
        } else {
          addToast(t('staffDashboard.toastLoadAnalyticsPartial'), 'error');
        }
      }
    } catch {
      setAnalyticsError(true);
      addToast(t('staffDashboard.toastLoadAnalyticsError'), 'error');
    } finally { setAnalyticsLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'analytics') loadAnalytics(false, analyticsDateRange); }, [activeTab, loadAnalytics, analyticsDateRange]);

  const openClientHistory = useCallback(async (client: ClientSummary) => {
    setSelectedClient(client);
    setClientHistoryLoading(true);
    try {
      const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(client.client_phone)}/appointments`);
      setClientHistory(data.appointments);
    } catch { addToast(t('staffDashboard.toastLoadHistoryError'), 'error'); } finally { setClientHistoryLoading(false); }
  }, [addToast]);

  const loadApptClientHistory = useCallback(async (phone: string) => {
    setApptClientHistoryLoading(true);
    try {
      const data = await api.get<{ appointments: Appointment[] }>(`/api/tenant/clients/${encodeURIComponent(phone)}/appointments`);
      setApptClientHistory(data.appointments);
    } catch { addToast(t('staffDashboard.toastLoadHistoryError'), 'error'); } finally { setApptClientHistoryLoading(false); }
  }, [addToast]);

  const saveNewAppointment = async () => {
    if (!newApptForm.clientName || !newApptForm.clientPhone || !newApptForm.serviceId || !newApptForm.appointmentDate || !newApptForm.appointmentTime) {
      addToast(t('staffDashboard.toastSaveNewApptValidation'), 'error');
      return;
    }
    const apptDate = new Date(`${newApptForm.appointmentDate}T${newApptForm.appointmentTime}:00`);
    if (apptDate <= new Date()) {
      addToast(t('staffDashboard.toastSaveNewApptFuture'), 'error');
      return;
    }
    try {
      const appointmentDate = new Date(`${newApptForm.appointmentDate}T${newApptForm.appointmentTime}:00`).toISOString();
      const body: Record<string, unknown> = {
        clientName: newApptForm.clientName,
        clientPhone: newApptForm.clientPhone,
        serviceId: parseInt(newApptForm.serviceId, 10),
        appointmentDate,
      };
      if (newApptForm.clientEmail) body.clientEmail = newApptForm.clientEmail;
      if (newApptForm.staffId) body.staffId = parseInt(newApptForm.staffId, 10);
      if (newApptForm.notes) body.notes = newApptForm.notes;
      await api.post('/api/appointments', body);
      addToast(t('staffDashboard.toastAppointmentCreated'), 'success');
      setShowNewAppointment(false);
      loadAppointments();
      loadClients();
      try { new BroadcastChannel('dashboard-sync').postMessage('reload'); } catch {}
    } catch { addToast(t('staffDashboard.toastCreateAppointmentError'), 'error'); }
  };

  useEffect(() => {
    api.get<{ tenant: TenantSettings }>('/api/tenant/me').then(d => {
      setSettings(d.tenant);
      if (d.tenant.opening_hours) setOpeningHours(d.tenant.opening_hours);
    }).catch(() => {});
    api.get<{ tenant: PlanInfo }>('/api/tenant/plan').then(d => setPlan(d.tenant)).catch(() => {});
    api.get<{ invoices: Invoice[] }>('/api/tenant/invoices').then(d => setInvoices(d.invoices)).catch(() => {});
    api.get<{ staff: StaffMember[] }>('/api/tenant/staff').then(d => setStaffList(d.staff)).catch(() => {});
    loadServices();
    loadClients();
    loadCoupons();
    loadWaitlist();

    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') { addToast(t('staffDashboard.toastPaymentSuccess'), 'success'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'failure') { addToast(t('staffDashboard.toastPaymentFailure'), 'error'); window.history.replaceState({}, '', window.location.pathname); }
    else if (payment === 'pending') { addToast(t('staffDashboard.toastPaymentPending'), 'success'); window.history.replaceState({}, '', window.location.pathname); }
    const billing = params.get('billing');
    if (billing === '1') setActiveTab('billing');
  }, [loadServices]);

  useEffect(() => {
    api.get<{ blockedDates: { id: number; date: string; reason: string }[] }>('/api/tenant/blocked-dates')
      .then(d => setBlockedDates(d.blockedDates)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showNewAppointment) { setSuggestedClients([]); return; }
    if (newApptForm.clientPhone.length < 3) { setSuggestedClients([]); return; }
    const t = setTimeout(() => {
      api.get<{ clients: ClientSummary[] }>(`/api/tenant/clients?q=${encodeURIComponent(newApptForm.clientPhone)}`)
        .then(d => setSuggestedClients(d.clients)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [showNewAppointment, newApptForm.clientPhone]);

  // Sincronizar cambios entre pestañas
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

  useEffect(() => {
    if (selectedAppointment) {
      const phone = selectedAppointment.client_phone || selectedAppointment.phone;
      if (phone) {
        loadApptClientHistory(phone);
      }
      setShowApptClientHistory(false);
    } else {
      setApptClientHistory([]);
      setShowApptClientHistory(false);
    }
  }, [selectedAppointment, loadApptClientHistory]);

  const updateStatus = useCallback(async (id: number, status: string, internalNotes?: string) => {
    const labels: Record<string, string> = { completed: 'completar', cancelled: 'cancelar', confirmed: 'confirmar', 'no-show': 'marcar como no-show' };
    if (!confirm(t('staffDashboard.confirmStatusUpdate', { action: labels[status] || status }))) return;
    try {
      await api.put(`/api/appointments/${id}/status`, { status, internalNotes });
      addToast(t('staffDashboard.toastStatusUpdated'), 'success');
      loadAppointments();
      try { new BroadcastChannel('dashboard-sync').postMessage('reload'); } catch {}
    } catch { addToast(t('staffDashboard.toastUpdateError'), 'error'); }
  }, [addToast, loadAppointments]);

  const saveSettings = useCallback(async () => {
    try {
      await api.put('/api/tenant/settings', { ...settings, opening_hours: openingHours });
      addToast(t('staffDashboard.toastStatusUpdated'), 'success');
    } catch { addToast(t('staffDashboard.toastSaveError'), 'error'); }
  }, [addToast, settings, openingHours]);

  const loadBlockedDates = useCallback(async () => {
    try {
      const data = await api.get<{ blockedDates: { id: number; date: string; reason: string }[] }>('/api/tenant/blocked-dates');
      setBlockedDates(data.blockedDates);
    } catch { /* silencioso */ }
  }, []);

  const addBlockedDate = useCallback(async () => {
    if (!newBlockedDate.date) return;
    try {
      await api.post('/api/tenant/blocked-dates', newBlockedDate);
      setNewBlockedDate({ date: '', reason: '' });
      loadBlockedDates();
      addToast(t('staffDashboard.toastBlockedDateAdded'), 'success');
    } catch { addToast(t('staffDashboard.toastBlockedDateError'), 'error'); }
  }, [newBlockedDate, loadBlockedDates, addToast]);

  const deleteBlockedDate = useCallback(async (id: number) => {
    try {
      await api.delete(`/api/tenant/blocked-dates/${id}`);
      loadBlockedDates();
      addToast(t('staffDashboard.toastBlockedDateDeleted'), 'success');
    } catch { addToast(t('staffDashboard.toastBlockedDateError'), 'error'); }
  }, [loadBlockedDates, addToast]);

  const subscribeToPlan = useCallback(async (planName: string) => {
    try {
      const res = await api.post<{ init_point: string }>('/api/tenant/subscribe', { plan: planName });
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast(t('staffDashboard.toastSubscribeError'), 'error'); }
  }, [addToast]);

  const handlePayInvoice = useCallback(async (invoiceId: number) => {
    try {
      const res = await api.post<{ init_point: string }>(`/api/tenant/invoices/${invoiceId}/pay`);
      if (res.init_point) window.location.href = res.init_point;
    } catch { addToast(t('staffDashboard.toastPayError'), 'error'); }
  }, [addToast]);

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
  }, [appointments, filterDate]);

  const handleLogout = useCallback(() => { logout(); navigate('/staff/login'); }, [logout, navigate]);

  const getStatusBadge = (status: string) => {
    const cls = status === 'confirmed' ? 'dash-status-confirmed'
      : status === 'completed' ? 'dash-status-completed'
      : status === 'cancelled' ? 'dash-status-cancelled'
      : status === 'no-show' ? 'dash-status-noshow'
      : 'dash-status-pending';
    return <span className={`dash-appointment-status ${cls}`}>{status}</span>;
  };

  // ===== STAFF CRUD =====
  const openStaffEdit = (s: StaffMember) => {
    const ind = s.individual_hours as { startHour?: number; endHour?: number; workDays?: number[] } | null | undefined;
    setStaffForm({
      name: s.name,
      email: s.email || '',
      specialties: (s.specialties || []).join(', '),
      photo_url: s.photo_url || '',
      bio: s.bio || '',
      useIndividualHours: !!ind,
      indStart: String(ind?.startHour ?? 9),
      indEnd: String(ind?.endHour ?? 19),
      indWorkDays: ind?.workDays ?? [1, 2, 3, 4, 5],
      commission_type: s.commission_type || 'none',
      commission_value: s.commission_value ? String(s.commission_value) : '',
    });
    setStaffModal({ open: true, editing: s });
  };

  const openStaffCreate = () => {
    setStaffForm({ name: '', email: '', specialties: '', photo_url: '', bio: '', indStart: '9', indEnd: '19', indWorkDays: [1, 2, 3, 4, 5], useIndividualHours: false, commission_type: 'none', commission_value: '' });
    setStaffModal({ open: true, editing: null });
  };

  const handleStaffPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setStaffUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const filename = `staff-${Date.now()}.${file.name.split('.').pop()}`;
          const res = await api.post<{ success: boolean; url: string; message: string }>('/upload-image', { image: base64, filename });
          if (res.success && res.url) {
            setStaffForm(p => ({ ...p, photo_url: res.url }));
            addToast(t('staffDashboard.toastStaffPhotoUploadSuccess'), 'success');
          } else {
            addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
          }
          setStaffUploadingPhoto(false);
        } catch (err) {
          logger.error('Error uploading photo:', err);
          addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
          setStaffUploadingPhoto(false);
        }
      };
      reader.onerror = () => {
        addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
        setStaffUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      logger.error('Error reading file:', err);
      addToast(t('staffDashboard.toastStaffPhotoUploadError'), 'error');
      setStaffUploadingPhoto(false);
    }
  };

  const saveStaff = async () => {
    if (!staffForm.name || !staffForm.name.trim()) {
      addToast(t('staffDashboard.toastStaffNameRequired'), 'error');
      return;
    }
    if (!staffModal.editing && (!staffForm.email || !staffForm.email.trim())) {
      addToast(t('staffDashboard.toastStaffEmailRequired'), 'error');
      return;
    }
    try {
      const body: any = {
        name: staffForm.name,
        email: staffForm.email,
        specialties: staffForm.specialties ? staffForm.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
        photo_url: staffForm.photo_url || undefined,
        bio: staffForm.bio || undefined,
        commission_type: staffForm.commission_type,
        commission_value: staffForm.commission_value ? parseFloat(staffForm.commission_value) : 0,
      };
      if (staffForm.useIndividualHours) {
        body.individual_hours = {
          startHour: parseInt(staffForm.indStart, 10),
          endHour: parseInt(staffForm.indEnd, 10),
          workDays: staffForm.indWorkDays,
        };
      }
      if (staffModal.editing) {
        await api.put(`/api/tenant/staff/${staffModal.editing.id}`, body);
        addToast(t('staffDashboard.toastStaffUpdated'), 'success');
      } else {
        const res = await api.post<{ tempPassword: string }>('/api/tenant/staff', body);
        addToast(t('staffDashboard.toastStaffCreated', { password: res.tempPassword }), 'success');
      }
      setStaffModal({ open: false, editing: null });
      clearApiCache();
      const data = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff');
      setStaffList(data.staff);
    } catch (e: any) {
      logger.error('Error saving staff:', e);
      const msg = e?.message || t('staffDashboard.toastStaffSaveError');
      addToast(msg, 'error');
    }
  };

  const deleteStaff = async (id: number, name: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteStaff', { name }))) return;
    try {
      await api.delete(`/api/tenant/staff/${id}`);
      addToast(t('staffDashboard.toastStaffDeleted'), 'success');
      clearApiCache();
      const data = await api.get<{ staff: StaffMember[] }>('/api/tenant/staff');
      setStaffList(data.staff);
    } catch (e: any) {
      logger.error('Error deleting staff:', e);
      const errMsg = e?.message || t('staffDashboard.toastStaffDeleteError');
      addToast(errMsg, 'error');
    }
  };

  // ===== SERVICES CRUD =====
  const loadCoupons = useCallback(async () => {
    try {
      const data = await api.get<{ coupons: any[] }>('/api/tenant/coupons');
      setCouponsList(data.coupons || []);
    } catch { addToast(t('staffDashboard.toastLoadCouponsError'), 'error'); }
  }, []);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const data = await api.get<{ entries: any[] }>('/api/tenant/waitlist');
      setWaitlistList(data.entries || []);
    } catch { /* silencioso */ }
    setWaitlistLoading(false);
  }, []);

  const notifyWaitlistEntry = useCallback(async (id: number) => {
    try {
      await api.put(`/api/tenant/waitlist/${id}/notify`);
      loadWaitlist();
      addToast(t('staffDashboard.toastWaitlistNotified'), 'success');
    } catch { addToast(t('staffDashboard.toastError'), 'error'); }
  }, [loadWaitlist, addToast]);

  const deleteWaitlistEntry = useCallback(async (id: number) => {
    try {
      await api.delete(`/api/tenant/waitlist/${id}`);
      loadWaitlist();
      addToast(t('staffDashboard.toastWaitlistDeleted'), 'success');
    } catch { addToast(t('staffDashboard.toastError'), 'error'); }
  }, [loadWaitlist, addToast]);

  const openCouponCreate = () => {
    setCouponForm({ code: '', discount_type: 'percentage', discount_value: '', min_appointment_amount: '', max_uses: '', expires_at: '' });
    setCouponModal({ open: true, editing: null });
  };

  const openCouponEdit = (c: any) => {
    setCouponForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_appointment_amount: String(c.min_appointment_amount || ''),
      max_uses: String(c.max_uses || ''),
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
    });
    setCouponModal({ open: true, editing: c });
  };

  const saveCoupon = async () => {
    if (!couponForm.code || !couponForm.discount_value) {
      addToast(t('staffDashboard.toastCouponRequired'), 'error');
      return;
    }
    try {
      const body: any = {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
      };
      if (couponForm.min_appointment_amount) body.min_appointment_amount = parseFloat(couponForm.min_appointment_amount);
      if (couponForm.max_uses) body.max_uses = parseInt(couponForm.max_uses, 10);
      if (couponForm.expires_at) body.expires_at = new Date(couponForm.expires_at).toISOString();
      if (couponModal.editing) {
        await api.put(`/api/tenant/coupons/${couponModal.editing.id}`, body);
        addToast(t('staffDashboard.toastCouponUpdated'), 'success');
      } else {
        await api.post('/api/tenant/coupons', body);
        addToast(t('staffDashboard.toastCouponCreated'), 'success');
      }
      setCouponModal({ open: false, editing: null });
      clearApiCache();
      await loadCoupons();
    } catch (e: any) {
      const msg = e?.message || t('staffDashboard.toastCouponSaveError');
      addToast(msg, 'error');
    }
  };

  const deleteCoupon = async (id: number, code: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteCoupon', { code }))) return;
    try {
      await api.delete(`/api/tenant/coupons/${id}`);
      addToast(t('staffDashboard.toastCouponDeleted'), 'success');
      clearApiCache();
      await loadCoupons();
    } catch (e: any) {
      addToast(e?.message || t('staffDashboard.toastCouponDeleteError'), 'error');
    }
  };

  const openServiceCreate = () => {
    setServicesForm({ name: '', duration: '30', price: '0', category: '', image: '' });
    setServicesModal({ open: true, editing: null });
  };

  const openServiceEdit = (s: ServiceItem) => {
    setServicesForm({
      name: s.name,
      duration: String(s.duration),
      price: String(s.price),
      category: s.category || '',
      image: s.image || '',
    });
    setServicesModal({ open: true, editing: s });
  };

  const saveService = async () => {
    if (!servicesForm.name || !servicesForm.duration) {
      addToast(t('staffDashboard.toastNameDurationRequired'), 'error');
      return;
    }
    try {
      const body = {
        name: servicesForm.name,
        duration: parseInt(servicesForm.duration, 10),
        price: parseFloat(servicesForm.price),
        category: servicesForm.category || undefined,
        image: servicesForm.image || undefined,
      };
      if (servicesModal.editing) {
        await api.put(`/api/tenant/services/${servicesModal.editing.id}`, body);
        addToast(t('staffDashboard.toastServiceUpdated'), 'success');
      } else {
        await api.post('/api/tenant/services', body);
        addToast(t('staffDashboard.toastServiceCreated'), 'success');
      }
      setServicesModal({ open: false, editing: null });
      loadServices();
    } catch (e: any) {
      logger.error('Error saving service:', e); addToast(e?.message || t('staffDashboard.toastServiceSaveError'), 'error');
    }
  };

  const deleteService = async (id: number, name: string) => {
    if (!confirm(t('staffDashboard.confirmDeleteService', { name }))) return;
    try {
      await api.delete(`/api/tenant/services/${id}`);
      addToast(t('staffDashboard.toastServiceDeleted'), 'success');
      loadServices();
    } catch { addToast(t('staffDashboard.toastServiceDeleteError'), 'error'); }
  };

  const toggleServiceActive = async (s: ServiceItem) => {
    try {
      await api.put(`/api/tenant/services/${s.id}`, { active: !s.active });
      addToast(s.active ? t('staffDashboard.toastServiceDeactivated') : t('staffDashboard.toastServiceActivated'), 'success');
      loadServices();
    } catch { addToast(t('staffDashboard.toastServiceToggleError'), 'error'); }
  };

  return (
    <div className="dash-body">
      {toasts.length > 0 && (
        <div className="dash-toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`dash-toast glass-panel ${t.type}`}>
              <span className="dash-toast-icon">{t.type === 'success' ? '✅' : '❌'}</span>
              <span className="dash-toast-message">{t.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dash-header">
        <h1 className="text-gradient">{t('staffDashboard.title')}</h1>
        <div className="dash-user-info">
          {plan && plan.trial_end_date && plan.status !== 'active' && (
            <span className={`dash-trial-badge${Math.max(0, Math.ceil((new Date(plan.trial_end_date).getTime() - Date.now()) / 86400000)) < 3 ? ' dash-trial-critical' : ''}`}>
              {t('staffDashboard.trialBadge', { days: Math.max(0, Math.ceil((new Date(plan.trial_end_date).getTime() - Date.now()) / 86400000)) })}
            </span>
          )}
          <Link to="/staff/landing-editor" className="dash-btn dash-btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>{t('staffDashboard.landingPageLink')}</Link>
          {settings.slug && <a href={`/p/${settings.slug}`} target="_blank" rel="noopener noreferrer" className="dash-btn btn btn-secondary" style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}>{t('staffDashboard.viewLanding')}</a>}
          {settings.slug && <button onClick={() => setShowQR(true)} className="dash-btn btn btn-secondary" style={{ fontSize: 13, padding: '8px 14px', textDecoration: 'none' }}>{t('staffDashboard.qrButton')}</button>}
          <button onClick={() => setShowSettings(p => !p)} className="dash-btn btn btn-secondary" style={{ fontSize: 14, padding: '8px 16px', fontWeight: 500, borderRadius: 8 }}>{t('staffDashboard.settingsButton')}</button>
          <span className="dash-user-name">{staffName || t('staffDashboard.userNameLoading')}</span>
          <button className="dash-btn dash-btn-danger" onClick={handleLogout}>{t('staffDashboard.logoutButton')}</button>
        </div>
      </div>

      <div className="dash-container" style={{ maxWidth: 700, margin: '0 auto 24px' }}>
        <PushNotificationToggle />
      </div>

      {showSettings && (
        <div className="dash-container">
          <div className="glass-panel" style={{ padding: 32, marginBottom: 32, display: 'block' }}>
            <div className="dash-panel-header">
              <h3 className="text-gradient">{t('staffDashboard.settingsTitle')}</h3>
              <button onClick={() => setShowSettings(false)} className="dash-close-btn">✕</button>
            </div>
            <form className="dash-form-grid" onSubmit={e => { e.preventDefault(); saveSettings(); }}>
              <div className="dash-form-group">
                <label>{t('staffDashboard.businessNameLabel')}</label>
                <input type="text" className="glass-input" value={settings.business_name} onChange={e => setSettings(p => ({ ...p, business_name: e.target.value }))} placeholder={t('staffDashboard.businessNamePlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.addressLabel')}</label>
                <input type="text" className="glass-input" value={settings.business_address} onChange={e => setSettings(p => ({ ...p, business_address: e.target.value }))} placeholder={t('staffDashboard.addressPlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.notificationEmailLabel')}</label>
                <input type="email" className="glass-input" value={settings.notification_email} onChange={e => setSettings(p => ({ ...p, notification_email: e.target.value }))} placeholder={t('staffDashboard.notificationEmailPlaceholder')} />
                <small>{t('staffDashboard.notificationEmailHint')}</small>
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.contactWhatsAppLabel')}</label>
                <input type="tel" className="glass-input" value={settings.business_phone} onChange={e => setSettings(p => ({ ...p, business_phone: e.target.value }))} placeholder={t('staffDashboard.contactWhatsAppPlaceholder')} />
                <small>{t('staffDashboard.contactWhatsAppHint')}</small>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>{t('staffDashboard.hoursTitle')}</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="dash-form-group">
                      <label>{t('staffDashboard.openingHourLabel')}</label>
                      <select className="glass-input" value={openingHours.startHour} onChange={e => setOpeningHours(p => ({ ...p, startHour: parseInt(e.target.value, 10) }))}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                    <div className="dash-form-group">
                      <label>{t('staffDashboard.closingHourLabel')}</label>
                      <select className="glass-input" value={openingHours.endHour} onChange={e => setOpeningHours(p => ({ ...p, endHour: parseInt(e.target.value, 10) }))}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="dash-form-group" style={{ marginTop: 8 }}>
                    <label>{t('staffDashboard.workDaysLabel')}</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { v: 1, l: t('staffDashboard.dayLun') }, { v: 2, l: t('staffDashboard.dayMar') }, { v: 3, l: t('staffDashboard.dayMie') },
                        { v: 4, l: t('staffDashboard.dayJue') }, { v: 5, l: t('staffDashboard.dayVie') }, { v: 6, l: t('staffDashboard.daySab') }, { v: 0, l: t('staffDashboard.dayDom') }
                      ].map(d => (
                        <label key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14, color: 'var(--text-main)' }}>
                          <input type="checkbox" checked={openingHours.workDays.includes(d.v)} onChange={() => {
                            setOpeningHours(p => ({
                              ...p,
                              workDays: p.workDays.includes(d.v) ? p.workDays.filter(w => w !== d.v) : [...p.workDays, d.v].sort(),
                            }));
                          }} />
                          {d.l}
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>{t('staffDashboard.blockedDatesTitle')}</summary>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{t('staffDashboard.blockedDatesHint')}</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'end' }}>
                    <div className="dash-form-group" style={{ flex: 1 }}>
                      <input type="date" className="glass-input" value={newBlockedDate.date} onChange={e => setNewBlockedDate(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div className="dash-form-group" style={{ flex: 1 }}>
                      <input type="text" className="glass-input" value={newBlockedDate.reason} onChange={e => setNewBlockedDate(p => ({ ...p, reason: e.target.value }))} placeholder={t('staffDashboard.blockedDatesReasonPlaceholder')} />
                    </div>
                    <button className="dash-btn dash-btn-primary" onClick={addBlockedDate} style={{ whiteSpace: 'nowrap' }}>{t('staffDashboard.blockedDatesAddLabel')}</button>
                  </div>
                  {blockedDates.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('staffDashboard.blockedDatesEmpty')}</p>
                  ) : (
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', fontSize: 12, color: '#94a3b8' }}>{t('staffDashboard.blockedDatesDelete')}</th>
                            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', fontSize: 12, color: '#94a3b8' }}>Fecha</th>
                            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', fontSize: 12, color: '#94a3b8' }}>Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blockedDates.map(bd => (
                            <tr key={bd.id}>
                              <td style={{ padding: '6px 10px' }}>
                                <button className="dash-btn dash-btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteBlockedDate(bd.id)}>✕</button>
                              </td>
                              <td style={{ padding: '6px 10px', fontSize: 13 }}>{new Date(bd.date).toLocaleDateString('es-UY')}</td>
                              <td style={{ padding: '6px 10px', fontSize: 13 }}>{bd.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>{t('staffDashboard.remindersTitle')}</summary>
                  <div className="dash-form-group">
                    <label>{t('staffDashboard.reminderHoursLabel')}</label>
                    <select className="glass-input" value={settings.reminder_hours ?? 24} onChange={e => setSettings(p => ({ ...p, reminder_hours: parseInt(e.target.value, 10) }))}>
                      <option value={1}>1 {t('staffDashboard.reminderHour')}</option>
                      <option value={2}>2 {t('staffDashboard.reminderHours')}</option>
                      <option value={4}>4 {t('staffDashboard.reminderHours')}</option>
                      <option value={12}>12 {t('staffDashboard.reminderHours')}</option>
                      <option value={24}>24 {t('staffDashboard.reminderHours')}</option>
                      <option value={48}>48 {t('staffDashboard.reminderHours')}</option>
                      <option value={72}>72 {t('staffDashboard.reminderHours')}</option>
                    </select>
                    <small>{t('staffDashboard.reminderHoursHint')}</small>
                  </div>
                </details>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>{t('staffDashboard.captchaTitle')}</summary>
                  <div className="dash-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!settings.captcha_enabled} onChange={e => setSettings(p => ({ ...p, captcha_enabled: e.target.checked }))} style={{ width: 18, height: 18 }} />
                      {t('staffDashboard.captchaEnabledLabel')}
                    </label>
                    <small>{t('staffDashboard.captchaHint')}</small>
                  </div>
                </details>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-main)', fontSize: 15, marginBottom: 12 }}>{t('staffDashboard.smtpTitle')}</summary>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{t('staffDashboard.smtpHint')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="dash-form-group">
                      <label>{t('staffDashboard.smtpEmailLabel')}</label>
                      <input type="email" className="glass-input" value={settings.smtp_email || ''} onChange={e => setSettings(p => ({ ...p, smtp_email: e.target.value }))} placeholder={t('staffDashboard.notificationEmailPlaceholder')} />
                    </div>
                    <div className="dash-form-group">
                      <label>{t('staffDashboard.smtpPasswordLabel')}</label>
                      <input type="password" className="glass-input" value={settings.smtp_password || ''} onChange={e => setSettings(p => ({ ...p, smtp_password: e.target.value }))} placeholder="••••••••" />
                      <small style={{ color: 'var(--text-muted)' }}>{t('staffDashboard.smtpPasswordHint')}</small>
                    </div>
                  </div>
                </details>
              </div>

              <div className="dash-form-group full-width" style={{ textAlign: 'right', marginTop: 10 }}>
                <button type="submit" className="dash-btn dash-btn-success">{t('staffDashboard.saveSettings')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          {(['list', 'calendar', 'staff', 'services', 'clients', 'billing', 'analytics', 'coupons', 'waitlist'] as Tab[]).map(tab => (
            <button key={tab} className={`dash-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'list' ? t('staffDashboard.tabList') : tab === 'calendar' ? t('staffDashboard.tabCalendar') : tab === 'staff' ? t('staffDashboard.tabStaff') : tab === 'services' ? t('staffDashboard.tabServices') : tab === 'clients' ? t('staffDashboard.tabClients') : tab === 'billing' ? t('staffDashboard.tabBilling') : tab === 'coupons' ? t('staffDashboard.tabCoupons') : tab === 'waitlist' ? t('staffDashboard.tabWaitlist') : t('staffDashboard.tabAnalytics')}
            </button>
          ))}
          <button className="dash-tab" onClick={exportToCSV}>{t('staffDashboard.exportCSV')}</button>
          <button className="dash-tab" onClick={() => exportAppointmentsPdf(appointments, settings)}>{t('staffDashboard.exportPDF')}</button>
        </div>

        {activeTab !== 'staff' && activeTab !== 'services' && activeTab !== 'clients' && staffList.length > 0 && (
          <div id="dashStaffFilterContainer" className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '20px 0', padding: 16 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t('staffDashboard.staffFilterLabel')}</span>
            <div id="dashStaffFilterButtons" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className={`dash-staff-filter-btn${selectedStaff === '' ? ' active' : ''}`} onClick={() => { setPage(1); setSelectedStaff(''); }}>{t('staffDashboard.staffFilterAll')}</button>
              {staffList.filter(s => s.active !== false).map(s => (
                <button key={s.id} className={`dash-staff-filter-btn${selectedStaff === s.id ? ' active' : ''}`} onClick={() => { setPage(1); setSelectedStaff(s.id); }}>{s.name}</button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <>
            <div className="dash-filters glass-panel">
              <div className="dash-filter-group">
                <label>{t('staffDashboard.filterDateLabel')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.25)' }}>
                    {(['day', 'week', 'month'] as const).map(m => (
                      <button key={m} onClick={() => { setPage(1); setFilterMode(m); }}
                        style={{
                          padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                          background: filterMode === m ? 'var(--accent)' : 'transparent',
                          color: filterMode === m ? '#fff' : 'var(--text-muted)',
                          transition: 'all 0.15s'
                        }}>{m === 'day' ? 'Día' : m === 'week' ? 'Semana' : 'Mes'}</button>
                    ))}
                  </div>
                  <input type="date" className="glass-input" value={filterDate} onChange={e => { setPage(1); setFilterDate(e.target.value); }} style={{ flex: 1, minWidth: 0 }} />
                </div>
              </div>
              <div className="dash-filter-group">
                <label>{t('staffDashboard.filterStatusLabel')}</label>
                <select className="glass-input" value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value); }}>
                  <option value="">{t('staffDashboard.filterStatusAll')}</option>
                  <option value="confirmed">{t('staffDashboard.filterStatusConfirmed')}</option>
                  <option value="completed">{t('staffDashboard.filterStatusCompleted')}</option>
                  <option value="cancelled">{t('staffDashboard.filterStatusCancelled')}</option>
                  <option value="pending">{t('staffDashboard.filterStatusPending')}</option>
                  <option value="no-show">{t('staffDashboard.filterStatusNoShow')}</option>
                </select>
              </div>
              <div className="dash-filter-group">
                <label>{t('staffDashboard.filterPhoneLabel')}</label>
                <input type="text" className="glass-input" placeholder={t('staffDashboard.filterPhonePlaceholder')} value={filterPhone} onChange={e => setFilterPhone(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="dash-btn dash-btn-success" onClick={() => {
                setNewApptForm({ clientName: '', clientPhone: '', clientEmail: '', serviceId: '', staffId: '', appointmentDate: filterDate, appointmentTime: '', notes: '' });
                setShowNewAppointment(true);
              }}>{t('staffDashboard.newAppointmentButton')}</button>
            </div>

            {loading ? (
              <div className="dash-loading">
                <div className="dash-loading-spinner"></div>
                {t('staffDashboard.loadingAppointments')}
              </div>
            ) : appointments.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">{t('staffDashboard.emptyTitle')}</h3>
                <p>{t('staffDashboard.emptyMessage')}</p>
              </div>
            ) : (
              <div className="dash-appointments-list">
                {appointments.filter(a => !filterPhone || ((a.phone || a.client_phone || '') && (a.phone || a.client_phone || '').includes(filterPhone))).map(a => (
                  <div key={a.id} className={`dash-appointment-card glass-panel ${a.status}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedAppointment(a)}>
                    <div className="dash-appointment-header">
                      <div>
                        <div className="dash-appointment-time">{a.time}</div>
                        <div className="dash-appointment-date">{a.date}</div>
                      </div>
                      {getStatusBadge(a.status)}
                    </div>
                    <div className="dash-appointment-body">
                      <div className="dash-info-group">
                        <label>{t('staffDashboard.apptClient')}</label>
                        <span>{a.client_name}</span>
                      </div>
                      <div className="dash-info-group">
                        <label>{t('staffDashboard.apptService')}</label>
                        <span>{a.service_name || a.service || '-'}</span>
                      </div>
                      <div className="dash-info-group">
                        <label>{t('staffDashboard.apptStaff')}</label>
                        <span>{a.staff_name || '-'}</span>
                      </div>
                    </div>
                    {a.notes && <div className="dash-appointment-notes">{a.notes}</div>}
                    {(a.phone || a.client_phone) && (
                      <div style={{ padding: '0 16px 8px' }}>
                        <a href={`https://wa.me/${(a.phone || a.client_phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t('staffDashboard.apptWhatsApp')}</a>
                      </div>
                    )}
                    <div className="dash-appointment-actions" onClick={e => e.stopPropagation()}>
                      {a.status === 'pending' && (
                        <button className="dash-btn dash-btn-success" onClick={() => updateStatus(a.id, 'confirmed')}>{t('staffDashboard.apptConfirm')}</button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button className="dash-btn dash-btn-complete" onClick={() => updateStatus(a.id, 'completed')}>{t('staffDashboard.apptComplete')}</button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && (
                        <button className="dash-btn dash-btn-cancel" onClick={() => updateStatus(a.id, 'cancelled')}>{t('staffDashboard.apptCancel')}</button>
                      )}
                      {a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no-show' && (
                        <button className="dash-btn dash-btn-noshow" onClick={() => updateStatus(a.id, 'no-show')}>{t('staffDashboard.apptNoShow')}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20, padding: 12 }}>
                <button className="dash-btn dash-btn-success" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ opacity: page <= 1 ? 0.4 : 1 }}>{t('staffDashboard.paginationPrev')}</button>
                <span style={{ color: 'var(--text-muted)', fontSize: 14, padding: '0 8px' }}>
                  {t('staffDashboard.paginationInfo', { page, totalPages, totalAppointments })}
                </span>
                <button className="dash-btn dash-btn-success" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ opacity: page >= totalPages ? 0.4 : 1 }}>{t('staffDashboard.paginationNext')}</button>
              </div>
            )}
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="glass-panel" style={{ padding: 28, marginTop: 16, minHeight: 550 }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              buttonText={{ today: t('staffDashboard.calendarToday'), month: t('staffDashboard.calendarMonth'), week: t('staffDashboard.calendarWeek'), day: t('staffDashboard.calendarDay'), list: t('staffDashboard.calendarList') }}
              firstDay={1}
              height={650}
              events={appointments.map(a => {
                const start = a.appointment_date || (a.date && a.time ? `${a.date}T${a.time}` : a.date) || undefined;
                const colors: Record<string, { bg: string; border: string }> = {
                  confirmed: { bg: 'rgba(34,197,94,0.25)', border: '#22c55e' },
                  completed: { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6' },
                  cancelled: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444' },
                  'no-show': { bg: 'rgba(168,85,247,0.2)', border: '#a855f7' },
                  pending: { bg: 'rgba(234,179,8,0.25)', border: '#eab308' },
                };
                const c = colors[a.status] || colors.pending;
                return {
                  id: String(a.id),
                  title: `${a.client_name}${(a.service_name || a.service) ? ` - ${a.service_name || a.service}` : ''}`,
                  start,
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  textColor: '#e2e8f0',
                  extendedProps: { appt: a },
                };
              })}
              eventContent={(arg) => ({
                html: `<div style="padding:2px 4px;font-size:12px;line-height:1.3">${arg.event.title}</div>`,
              })}
              eventClick={(info) => {
                const appt = info.event.extendedProps.appt as Appointment;
                if (appt) setSelectedAppointment(appt);
              }}
            />
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.clientsTitle')}</h3>
            </div>
            <div className="dash-filters glass-panel" style={{ marginBottom: 20 }}>
              <div className="dash-filter-group" style={{ flex: 1 }}>
                <label>{t('staffDashboard.clientsSearchLabel')}</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder={t('staffDashboard.clientsSearchPlaceholder')}
                  value={clientsSearch}
                  onChange={e => { setClientsSearch(e.target.value); loadClients(e.target.value); }}
                />
              </div>
            </div>
            {clientsLoading ? (
              <div className="dash-loading">
                <div className="dash-loading-spinner"></div>
                {t('staffDashboard.clientsLoading')}
              </div>
            ) : clientsList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">{t('staffDashboard.clientsEmptyTitle')}</h3>
                <p>{clientsSearch ? t('staffDashboard.clientsEmptyNoMatch') : t('staffDashboard.clientsEmptyNone')}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableName')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTablePhone')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableEmail')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableAppointments')}</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableLastVisit')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.clientsTableAction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsList.map(c => (
                      <tr key={c.client_phone}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{c.client_name}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{c.client_phone}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{c.client_email || '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{c.total_appointments}</td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{new Date(c.last_appointment).toLocaleDateString('es-UY')}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button className="dash-btn dash-btn-success" onClick={() => openClientHistory(c)}>{t('staffDashboard.clientsHistoryButton')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            {plan ? (
              <div className="glass-panel" style={{ marginBottom: 20, padding: 20, border: '1px solid rgba(197,168,128,0.35)' }}>
                <h3 className="text-gradient" style={{ margin: '0 0 8px' }}>{t('staffDashboard.billingYourPlan')}</h3>
                <p id="planStatusText" style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>
                  {plan.plan && plan.status ? t('staffDashboard.billingPlanInfo', { plan: plan.plan, status: plan.status }) : t('staffDashboard.billingPlanInfo', { plan: 'No disponible', status: 'No disponible' })}
                </p>
                {plan.status !== 'active' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                    <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>{t('staffDashboard.billingPlanPro')}</button>
                    <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>{t('staffDashboard.billingPlanEnterprise')}</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel" style={{ marginBottom: 20, padding: 20, border: '1px solid rgba(197,168,128,0.35)' }}>
                <h3 className="text-gradient" style={{ margin: '0 0 8px' }}>{t('staffDashboard.billingYourPlan')}</h3>
                <p style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>
                  {t('staffDashboard.billingPlanInfo', { plan: 'No disponible', status: 'No disponible' })}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                  <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('pro')}>{t('staffDashboard.billingPlanPro')}</button>
                  <button className="dash-btn dash-btn-success" onClick={() => subscribeToPlan('enterprise')}>{t('staffDashboard.billingPlanEnterprise')}</button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0 }}>{t('staffDashboard.billingTitle')}</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>{t('staffDashboard.billingDescription')}</p>
              </div>
              <button className="dash-btn dash-btn-success" onClick={() => api.get<{ invoices: Invoice[] }>('/api/tenant/invoices').then(d => setInvoices(d.invoices))}>{t('staffDashboard.billingRefresh')}</button>
            </div>
            {invoices.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">{t('staffDashboard.billingEmptyTitle')}</h3>
                <p>{t('staffDashboard.billingEmptyMessage')}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table className="dash-invoice-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableNumber')}</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableAmount')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableDue')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableStatus')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.invoiceTableAction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ padding: 12 }}>#{inv.id}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>${inv.amount}</td>
                        <td style={{ padding: 12 }}>{inv.due_date}</td>
                        <td style={{ padding: 12 }}><span className={`dash-appointment-status dash-status-${inv.status}`}>{inv.status}</span></td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {inv.status === 'pending' && (
                            <button className="dash-btn dash-btn-success" onClick={() => handlePayInvoice(inv.id)}>{t('staffDashboard.invoicePayButton')}</button>
                          )}
                          <button className="dash-btn" style={{ marginLeft: inv.status === 'pending' ? 4 : 0, padding: '6px 10px', fontSize: 12 }} onClick={() => exportInvoicePdf(inv, settings)}>{t('staffDashboard.invoiceDownloadPdf')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.staffTitle')}</h3>
              <button className="dash-btn dash-btn-success" onClick={openStaffCreate}>{t('staffDashboard.staffNewButton')}</button>
            </div>
            {staffList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">{t('staffDashboard.staffEmptyTitle')}</h3>
                <p>{t('staffDashboard.staffEmptyMessage')}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableName')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableEmail')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableSpecialties')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableCommission')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableStatus')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{s.email || '-'}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{(s.specialties || []).join(', ') || '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {s.commission_type === 'percentage' ? `${s.commission_value}%` : s.commission_type === 'fixed' ? `$${s.commission_value}` : '-'}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span className={`dash-appointment-status ${s.active !== false ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                            {s.active !== false ? t('staffDashboard.staffActive') : t('staffDashboard.staffInactive')}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => openStaffEdit(s)}>{t('staffDashboard.staffEditButton')}</button>
                          <button className="dash-btn dash-btn-danger" onClick={() => deleteStaff(s.id, s.name)}>{t('staffDashboard.staffDeleteButton')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.servicesTitle')}</h3>
              <button className="dash-btn dash-btn-success" onClick={openServiceCreate}>{t('staffDashboard.servicesNewButton')}</button>
            </div>
            {servicesList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h3 className="text-gradient">{t('staffDashboard.servicesEmptyTitle')}</h3>
                <p>{t('staffDashboard.servicesEmptyMessage')}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableName')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableCategory')}</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableDuration')}</th>
                      <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTablePrice')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableActive')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.servicesTableActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesList.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{s.category || '-'}</td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{s.duration} {t('landingServices.minutes')}</td>
                        <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{t('landingServices.pricePrefix')}{s.price}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button
                            onClick={() => toggleServiceActive(s)}
                            className={`dash-appointment-status ${s.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {s.active ? t('staffDashboard.servicesYes') : t('staffDashboard.servicesNo')}
                          </button>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => openServiceEdit(s)}>{t('staffDashboard.servicesEditButton')}</button>
                          <button className="dash-btn dash-btn-danger" onClick={() => deleteService(s.id, s.name)}>{t('staffDashboard.servicesDeleteButton')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.couponsTitle')}</h3>
              <button className="dash-btn dash-btn-primary" onClick={openCouponCreate}>{t('staffDashboard.couponsNewButton')}</button>
            </div>
            {couponsList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h4>{t('staffDashboard.couponsEmptyTitle')}</h4>
                <p>{t('staffDashboard.couponsEmptyMessage')}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableCode')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableDiscount')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableUses')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableExpires')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.couponsTableStatus')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couponsList.map(c => (
                      <tr key={c.id}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{c.code}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                        <td style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>{c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                        <td style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span className={`dash-appointment-status ${c.active ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                            {c.active ? t('staffDashboard.couponsActive') : t('staffDashboard.couponsInactive')}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button className="dash-btn dash-btn-success" style={{ marginRight: 8 }} onClick={() => openCouponEdit(c)}>{t('staffDashboard.staffEditButton')}</button>
                          <button className="dash-btn dash-btn-danger" onClick={() => deleteCoupon(c.id, c.code)}>{t('staffDashboard.staffDeleteButton')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'waitlist' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.waitlistTitle')}</h3>
              <button className="dash-btn dash-btn-secondary" onClick={loadWaitlist} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ↻ {t('staffDashboard.waitlistRefresh')}
              </button>
            </div>
            {waitlistLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : waitlistList.length === 0 ? (
              <div className="dash-empty-state glass-panel">
                <h4>{t('staffDashboard.waitlistEmptyTitle')}</h4>
                <p>{t('staffDashboard.waitlistEmptyMessage')}</p>
              </div>
            ) : (
              <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableClient')}</th>
                      <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTablePhone')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableService')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableStaff')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableStatus')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.waitlistTableDate')}</th>
                      <th style={{ textAlign: 'center', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlistList.map(e => (
                      <tr key={e.id}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{e.client_name}</td>
                        <td style={{ padding: 12, color: 'var(--text-muted)' }}>{e.client_phone}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{e.service_name || '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{e.staff_name || '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span className={`dash-appointment-status ${e.status === 'waiting' ? 'dash-status-pending' : e.status === 'notified' ? 'dash-status-confirmed' : 'dash-status-cancelled'}`}>
                            {e.status === 'waiting' ? t('staffDashboard.waitlistStatusWaiting') : e.status === 'notified' ? t('staffDashboard.waitlistStatusNotified') : e.status === 'converted' ? t('staffDashboard.waitlistStatusConverted') : t('staffDashboard.waitlistStatusExpired')}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {e.status === 'waiting' && (
                            <button className="dash-btn dash-btn-success" style={{ marginRight: 8, fontSize: 12 }} onClick={() => notifyWaitlistEntry(e.id)}>
                              {t('staffDashboard.waitlistNotify')}
                            </button>
                          )}
                          <button className="dash-btn dash-btn-danger" style={{ fontSize: 12 }} onClick={() => deleteWaitlistEntry(e.id)}>
                            {t('staffDashboard.waitlistDelete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h3 className="text-gradient" style={{ margin: 0 }}>{t('staffDashboard.analyticsTitle')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
                  {(['6m', '12m', 'all'] as const).map(r => (
                    <button key={r} onClick={() => { setAnalyticsDateRange(r); loadAnalytics(false, r); }}
                      style={{
                        padding: '4px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: analyticsDateRange === r ? 'rgba(197,168,128,0.25)' : 'transparent',
                        color: analyticsDateRange === r ? '#c5a880' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                      }}>
                      {r === '6m' ? t('staffDashboard.analytics6m') : r === '12m' ? t('staffDashboard.analytics12m') : t('staffDashboard.analyticsAll')}
                    </button>
                  ))}
                </div>
                <button className="dash-btn dash-btn-secondary" onClick={() => loadAnalytics(true, analyticsDateRange)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  ↻ {t('staffDashboard.analyticsRefresh')}
                </button>
              </div>
            </div>

            {analyticsLoading && !analyticsSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="dash-stats" style={{ marginBottom: 0 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="dash-stat-card glass-panel" style={{ height: 96 }}>
                      <div style={{ width: '60%', height: 14, background: 'rgba(148,163,184,0.12)', borderRadius: 6, marginBottom: 12 }} />
                      <div style={{ width: '40%', height: 28, background: 'rgba(148,163,184,0.08)', borderRadius: 6 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {[1, 2].map(i => (
                    <div key={i} className="glass-panel" style={{ padding: 20, height: 320 }}>
                      <div style={{ width: '50%', height: 16, background: 'rgba(148,163,184,0.12)', borderRadius: 6, marginBottom: 20 }} />
                      <div style={{ width: '100%', height: 260, background: 'rgba(148,163,184,0.06)', borderRadius: 8 }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : analyticsError ? (
              <div className="dash-empty-state glass-panel">
                <p>{t('staffDashboard.analyticsErrorState')}</p>
                <button className="dash-btn dash-btn-primary" onClick={() => loadAnalytics(true, analyticsDateRange)} style={{ marginTop: 12 }}>
                  {t('staffDashboard.analyticsRetry')}
                </button>
              </div>
            ) : (
              <>
                <div className="dash-stats" style={{ marginBottom: 24 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>{t('staffDashboard.analyticsRevenueChart')}</h4>
                    {revenueByMonth.length > 0 ? (
                      <RevenueChart data={revenueByMonth} />
                    ) : (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t('staffDashboard.analyticsNoData')}</p>
                    )}
                  </div>
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>{t('staffDashboard.analyticsTopServices')}</h4>
                    {topServices.length > 0 ? (
                      <TopServicesChart data={topServices} />
                    ) : (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t('staffDashboard.analyticsNoData')}</p>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20 }}>
                  <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>{t('staffDashboard.analyticsTopServicesTable')}</h4>
                  {topServices.length > 0 ? (
                    <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.analyticsServiceName')}</th>
                            <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.analyticsServiceCount')}</th>
                            <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.analyticsServiceAvgPrice')}</th>
                            <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.analyticsServiceRevenue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topServices.map(s => (
                            <tr key={s.service}>
                              <td style={{ padding: 12, fontWeight: 600 }}>{s.service}</td>
                              <td style={{ padding: 12, textAlign: 'right' }}>{s.count}</td>
                              <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>${Math.round(s.avg_price).toLocaleString()}</td>
                              <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>${Math.round(s.count * s.avg_price).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t('staffDashboard.analyticsNoData')}</p>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: 20, marginTop: 24 }}>
                  <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>{t('staffDashboard.analyticsRevenueByStaff')}</h4>
                  {revenueByStaff.length > 0 ? (
                    <div className="dash-table-responsive" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.staffTableName')}</th>
                            <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.analyticsStaffAppointments')}</th>
                            <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid rgba(148,163,184,0.25)' }}>{t('staffDashboard.analyticsStaffRevenue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueByStaff.map(s => (
                            <tr key={s.id}>
                              <td style={{ padding: 12, fontWeight: 600 }}>{s.name}</td>
                              <td style={{ padding: 12, textAlign: 'right' }}>{s.appointments}</td>
                              <td style={{ padding: 12, textAlign: 'right', color: 'var(--text-muted)' }}>${Math.round(s.revenue).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t('staffDashboard.analyticsNoData')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

        {/* Staff Modal */}
      {staffModal.open && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setStaffModal({ open: false, editing: null })}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{staffModal.editing ? t('staffDashboard.staffModalEditTitle') : t('staffDashboard.staffModalNewTitle')}</h3>
              <button onClick={() => setStaffModal({ open: false, editing: null })} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalNameLabel')}</label>
                <input type="text" className="glass-input" value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} placeholder={t('staffDashboard.staffModalNamePlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalEmailLabel')}</label>
                <input type="email" className="glass-input" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} placeholder={t('staffDashboard.staffModalEmailPlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalSpecialtiesLabel')}</label>
                <input type="text" className="glass-input" value={staffForm.specialties} onChange={e => setStaffForm(p => ({ ...p, specialties: e.target.value }))} placeholder={t('staffDashboard.staffModalSpecialtiesPlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalPhotoLabel')}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="text" className="glass-input" value={staffForm.photo_url} onChange={e => setStaffForm(p => ({ ...p, photo_url: e.target.value }))} placeholder={t('staffDashboard.staffModalPhotoPlaceholder')} style={{ flex: 1 }} />
                  <input type="file" accept="image/*" onChange={handleStaffPhotoUpload} disabled={staffUploadingPhoto} style={{ display: 'none' }} id="staffPhotoInput" />
                  <button type="button" className="dash-btn dash-btn-secondary" onClick={() => document.getElementById('staffPhotoInput')?.click()} disabled={staffUploadingPhoto}>
                    {staffUploadingPhoto ? '⏳' : '📷'}
                    {staffUploadingPhoto ? t('staffDashboard.uploading') : t('staffDashboard.upload')}
                  </button>
                </div>
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalBioLabel')}</label>
                <textarea className="glass-input" value={staffForm.bio} onChange={e => setStaffForm(p => ({ ...p, bio: e.target.value }))} placeholder={t('staffDashboard.staffModalBioPlaceholder')} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.staffModalCommissionType')}</label>
                <select className="glass-input" value={staffForm.commission_type} onChange={e => setStaffForm(p => ({ ...p, commission_type: e.target.value }))}>
                  <option value="none">{t('staffDashboard.commissionNone')}</option>
                  <option value="percentage">{t('staffDashboard.commissionPercentage')}</option>
                  <option value="fixed">{t('staffDashboard.commissionFixed')}</option>
                </select>
              </div>
              {staffForm.commission_type !== 'none' && (
                <div className="dash-form-group">
                  <label>{t('staffDashboard.staffModalCommissionValue')}</label>
                  <input type="number" className="glass-input" value={staffForm.commission_value} onChange={e => setStaffForm(p => ({ ...p, commission_value: e.target.value }))} placeholder={staffForm.commission_type === 'percentage' ? '10' : '0'} min="0" step={staffForm.commission_type === 'percentage' ? '1' : '0.01'} />
                </div>
              )}
              <div className="dash-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={staffForm.useIndividualHours} onChange={e => setStaffForm(p => ({ ...p, useIndividualHours: e.target.checked }))} />
                  {t('staffDashboard.staffModalCustomHours')}
                </label>
              </div>
              {staffForm.useIndividualHours && (
                <div style={{ background: 'var(--glass-bg)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <div className="dash-form-group">
                    <label>{t('staffDashboard.staffModalStartHour')}</label>
                    <select className="glass-input" value={staffForm.indStart} onChange={e => setStaffForm(p => ({ ...p, indStart: e.target.value }))}>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                  <div className="dash-form-group">
                    <label>{t('staffDashboard.staffModalEndHour')}</label>
                    <select className="glass-input" value={staffForm.indEnd} onChange={e => setStaffForm(p => ({ ...p, indEnd: e.target.value }))}>
                      {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                    </select>
                  </div>
                  <div className="dash-form-group">
                    <label>{t('staffDashboard.staffModalWorkDays')}</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { v: 0, l: t('staffDashboard.dayDom') }, { v: 1, l: t('staffDashboard.dayLun') }, { v: 2, l: t('staffDashboard.dayMar') }, { v: 3, l: t('staffDashboard.dayMie') },
                        { v: 4, l: t('staffDashboard.dayJue') }, { v: 5, l: t('staffDashboard.dayVie') }, { v: 6, l: t('staffDashboard.daySab') }
                      ].map(d => (
                        <label key={d.v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={staffForm.indWorkDays.includes(d.v)}
                            onChange={() => setStaffForm(p => ({
                              ...p,
                              indWorkDays: p.indWorkDays.includes(d.v)
                                ? p.indWorkDays.filter(w => w !== d.v)
                                : [...p.indWorkDays, d.v].sort()
                            }))} />
                          {d.l}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setStaffModal({ open: false, editing: null })}>{t('staffDashboard.staffModalCancel')}</button>
                <button className="dash-btn dash-btn-success" onClick={saveStaff}>{staffModal.editing ? t('staffDashboard.staffModalSave') : t('staffDashboard.staffModalCreate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {servicesModal.open && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setServicesModal({ open: false, editing: null })}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{servicesModal.editing ? t('staffDashboard.servicesModalEditTitle') : t('staffDashboard.servicesModalNewTitle')}</h3>
              <button onClick={() => setServicesModal({ open: false, editing: null })} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>{t('staffDashboard.servicesModalNameLabel')}</label>
                <input type="text" className="glass-input" value={servicesForm.name} onChange={e => setServicesForm(p => ({ ...p, name: e.target.value }))} placeholder={t('staffDashboard.servicesModalNamePlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.servicesModalDurationLabel')}</label>
                <input type="number" className="glass-input" value={servicesForm.duration} onChange={e => setServicesForm(p => ({ ...p, duration: e.target.value }))} min="5" step="5" />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.servicesModalPriceLabel')}</label>
                <input type="number" className="glass-input" value={servicesForm.price} onChange={e => setServicesForm(p => ({ ...p, price: e.target.value }))} min="0" step="0.01" />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.servicesModalCategoryLabel')}</label>
                <input type="text" className="glass-input" value={servicesForm.category} onChange={e => setServicesForm(p => ({ ...p, category: e.target.value }))} placeholder={t('staffDashboard.servicesModalCategoryPlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.servicesModalImageLabel')}</label>
                <input type="text" className="glass-input" value={servicesForm.image} onChange={e => setServicesForm(p => ({ ...p, image: e.target.value }))} placeholder={t('staffDashboard.servicesModalImagePlaceholder')} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setServicesModal({ open: false, editing: null })}>{t('staffDashboard.servicesModalCancel')}</button>
                <button className="dash-btn dash-btn-success" onClick={saveService}>{servicesModal.editing ? t('staffDashboard.servicesModalSave') : t('staffDashboard.servicesModalCreate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {couponModal.open && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setCouponModal({ open: false, editing: null })}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{couponModal.editing ? t('staffDashboard.couponModalEditTitle') : t('staffDashboard.couponModalNewTitle')}</h3>
              <button onClick={() => setCouponModal({ open: false, editing: null })} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>{t('staffDashboard.couponModalCodeLabel')}</label>
                <input type="text" className="glass-input" value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder={t('staffDashboard.couponModalCodePlaceholder')} disabled={!!couponModal.editing} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.couponModalTypeLabel')}</label>
                <select className="glass-input" value={couponForm.discount_type} onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value }))}>
                  <option value="percentage">{t('staffDashboard.commissionPercentage')}</option>
                  <option value="fixed">{t('staffDashboard.commissionFixed')}</option>
                </select>
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.couponModalValueLabel')}</label>
                <input type="number" className="glass-input" value={couponForm.discount_value} onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))} min="0" step={couponForm.discount_type === 'percentage' ? '1' : '0.01'} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.couponModalMinAmount')}</label>
                <input type="number" className="glass-input" value={couponForm.min_appointment_amount} onChange={e => setCouponForm(p => ({ ...p, min_appointment_amount: e.target.value }))} min="0" step="0.01" placeholder="0" />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.couponModalMaxUses')}</label>
                <input type="number" className="glass-input" value={couponForm.max_uses} onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))} min="1" placeholder={t('staffDashboard.couponModalUnlimited')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.couponModalExpires')}</label>
                <input type="datetime-local" className="glass-input" value={couponForm.expires_at} onChange={e => setCouponForm(p => ({ ...p, expires_at: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setCouponModal({ open: false, editing: null })}>{t('staffDashboard.couponModalCancel')}</button>
                <button className="dash-btn dash-btn-success" onClick={saveCoupon}>{couponModal.editing ? t('staffDashboard.couponModalSave') : t('staffDashboard.couponModalCreate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewAppointment && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setShowNewAppointment(false)}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{t('staffDashboard.newAppointmentModalTitle')}</h3>
              <button onClick={() => setShowNewAppointment(false)} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptNameLabel')}</label>
                <input type="text" className="glass-input" value={newApptForm.clientName} onChange={e => setNewApptForm(p => ({ ...p, clientName: e.target.value }))} placeholder={t('staffDashboard.newApptNamePlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptPhoneLabel')}</label>
                <input type="tel" className="glass-input" value={newApptForm.clientPhone} onChange={e => { setNewApptForm(p => ({ ...p, clientPhone: e.target.value })); setSelectedSuggested(null); }} placeholder={t('staffDashboard.newApptPhonePlaceholder')} />
                {suggestedClients.length > 0 && (
                  <div style={{ position: 'relative', marginTop: 4 }}>
                    <div style={{ position: 'absolute', zIndex: 10, width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {suggestedClients.map(c => (
                        <div key={c.client_phone} onClick={() => {
                          setNewApptForm(p => ({ ...p, clientName: c.client_name, clientPhone: c.client_phone, clientEmail: c.client_email || '' }));
                          setSelectedSuggested(c);
                          setSuggestedClients([]);
                        }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span><strong>{c.client_name}</strong> - {c.client_phone}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{c.total_appointments} {t('staffDashboard.clientsTableAppointments')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedSuggested && <small style={{ color: 'var(--accent)', marginTop: 2, display: 'block' }}>{t('staffDashboard.clientsHistoryTotal')} {selectedSuggested.total_appointments} {t('staffDashboard.clientsTableAppointments')}</small>}
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptEmailLabel')}</label>
                <input type="email" className="glass-input" value={newApptForm.clientEmail} onChange={e => setNewApptForm(p => ({ ...p, clientEmail: e.target.value }))} placeholder={t('staffDashboard.newApptEmailPlaceholder')} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptServiceLabel')}</label>
                <select className="glass-input" value={newApptForm.serviceId} onChange={e => setNewApptForm(p => ({ ...p, serviceId: e.target.value }))}>
                  <option value="">{t('staffDashboard.newApptServicePlaceholder')}</option>
                  {servicesList.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({t('landingServices.pricePrefix')}{s.price} - {s.duration}{t('landingServices.minutes')})</option>
                  ))}
                </select>
              </div>
              {staffList.filter(s => s.active !== false).length > 0 && (
                <div className="dash-form-group">
                  <label>{t('staffDashboard.newApptStaffLabel')}</label>
                  <select className="glass-input" value={newApptForm.staffId} onChange={e => setNewApptForm(p => ({ ...p, staffId: e.target.value }))}>
                    <option value="">{t('staffDashboard.newApptStaffAny')}</option>
                    {staffList.filter(s => s.active !== false).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptDateLabel')}</label>
                <input type="date" className="glass-input" min={new Date().toISOString().split('T')[0]} value={newApptForm.appointmentDate} onChange={e => setNewApptForm(p => ({ ...p, appointmentDate: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptTimeLabel')}</label>
                <input type="time" className="glass-input" value={newApptForm.appointmentTime} onChange={e => setNewApptForm(p => ({ ...p, appointmentTime: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>{t('staffDashboard.newApptNotesLabel')}</label>
                <textarea className="glass-input" value={newApptForm.notes} onChange={e => setNewApptForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('staffDashboard.newApptNotesPlaceholder')} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="dash-btn dash-btn-danger" onClick={() => setShowNewAppointment(false)}>{t('staffDashboard.newApptCancel')}</button>
                <button className="dash-btn dash-btn-success" onClick={saveNewAppointment}>{t('staffDashboard.newApptCreate')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => { setSelectedClient(null); setClientHistory([]); }}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{t('staffDashboard.clientHistoryTitle', { name: selectedClient.client_name })}</h3>
              <button onClick={() => { setSelectedClient(null); setClientHistory([]); }} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div><strong>{t('staffDashboard.clientHistoryPhone')}</strong> {selectedClient.client_phone}</div>
                <div><strong>{t('staffDashboard.clientHistoryEmail')}</strong> {selectedClient.client_email || '-'}</div>
                <div><strong>{t('staffDashboard.clientHistoryTotal')}</strong> {selectedClient.total_appointments}</div>
              </div>
              {clientHistoryLoading ? (
                <div className="dash-loading">
                  <div className="dash-loading-spinner"></div>
                  {t('staffDashboard.clientHistoryLoading')}
                </div>
              ) : clientHistory.length === 0 ? (
                <p>{t('staffDashboard.clientHistoryEmpty')}</p>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryDate')}</th>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryService')}</th>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryStaff')}</th>
                        <th style={{ textAlign: 'center', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryStatus')}</th>
                        <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)' }}>{t('staffDashboard.clientHistoryNotes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientHistory.map(a => (
                        <tr key={a.id}>
                          <td style={{ padding: 10 }}>{new Date(a.appointment_date || a.date).toLocaleDateString('es-UY')} {a.time}</td>
                          <td style={{ padding: 10 }}>{a.service_name || a.service}</td>
                          <td style={{ padding: 10 }}>{a.staff_name || '-'}</td>
                          <td style={{ padding: 10, textAlign: 'center' }}>{getStatusBadge(a.status)}</td>
                          <td style={{ padding: 10, color: 'var(--text-muted)', fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.internal_notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div className="dash-modal-overlay" style={{ display: 'flex' }} onClick={() => setSelectedAppointment(null)}>
          <div className="dash-modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3 className="text-gradient">{t('staffDashboard.appointmentDetailTitle')}</h3>
              <button onClick={() => setSelectedAppointment(null)} className="dash-close-btn">✕</button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-modal-info-grid">
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptDetailClient')}</label>
                  <span>{selectedAppointment.client_name}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptDetailService')}</label>
                  <span>{selectedAppointment.service_name || selectedAppointment.service || '-'}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptDetailStaff')}</label>
                  <span>{selectedAppointment.staff_name || '-'}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptDetailDate')}</label>
                  <span>{selectedAppointment.date}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptDetailTime')}</label>
                  <span>{selectedAppointment.time}</span>
                </div>
                <div className="dash-info-group">
                  <label>{t('staffDashboard.apptDetailStatus')}</label>
                  <span>{getStatusBadge(selectedAppointment.status)}</span>
                </div>
              </div>
              {(selectedAppointment.phone || selectedAppointment.client_phone) && (
                <div className="dash-modal-info-full">
                  <div className="dash-info-group">
                    <label>{t('staffDashboard.apptDetailPhone')}</label>
                    <span>
                      <a href={`tel:${selectedAppointment.phone || selectedAppointment.client_phone}`} style={{ color: 'var(--primary-hover)', textDecoration: 'none', fontWeight: 600 }}>{selectedAppointment.phone || selectedAppointment.client_phone}</a>
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a href={`https://wa.me/${(selectedAppointment.phone || selectedAppointment.client_phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>{t('staffDashboard.apptDetailWhatsApp')}</a>
                  </div>
                </div>
              )}
              {selectedAppointment.email && (
                <div className="dash-modal-info-full">
                  <div className="dash-info-group">
                    <label>{t('staffDashboard.apptDetailEmail')}</label>
                    <span>{selectedAppointment.email}</span>
                  </div>
                </div>
              )}
              {selectedAppointment.notes && (
                <div className="dash-appointment-notes">{selectedAppointment.notes}</div>
              )}
              <div className="dash-info-group">
                <label>{t('staffDashboard.apptDetailInternalNotes')}</label>
                <textarea
                  className="glass-input"
                  rows={2}
                  defaultValue={selectedAppointment.internal_notes || ''}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val !== (selectedAppointment.internal_notes || '')) {
                      api.put(`/api/appointments/${selectedAppointment.id}/notes`, { internalNotes: val }).then(() => {
                        setSelectedAppointment(p => p ? { ...p, internal_notes: val } : null);
                      }).catch(() => addToast(t('staffDashboard.toastSaveNotesError'), 'error'));
                    }
                  }}
                  placeholder={t('staffDashboard.apptDetailInternalNotesPlaceholder')}
                  style={{ width: '100%', marginTop: 4, resize: 'vertical' }}
                />
              </div>
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 12 }}>
                <button
                  className="dash-btn dash-btn-ghost"
                  onClick={() => {
                    if (!showApptClientHistory) setShowApptClientHistory(true);
                    else setShowApptClientHistory(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  {t('staffDashboard.apptDetailClientHistory')}
                  <span style={{ marginLeft: 'auto' }}>{showApptClientHistory ? '▲' : '▼'}</span>
                </button>
                {showApptClientHistory && (
                  <div style={{ marginTop: 8 }}>
                    {apptClientHistoryLoading ? (
                      <div className="dash-loading" style={{ padding: 12 }}>
                        <div className="dash-loading-spinner"></div>
                      </div>
                    ) : apptClientHistory.length === 0 ? (
                      <p style={{ color: '#94a3b8', padding: 12 }}>{t('staffDashboard.apptDetailClientHistoryEmpty')}</p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', padding: '0 4px' }}>
                          <div style={{ background: 'rgba(148,163,184,0.1)', padding: '8px 14px', borderRadius: 8, flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{t('staffDashboard.apptDetailClientHistoryTotal')}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{apptClientHistory.length}</div>
                          </div>
                          <div style={{ background: 'rgba(148,163,184,0.1)', padding: '8px 14px', borderRadius: 8, flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{t('staffDashboard.apptDetailClientHistoryLastVisit')}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{new Date(apptClientHistory[0].appointment_date || apptClientHistory[0].date).toLocaleDateString('es-UY')}</div>
                          </div>
                          <div style={{ background: 'rgba(148,163,184,0.1)', padding: '8px 14px', borderRadius: 8, flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{t('staffDashboard.apptDetailClientHistoryTotalSpent')}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                              ${Math.round(apptClientHistory.reduce((sum, a) => sum + (Number(a.service_price) || 0), 0)).toLocaleString('es-UY')}
                            </div>
                          </div>
                        </div>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)', fontSize: 12, color: '#94a3b8' }}>{t('staffDashboard.apptDetailClientHistoryDate')}</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)', fontSize: 12, color: '#94a3b8' }}>{t('staffDashboard.apptDetailClientHistoryService')}</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)', fontSize: 12, color: '#94a3b8' }}>{t('staffDashboard.apptDetailClientHistoryStaff')}</th>
                                <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)', fontSize: 12, color: '#94a3b8' }}>{t('staffDashboard.apptDetailClientHistoryStatus')}</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(148,163,184,0.25)', position: 'sticky', top: 0, background: 'var(--bg-deep)', fontSize: 12, color: '#94a3b8' }}>{t('staffDashboard.apptDetailClientHistoryNotes')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {apptClientHistory.map(a => (
                                <tr key={a.id}>
                                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{new Date(a.appointment_date || a.date).toLocaleDateString('es-UY')}</td>
                                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{a.service_name || a.service}</td>
                                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{a.staff_name || '-'}</td>
                                  <td style={{ padding: '6px 10px', fontSize: 13, textAlign: 'center' }}>{getStatusBadge(a.status)}</td>
                                  <td style={{ padding: '6px 10px', fontSize: 12, color: '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.internal_notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showQR && settings.slug && <SalonQR slug={settings.slug} services={servicesList} onClose={() => setShowQR(false)} />}
    </div>
  );
}
