import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, LayoutDashboard, ShieldCheck, ArrowRight } from 'lucide-react';
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
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (to) => location.pathname === to;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      transition: 'background 200ms ease, border-color 200ms ease',
      background: scrolled ? 'oklch(0.16 0.03 240 / 0.85)' : 'oklch(0.16 0.03 240 / 0.4)',
      backdropFilter: 'blur(20px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
      borderBottom: scrolled ? '1px solid oklch(1 0 0 / 0.08)' : '1px solid transparent',
    }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px',
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px', background: 'var(--mint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, color: 'oklch(0.14 0.03 240)' }}>AI</span>
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', letterSpacing: '-0.03em', color: 'var(--nb-text)' }}>
            AI<span style={{ color: 'var(--mint)' }}>Rent</span>
          </span>
        </Link>

        {/* Desktop nav — pill container */}
        <div className="hidden md:flex items-center" style={{
          gap: '2px', background: 'oklch(1 0 0 / 0.04)',
          border: '1px solid oklch(1 0 0 / 0.07)', borderRadius: '999px', padding: '4px',
        }}>
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to} style={{
              padding: '5px 14px', borderRadius: '999px',
              fontFamily: 'var(--font-body)', fontSize: '0.8375rem',
              fontWeight: isActive(link.to) ? 600 : 400, textDecoration: 'none',
              color: isActive(link.to) ? 'var(--nb-text)' : 'var(--nb-text-3)',
              background: isActive(link.to) ? 'oklch(1 0 0 / 0.08)' : 'transparent',
              transition: 'color 120ms, background 120ms',
            }}
              onMouseEnter={e => { if (!isActive(link.to)) { e.currentTarget.style.color = 'var(--nb-text-2)'; e.currentTarget.style.background = 'oklch(1 0 0 / 0.04)'; } }}
              onMouseLeave={e => { if (!isActive(link.to)) { e.currentTarget.style.color = 'var(--nb-text-3)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth area */}
        <div className="hidden md:flex items-center" style={{ gap: '8px' }}>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                  color: 'var(--mint)', borderRadius: '8px', fontWeight: 500,
                  background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)',
                }}>
                  <ShieldCheck size={13} /> Admin
                </Link>
              )}
              <Link to="/dashboard" style={{
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                color: 'var(--nb-text-3)', borderRadius: '8px', transition: 'color 120ms',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
              >
                <LayoutDashboard size={13} /> Dashboard
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} style={{
                padding: '5px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8125rem',
                color: 'var(--nb-text-4)', background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '8px', transition: 'color 120ms',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-4)'}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                textDecoration: 'none', padding: '6px 14px', fontFamily: 'var(--font-body)',
                fontSize: '0.8375rem', color: 'var(--nb-text-3)', borderRadius: '8px', transition: 'color 120ms',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
              >
                Sign in
              </Link>
              <Link to="/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 18px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem',
                fontWeight: 600, color: 'oklch(0.14 0.03 240)', background: 'var(--mint)',
                borderRadius: '999px', textDecoration: 'none',
                boxShadow: '0 0 0 1px oklch(0.82 0.15 168 / 0.4), 0 4px 12px -4px oklch(0.82 0.15 168 / 0.5)',
                transition: 'filter 120ms',
              }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Rent a key <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(o => !o)} style={{
          padding: '6px', background: 'oklch(1 0 0 / 0.06)', border: '1px solid oklch(1 0 0 / 0.08)',
          borderRadius: '8px', cursor: 'pointer', color: 'var(--nb-text-3)', display: 'flex', alignItems: 'center',
        }}>
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
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              background: 'oklch(0.18 0.03 235 / 0.95)', borderTop: '1px solid oklch(1 0 0 / 0.08)',
              backdropFilter: 'blur(20px)', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 20px 24px' }}>
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to} style={{
                  display: 'block', padding: '10px 4px', fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem', textDecoration: 'none',
                  color: isActive(link.to) ? 'var(--nb-text)' : 'var(--nb-text-3)',
                  borderBottom: '1px solid oklch(1 0 0 / 0.05)',
                }}>
                  {link.label}
                </Link>
              ))}
              <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isAuthenticated ? (
                  <>
                    {isAdmin && <Link to="/admin" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Admin Panel</Link>}
                    <Link to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Dashboard</Link>
                    <button onClick={() => { logout(); navigate('/'); }} className="btn btn-ghost" style={{ justifyContent: 'center' }}>Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn btn-outline" style={{ justifyContent: 'center' }}>Sign in</Link>
                    <Link to="/register" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                      Rent a key <ArrowRight size={14} />
                    </Link>
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
