import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, LayoutDashboard, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/authStore';

const NAV_LINKS = [
  { label: 'Pricing',  to: '/pricing'  },
  { label: 'Docs',     to: '/docs'     },
  { label: 'About',    to: '/about'    },
  { label: 'Status',   to: '/status'   },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const { isAuthenticated, logout, user } = useAuthStore();
  const isAdmin  = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (to) => location.pathname === to;

  return (
    <nav
      className="fixed top-9 left-0 right-0 z-50"
      style={{
        transition: 'background 200ms ease, border-color 200ms ease',
        background:   scrolled ? 'oklch(12% 0.028 255 / 0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(1.3)' : 'none',
        borderBottom: scrolled ? '1px solid var(--nb-border)' : '1px solid transparent',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.03em', color: 'var(--nb-text)' }}>
            AI<span style={{ color: 'var(--nb-green)' }}>Rent</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center" style={{ gap: '2px' }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '5px 11px',
                borderRadius: '3px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8375rem',
                fontWeight: isActive(link.to) ? 500 : 400,
                textDecoration: 'none',
                color: isActive(link.to) ? 'var(--nb-text)' : 'var(--nb-text-3)',
                transition: 'color 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--nb-text)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = isActive(link.to) ? 'var(--nb-text)' : 'var(--nb-text-3)'; }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="hidden md:flex items-center" style={{ gap: '8px' }}>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--nb-green)', borderRadius: '3px', fontWeight: 500 }}>
                  <ShieldCheck size={13} /> Admin
                </Link>
              )}
              <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--nb-text-3)', borderRadius: '3px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
              >
                <LayoutDashboard size={13} /> Dashboard
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                style={{ padding: '5px 11px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--nb-text-4)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-4)'}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none', padding: '5px 11px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--nb-text-3)', borderRadius: '3px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
              >
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '7px 15px' }}>
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(o => !o)}
          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nb-text-3)', borderRadius: '3px', display: 'flex', alignItems: 'center' }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{ background: 'var(--nb-surface)', borderTop: '1px solid var(--nb-border)', overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 20px 20px' }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{ display: 'block', padding: '9px 4px', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 400, textDecoration: 'none', color: isActive(link.to) ? 'var(--nb-text)' : 'var(--nb-text-3)', borderBottom: '1px solid var(--nb-raised)' }}
                >
                  {link.label}
                </Link>
              ))}
              <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isAuthenticated ? (
                  <>
                    {isAdmin && <Link to="/admin" className="btn btn-outline" style={{ justifyContent: 'center' }}>Admin Panel</Link>}
                    <Link to="/dashboard" className="btn btn-outline" style={{ justifyContent: 'center' }}>Dashboard</Link>
                    <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ justifyContent: 'center' }}>Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn btn-outline" style={{ justifyContent: 'center' }}>Sign in</Link>
                    <Link to="/register" className="btn btn-primary" style={{ justifyContent: 'center' }}>Get started free</Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
