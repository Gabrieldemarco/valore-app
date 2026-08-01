import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import type { Tenant, Stats, TwilioConfig } from './types';

interface AdminDashboardContextValue {
  stats: Stats | null;
  tenants: Tenant[];
  filtered: Tenant[];
  search: string;
  setSearch: (v: string) => void;
  twilioConfig: TwilioConfig;
  setTwilioConfig: React.Dispatch<React.SetStateAction<TwilioConfig>>;
  loadData: () => void;
  toastMsg: string;
  toastType: 'success' | 'error';
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const AdminDashboardContext = createContext<AdminDashboardContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) throw new Error('useAdminDashboard must be used within AdminDashboardProvider');
  return ctx;
}

export function AdminDashboardProvider({ children }: { children: ReactNode }) {
  const { superAdminToken } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({ account_sid: '', auth_token: '', from: '' });

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  useEffect(() => {
    if (!superAdminToken) navigate('/admin/login');
  }, [superAdminToken, navigate]);

  const loadData = useCallback(() => {
    api.get<Stats>('/api/super-admin/stats/billing').then(setStats).catch(() => {});
    api.get<{ tenants: Tenant[] }>('/api/super-admin/tenants').then(r => setTenants(r.tenants)).catch(() => {});
    api.get<{ config: Record<string, unknown> }>('/api/super-admin/config').then(r => {
      if (r.config?.twilio) setTwilioConfig(r.config.twilio as TwilioConfig);
    }).catch(() => {});
  }, []);

  useEffect(loadData, [loadData]);

  const filtered = tenants.filter(t =>
    t.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.notification_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const value: AdminDashboardContextValue = {
    stats,
    tenants,
    filtered,
    search,
    setSearch,
    twilioConfig,
    setTwilioConfig,
    loadData,
    toastMsg,
    toastType,
    showToast,
  };

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  );
}
