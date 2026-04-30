import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, LayoutDashboard, ShieldCheck, ChevronDown } from 'lucide-react';
import useAuthStore from '../store/authStore';

const NAV_LINKS = [
  { label: 'Pricing',  to: '/pricing' },
  { label: 'Docs',     to: '/docs' },
  { label: 'About',    to: '/about' },
  { label: 'FAQ',      to: '/faq' },
  { label: 'Status',   to: '/status' },
  { label: 'Contact',  to: '/contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const { isAuthenticated, logout, user } = useAuthStore();
  const isAdmin    = user?.role === 'admin';
  const location   = useLocation();
  const navigate   = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-9 left-0 right-0 z-50"
    >
      {/* Main bar */}
      <div className={`mx-auto transition-all duration-300 ${
        scrolled
          ? 'max-w-7xl px-3'
          : 'max-w-7xl px-5 md:px-8'
      }`}>
        <div className={`flex items-center justify-between h-14 px-4 md:px-6 rounded-xl transition-all duration-300 ${
          scrolled
            ? 'bg-[#0d0d12]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-transparent'
        }`}>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative">
              <img
                src="/logo.png"
                alt="AIRent"
                className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(250,180,0,0.55)] group-hover:drop-shadow-[0_0_14px_rgba(250,180,0,0.75)] transition-all duration-300"
              />
            </div>
            <span className="text-[#f0eefa] font-bold text-base tracking-tight">
              AI<span className="text-violet-400">Rent</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(link.to)
                    ? 'text-white bg-white/[0.09]'
                    : 'text-[#8e8ca4] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-white/[0.09]"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Auth actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-violet-400 hover:text-violet-300 hover:bg-violet-500/[0.09] rounded-lg transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#8e8ca4] hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </Link>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="px-3.5 py-2 text-sm text-[#52505f] hover:text-[#8e8ca4] transition-colors rounded-lg hover:bg-white/[0.04]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#8e8ca4] hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 text-[#8e8ca4] hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileOpen ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0,   opacity: 1, scale: 1 }}
                exit={{   rotate:  90,  opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden mx-3 mt-1 rounded-xl bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-3 space-y-0.5">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0,   opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={link.to}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive(link.to)
                        ? 'bg-white/[0.08] text-white'
                        : 'text-[#8e8ca4] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" className="px-4 py-3 text-sm font-medium text-violet-400 hover:text-violet-300 rounded-lg hover:bg-violet-500/[0.06] transition-all">
                      Admin Panel
                    </Link>
                  )}
                  <Link to="/dashboard" className="px-4 py-3 text-sm text-[#8e8ca4] hover:text-white rounded-lg hover:bg-white/[0.04] transition-all">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="px-4 py-3 text-left text-sm text-[#52505f] hover:text-[#8e8ca4] transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-3 text-sm text-[#8e8ca4] hover:text-white rounded-lg hover:bg-white/[0.04] transition-all">
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-3 text-sm font-semibold text-white rounded-lg text-center transition-all"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                  >
                    Get started free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
