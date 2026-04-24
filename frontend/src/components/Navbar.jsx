import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, LayoutDashboard, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/authStore';

const navLinks = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Docs', to: '/docs' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Status', to: '/status' },
  { label: 'Contact', to: '/contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, logout, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`fixed top-9 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="AIRent"
              className="w-9 h-9 object-contain drop-shadow-[0_0_6px_rgba(250,180,0,0.5)] group-hover:drop-shadow-[0_0_10px_rgba(250,180,0,0.7)] transition-all duration-300"
            />
            <span className="text-white font-bold text-lg tracking-tight">
              AI<span className="text-violet-400">Rent</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-white bg-white/[0.08]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-500/[0.08] rounded-lg transition-all">
                    <ShieldCheck className="w-4 h-4" /> Admin
                  </Link>
                )}
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={() => { logout(); navigate('/'); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <LogIn className="w-4 h-4" /> Login
                </Link>
                <Link to="/register" className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileOpen ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-[#0a0a0a]/98 backdrop-blur-xl border-t border-white/[0.06]"
          >
            <div className="px-5 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={link.to} className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(link.to) ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" className="px-4 py-3 text-sm text-violet-400 hover:text-violet-300">Admin Panel</Link>
                    )}
                    <Link to="/dashboard" className="px-4 py-3 text-sm text-gray-300 hover:text-white">Dashboard</Link>
                    <button onClick={() => { logout(); navigate('/'); }} className="px-4 py-3 text-left text-sm text-gray-500">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="px-4 py-3 text-sm text-gray-400">Login</Link>
                    <Link to="/register" className="px-4 py-3 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-center transition-colors">Get Started Free</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
