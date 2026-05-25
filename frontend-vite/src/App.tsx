import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PublicIndex from './pages/public/PublicIndex';
import Landing from './pages/public/Landing';
import Terms from './pages/public/Terms';
import NotFound from './pages/public/NotFound';
import StaffLogin from './pages/staff/Login';
import StaffRegister from './pages/staff/Register';
import ForgotPassword from './pages/staff/ForgotPassword';
import ResetPassword from './pages/staff/ResetPassword';
import StaffDashboard from './pages/staff/Dashboard';
import LandingEditor from './pages/staff/LandingEditor';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicIndex />} />
          <Route path="/landing" element={<Landing />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
