import { useEffect } from 'react';
import { api } from '../../../../api/client';
import type { StaffMember } from '../dashboardContext';

export interface DashboardSyncParams {
  loadAppointments: () => Promise<void>;
  loadServices: () => Promise<void>;
  loadClients: (q?: string) => Promise<void>;
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
}

export function useDashboardSync(params: DashboardSyncParams) {
  const { loadAppointments, loadServices, loadClients, setStaffList } = params;

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
  }, [loadAppointments, loadServices, loadClients, setStaffList]);
}
