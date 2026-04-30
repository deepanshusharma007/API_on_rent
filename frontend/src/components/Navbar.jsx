import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LayoutDashboard, ShieldCheck, LogIn } from 'lucide-react';
import useAuthStore from '../store/authStore';

const NAV_LINKS = [
  { label: 'Pricing',  to: '/pricing'     },
  { label: 'Docs',     to: '/docs'        },
  { label: 'About',    to: '/about'       },
  { label: 'FAQ',      to: '/faq'         },
  { label: 'Status',   to: '/status'      },
  { label: 'Contact',  to: '/contact'     },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const { isAuthenticated, logout, user } = useAuthStore();
  const isAdmin  = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (to) => location.pathname === to;

  return (
    <nav
      className="fixed top-9 left-0 right-0 z-50 transition-all duration-200"
      style={{
        background:   scrolled ? 'rgba(13,17,23,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--c-border)' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between h-14">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" style={{ textDecoration: 'none' }}>
          <img
            src="/logo.png" alt="AIRent"
            className="w-8 h-8 object-contain transition-opacity duration-150 group-hover:opacity-80"
            style={{ filter: 'drop-shadow(0 0 6px rgba(250,180,0,0.4))' }}
          />
          <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
            AI<span style={{ color: 'var(--c-accent)' }}>Rent</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive(link.to) ? 'var(--c-text)' : 'var(--c-text-2)',
                background: isActive(link.to) ? 'var(--c-raised)' : 'transparent',
                transition: 'color 150ms, background 150ms',
              }}
              onMouseEnter={e => { if (!isActive(link.to)) { e.target.style.color = 'var(--c-text)'; e.target.style.background = 'var(--c-raised)'; }}}
              onMouseLeave={e => { if (!isActive(link.to)) { e.target.style.color = 'var(--c-text-2)'; e.target.style.background = 'transparent'; }}}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--c-accent)' }}>
                  <ShieldCheck size={14} /> Admin
                </Link>
              )}
              <Link to="/dashboard" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--c-text-3)' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '7px 14px' }}>
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '7px 16px' }}>
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="md:hidden"
          style={{ padding: '6px', color: 'var(--c-text-2)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', overflow: 'hidden' }}
          >
            <div style={{ padding: '8px 20px 16px' }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'block', padding: '10px 12px', borderRadius: '6px',
                    fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none',
                    color: isActive(link.to) ? 'var(--c-text)' : 'var(--c-text-2)',
                    background: isActive(link.to) ? 'var(--c-raised)' : 'transparent',
                    marginBottom: '2px',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <div style={{ height: '1px', background: 'var(--c-border)', margin: '12px 0 10px' }} />
              {isAuthenticated ? (
                <>
                  {isAdmin && <Link to="/admin" style={{ display: 'block', padding: '10px 12px', color: 'var(--c-accent)', fontSize: '0.9rem', textDecoration: 'none' }}>Admin Panel</Link>}
                  <Link to="/dashboard" style={{ display: 'block', padding: '10px 12px', color: 'var(--c-text-2)', fontSize: '0.9rem', textDecoration: 'none' }}>Dashboard</Link>
                  <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', color: 'var(--c-text-3)', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <Link to="/login" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Sign in</Link>
                  <Link to="/register" className="btn btn-primary" style={{ justifyContent: 'center' }}>Get started free</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
