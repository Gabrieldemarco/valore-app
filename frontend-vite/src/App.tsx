import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const PublicIndex = lazy(() => import('./pages/public/PublicIndex'));
const Landing = lazy(() => import('./pages/public/Landing'));
const Terms = lazy(() => import('./pages/public/Terms'));
const NotFound = lazy(() => import('./pages/public/NotFound'));
const StaffLogin = lazy(() => import('./pages/staff/Login'));
const StaffRegister = lazy(() => import('./pages/staff/Register'));
const ForgotPassword = lazy(() => import('./pages/staff/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/staff/ResetPassword'));
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'));
const LandingEditor = lazy(() => import('./pages/staff/LandingEditor'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0c', color: '#94a3b8', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(148,163,184,0.2)', borderTopColor: '#c5a880', borderRadius: '50%', animation: 'ls 0.8s linear infinite', margin: '0 auto 16px' }}></div>
        Cargando...
        <style>{`@keyframes ls{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<PublicIndex />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/p/:slug" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/register" element={<StaffRegister />} />
            <Route path="/staff/forgot-password" element={<ForgotPassword />} />
            <Route path="/staff/reset-password" element={<ResetPassword />} />
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/landing-editor" element={<LandingEditor />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
