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
        transition: 'background 200ms ease, border-color 200ms ease, backdrop-filter 200ms ease',
        background:     scrolled ? 'rgba(8,8,8,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.5)' : 'none',
        borderBottom:   scrolled ? '1px solid var(--ink-4)' : '1px solid transparent',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>

        {/* Logo — wordmark only, clean */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '-0.02em',
            color: 'var(--ink-10)',
          }}>
            AI<span style={{ color: 'var(--c-accent)' }}>Rent</span>
          </span>
        </Link>

        {/* Desktop nav — minimal, no backgrounds on links */}
        <div className="hidden md:flex items-center" style={{ gap: '2px' }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '5px 11px',
                borderRadius: '5px',
                fontSize: '0.8375rem',
                fontWeight: isActive(link.to) ? 500 : 400,
                textDecoration: 'none',
                color: isActive(link.to) ? 'var(--ink-9)' : 'var(--ink-7)',
                transition: 'color 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-9)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = isActive(link.to) ? 'var(--ink-9)' : 'var(--ink-7)'; }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth — right side */}
        <div className="hidden md:flex items-center" style={{ gap: '8px' }}>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', fontSize: '0.8375rem', color: 'var(--c-accent)', borderRadius: '5px', fontWeight: 500 }}>
                  <ShieldCheck size={13} /> Admin
                </Link>
              )}
              <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px', fontSize: '0.8375rem', color: 'var(--ink-7)', borderRadius: '5px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-9)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-7)'}
              >
                <LayoutDashboard size={13} /> Dashboard
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                style={{ padding: '5px 11px', fontSize: '0.8375rem', color: 'var(--ink-6)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '5px', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-6)'}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none', padding: '5px 11px', fontSize: '0.8375rem', color: 'var(--ink-7)', borderRadius: '5px', fontWeight: 400 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-9)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-7)'}
              >
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '7px 14px' }}>
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(o => !o)}
          style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-7)', borderRadius: '5px', display: 'flex', alignItems: 'center' }}
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
            style={{ background: 'var(--ink-1)', borderTop: '1px solid var(--ink-4)', overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 20px 20px' }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{ display: 'block', padding: '9px 4px', fontSize: '0.875rem', fontWeight: 400, textDecoration: 'none', color: isActive(link.to) ? 'var(--ink-9)' : 'var(--ink-7)', borderBottom: '1px solid var(--ink-3)' }}
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
