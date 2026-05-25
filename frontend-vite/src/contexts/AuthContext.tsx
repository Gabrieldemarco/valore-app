import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  staffToken: string | null;
  superAdminToken: string | null;
  staffName: string | null;
  login: (token: string, role: 'staff' | 'superAdmin', name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staffToken, setStaffToken] = useState<string | null>(() => localStorage.getItem('staffToken'));
  const [superAdminToken, setSuperAdminToken] = useState<string | null>(() => localStorage.getItem('superAdminToken'));
  const [staffName, setStaffName] = useState<string | null>(() => localStorage.getItem('staffName'));

  const login = useCallback((token: string, role: 'staff' | 'superAdmin', name?: string) => {
    if (role === 'staff') {
      localStorage.setItem('staffToken', token);
      setStaffToken(token);
      if (name) {
        localStorage.setItem('staffName', name);
        setStaffName(name);
      }
    } else {
      localStorage.setItem('superAdminToken', token);
      setSuperAdminToken(token);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('staffName');
    localStorage.removeItem('staffRole');
    setStaffToken(null);
    setSuperAdminToken(null);
    setStaffName(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      staffToken, superAdminToken, staffName,
      login, logout,
      isAuthenticated: !!staffToken || !!superAdminToken,
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
