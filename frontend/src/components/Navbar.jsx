import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';

const NAV_LINKS = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Docs',    to: '/docs'    },
  { label: 'About',   to: '/about'   },
  { label: 'Status',  to: '/status'  },
];

const BANNER_HEIGHT = 40;

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [bannerUp,  setBannerUp]  = useState(
    () => sessionStorage.getItem('banner_dismissed') !== 'true'
  );
  const { isAuthenticated, logout, user } = useAuthStore();
  const isAdmin  = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const id = setInterval(() =>
      setBannerUp(sessionStorage.getItem('banner_dismissed') !== 'true'), 200);
    return () => clearInterval(id);
  }, []);

  const isActive = (to) => location.pathname === to;
  const navTop = bannerUp ? `${BANNER_HEIGHT}px` : '0px';
  const NAV_HEIGHT = 60;
  // Let pages consume total fixed header height via CSS variable
  useEffect(() => {
    const total = (bannerUp ? BANNER_HEIGHT : 0) + NAV_HEIGHT;
    document.documentElement.style.setProperty('--header-h', `${total}px`);
  }, [bannerUp]);

  return (
    <nav style={{
      position: 'fixed',
      top: navTop,
      left: 0,
      right: 0,
      zIndex: 90,
      transition: 'top 200ms ease, background 200ms ease',
      background: scrolled ? 'rgba(11,19,38,0.96)' : 'rgba(11,19,38,0.72)',
      backdropFilter: 'blur(24px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
      borderBottom: '1px solid rgba(70,69,84,0.5)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        gap: '8px',
      }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700, color: 'var(--on-primary)', letterSpacing: '-0.01em' }}>AI</span>
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.0625rem', letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>
            AI<span style={{ color: 'var(--primary)' }}>Rent</span>
          </span>
        </Link>

        {/* Nav links — always visible, wrap on very small screens */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: isActive(link.to) ? 600 : 400,
                textDecoration: 'none',
                color: isActive(link.to) ? 'var(--on-surface)' : 'var(--on-surface-2)',
                background: isActive(link.to) ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'color 120ms, background 120ms',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--on-surface)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = isActive(link.to) ? 'var(--on-surface)' : 'var(--on-surface-2)';
                e.currentTarget.style.background = isActive(link.to) ? 'rgba(255,255,255,0.08)' : 'transparent';
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem',
                  color: 'var(--secondary)', borderRadius: '8px', fontWeight: 600,
                  background: 'var(--secondary-bg)', border: '1px solid var(--secondary-border)',
                  whiteSpace: 'nowrap',
                }}>
                  <ShieldCheck size={14} /> Admin
                </Link>
              )}
              <Link to="/dashboard" style={{
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem',
                color: 'var(--on-surface-2)', borderRadius: '8px', transition: 'color 120ms',
                whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} style={{
                padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem',
                color: 'var(--on-surface-3)', background: 'none', border: 'none',
                cursor: 'pointer', borderRadius: '8px', transition: 'color 120ms',
                whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                textDecoration: 'none', padding: '6px 14px', fontFamily: 'var(--font-body)',
                fontSize: '0.8375rem', color: 'var(--on-surface-2)', borderRadius: '8px',
                transition: 'color 120ms', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
              >
                Sign in
              </Link>
              <Link to="/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                fontWeight: 700, color: 'var(--on-primary)', background: 'var(--primary)',
                borderRadius: '999px', textDecoration: 'none',
                boxShadow: 'var(--shadow-primary)',
                transition: 'filter 120ms', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Rent a key <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
