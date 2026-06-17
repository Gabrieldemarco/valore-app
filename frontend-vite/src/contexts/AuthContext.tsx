import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  staffToken: string | null;
  clientToken: string | null;
  superAdminToken: string | null;
  staffName: string | null;
  clientName: string | null;
  login: (token: string, role: 'staff' | 'superAdmin' | 'client', name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staffToken, setStaffToken] = useState<string | null>(() => localStorage.getItem('staffToken'));
  const [clientToken, setClientToken] = useState<string | null>(() => localStorage.getItem('clientToken'));
  const [superAdminToken, setSuperAdminToken] = useState<string | null>(() => localStorage.getItem('superAdminToken'));
  const [staffName, setStaffName] = useState<string | null>(() => localStorage.getItem('staffName'));
  const [clientName, setClientName] = useState<string | null>(() => localStorage.getItem('clientName'));

  const login = useCallback((token: string, role: 'staff' | 'superAdmin' | 'client', name?: string) => {
    if (role === 'staff') {
      localStorage.setItem('staffToken', token);
      setStaffToken(token);
      if (name) {
        localStorage.setItem('staffName', name);
        setStaffName(name);
      }
    } else if (role === 'client') {
      localStorage.setItem('clientToken', token);
      setClientToken(token);
      if (name) {
        localStorage.setItem('clientName', name);
        setClientName(name);
      }
    } else {
      localStorage.setItem('superAdminToken', token);
      setSuperAdminToken(token);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('clientToken');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('staffName');
    localStorage.removeItem('clientName');
    localStorage.removeItem('staffRole');
    setStaffToken(null);
    setClientToken(null);
    setSuperAdminToken(null);
    setStaffName(null);
    setClientName(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      staffToken, clientToken, superAdminToken, staffName, clientName,
      login, logout,
      isAuthenticated: !!staffToken || !!clientToken || !!superAdminToken,
      isSuperAdmin: !!superAdminToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
