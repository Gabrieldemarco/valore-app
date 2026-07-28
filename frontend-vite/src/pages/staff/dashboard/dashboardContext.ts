import { createContext, useContext } from 'react';

export interface Appointment {
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

export interface PlanInfo {
  plan: string;
  status: string;
  trial_end_date?: string;
  trialDaysLeft?: number | null;
  price?: number;
}

export interface Invoice {
  id: number;
  amount: number;
  status: string;
  due_date: string;
  issue_date?: string;
  invoice_number?: string;
  description?: string;
}

export interface StaffMember {
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

export interface ServiceImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface CategoryItem {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  children: CategoryItem[];
}

export interface ServiceItem {
  id: number;
  name: string;
  duration: number;
  price: number;
  category?: string;
  category_id?: number | null;
  category_name?: string | null;
  category_parent_id?: number | null;
  description?: string;
  active: boolean;
  image?: string;
  images?: ServiceImage[];
}

export interface TenantSettings {
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

export interface ClientSummary {
  client_name: string;
  client_phone: string;
  client_email?: string;
  total_appointments: string;
  last_appointment: string;
  first_appointment: string;
}

export interface ProductItem {
  id: number;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  category: string;
  sku: string;
  image_url: string;
  active: boolean;
  created_at: string;
}

export interface CalendarStatus {
  connected: boolean;
  google_email?: string;
  sync_enabled?: boolean;
  last_sync?: string;
  staff_name?: string;
}

export type Tab = 'list' | 'calendar' | 'billing' | 'staff' | 'services' | 'categories' | 'clients' | 'analytics' | 'coupons' | 'waitlist' | 'products' | 'pos';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface AnalyticsSummary {
  todayAppointments: number;
  monthAppointments: number;
  monthRevenue: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancellationRate: number;
}

export interface DashboardContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean | ((p: boolean) => boolean)) => void;
  settings: TenantSettings;
  setSettings: React.Dispatch<React.SetStateAction<TenantSettings>>;
  openingHours: { startHour: number; endHour: number; workDays: number[] };
  setOpeningHours: React.Dispatch<React.SetStateAction<{ startHour: number; endHour: number; workDays: number[] }>>;
  plan: PlanInfo | null;
  appointments: Appointment[];
  invoices: Invoice[];
  staffList: StaffMember[];
  servicesList: ServiceItem[];
  categories: CategoryItem[];
  clientsList: ClientSummary[];
  productsList: ProductItem[];
  calendarStatus: CalendarStatus;
  analyticsSummary: AnalyticsSummary | null;
  revenueByMonth: { month: string; appointments: number; revenue: number }[];
  topServices: { service: string; count: number; avg_price: number }[];
  revenueByStaff: { id: number; name: string; appointments: number; revenue: number }[];
  analyticsLoading: boolean;
  analyticsError: boolean;
  analyticsDateRange: '6m' | '12m' | 'all';
  setAnalyticsDateRange: (v: '6m' | '12m' | 'all') => void;
  loading: boolean;
  page: number;
  setPage: (v: number) => void;
  totalPages: number;
  totalAppointments: number;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterDate: string;
  setFilterDate: (v: string) => void;
  filterMode: 'day' | 'week' | 'month';
  setFilterMode: (v: 'day' | 'week' | 'month') => void;
  filterPhone: string;
  setFilterPhone: (v: string) => void;
  selectedStaff: number | '';
  setSelectedStaff: (v: number | '') => void;
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error') => void;
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (a: Appointment | null) => void;
  selectedClient: ClientSummary | null;
  setSelectedClient: (c: ClientSummary | null) => void;
  clientHistory: Appointment[];
  clientHistoryLoading: boolean;
  openClientHistory: (client: ClientSummary) => void;
  loadAppointments: () => Promise<void>;
  loadServices: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadClients: (q?: string) => Promise<void>;
  loadProducts: () => Promise<void>;
  loadAnalytics: (isRefresh?: boolean, range?: string) => Promise<void>;
  loadCalendarStatus: () => Promise<void>;
  loadInvoices: () => Promise<void>;
  flatCats: { id: number; name: string; depth: number }[];
  couponsList: any[];
  setCouponsList: React.Dispatch<React.SetStateAction<any[]>>;
  blockedDates: { id: number; date: string; reason: string }[];
  setBlockedDates: React.Dispatch<React.SetStateAction<{ id: number; date: string; reason: string }[]>>;
  staffName: string | null;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard(): DashboardContextType {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

export default DashboardContext;

export function formatPrice(p: number | string | null | undefined): string {
  if (p === null || p === undefined) return '';
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}
