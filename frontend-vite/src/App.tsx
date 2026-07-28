import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ErrorBoundary from './components/ErrorBoundary';

const PublicIndex = lazy(() => import('./pages/public/PublicIndex'));
const Landing = lazy(() => import('./pages/public/Landing'));
const AppointmentManage = lazy(() => import('./pages/public/AppointmentManage'));
const Terms = lazy(() => import('./pages/public/Terms'));
const VerifyEmail = lazy(() => import('./pages/public/VerifyEmail'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const StaffLogin = lazy(() => import('./pages/staff/Login'));
const StaffRegister = lazy(() => import('./pages/staff/Register'));
const ForgotPassword = lazy(() => import('./pages/staff/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/staff/ResetPassword'));
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'));
const LandingEditor = lazy(() => import('./pages/staff/LandingEditor'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const ClientLogin = lazy(() => import('./pages/client/Login'));
const ClientRegister = lazy(() => import('./pages/client/Register'));
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));
const ClientForgotPassword = lazy(() => import('./pages/client/ForgotPassword'));
const ClientResetPassword = lazy(() => import('./pages/client/ResetPassword'));

function Loading() {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-deep)', color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}>
      <div className="text-center">
        <div style={{ width: 40, height: 40, border: '3px solid rgba(148,163,184,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'ls 0.8s linear infinite', margin: '0 auto 16px' }}></div>
        {t('common.loading')}
        <style>{`@keyframes ls{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<PublicIndex />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/p/:slug" element={<Landing />} />
              <Route path="/p/:slug/manage/:token" element={<AppointmentManage />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff/register" element={<StaffRegister />} />
              <Route path="/staff/forgot-password" element={<ForgotPassword />} />
              <Route path="/staff/reset-password" element={<ResetPassword />} />
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
              <Route path="/staff/landing-editor" element={<LandingEditor />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/client/register" element={<ClientRegister />} />
              <Route path="/client/forgot-password" element={<ClientForgotPassword />} />
              <Route path="/client/reset-password" element={<ClientResetPassword />} />
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
