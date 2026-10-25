import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Core pages (protected)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Marketplace from './pages/Marketplace';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import StatusPage from './pages/StatusPage';
import Playground from './pages/Playground';

// Public pages
import Landing3D from './pages/Landing3D';
import Orbit3D from './pages/Orbit3D';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import FAQ from './pages/FAQ';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RefundPolicy from './pages/RefundPolicy';
import ApiDocs from './pages/ApiDocs';

import useAuthStore from './store/authStore';
import AnnouncementBanner from './components/AnnouncementBanner';

// Same base URL the axios client uses, so local dev never talks to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  // Keep Render backend alive (free tier sleeps after 15min inactivity)
  useEffect(() => {
    const ping = () => fetch(`${API_BASE_URL}/health`).catch(() => {});
    ping(); // immediate ping on load
    const id = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Session validity check — detects if user was kicked by another device login
  // Polls /auth/me every 30s; a 401 triggers auto-logout via the axios interceptor
  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.status === 401) {
          // axios interceptor won't fire here (plain fetch), handle manually
          localStorage.removeItem('auth_token');
          sessionStorage.setItem('auth_notice', 'You were logged out because your account was accessed from another device.');
          window.location.href = '/login';
        }
      }).catch(() => {});
    };
    const id = setInterval(checkSession, 30 * 1000); // every 30 seconds
    return () => clearInterval(id);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--c-bg)' }}>
        <AnnouncementBanner />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--c-surface)',
              color: 'var(--c-text)',
              border: '1px solid var(--c-border)',
              borderRadius: '12px',
            },
          }}
        />
        <Routes>
          {/* ── Public / Marketing pages ── */}
          <Route path="/" element={<Landing3D />} />
          <Route path="/3d" element={<Navigate to="/" replace />} />
          <Route path="/orbit" element={<Orbit3D />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/docs" element={<ApiDocs />} />

          {/* ── Auth ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ── Protected app pages ── */}
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/playground"
            element={
              <ProtectedRoute>
                <Playground />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
