import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, ArrowRight, Menu, X } from 'lucide-react';
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
  const [menuPath,  setMenuPath]  = useState(null);
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

  // The menu is open only on the page it was opened on, so navigating closes it
  const menuOpen = menuPath === location.pathname;
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
      background: scrolled ? 'rgba(247,242,232,0.96)' : 'rgba(247,242,232,0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--line)',
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
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, padding: '8px 0' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '1.75rem', lineHeight: 1, color: 'var(--on-surface)' }}>
            AIRent
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="nb-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to} style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-body)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: isActive(link.to) ? 600 : 400,
              textDecoration: 'none',
              color: isActive(link.to) ? 'var(--on-surface)' : 'var(--on-surface-2)',
              borderBottom: isActive(link.to) ? '1.5px solid var(--secondary)' : '1.5px solid transparent',
              transition: 'color 120ms', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = isActive(link.to) ? 'var(--on-surface)' : 'var(--on-surface-2)'; }}
            >{link.label}</Link>
          ))}
        </div>

        {/* Desktop auth area */}
        <div className="nb-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--secondary)', borderRadius: '8px', fontWeight: 600, background: 'var(--secondary-bg)', border: '1px solid var(--secondary-border)', whiteSpace: 'nowrap' }}>
                  <ShieldCheck size={14} /> Admin
                </Link>
              )}
              <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--on-surface-2)', borderRadius: '8px', transition: 'color 120ms', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
              ><LayoutDashboard size={14} /> Dashboard</Link>
              <button onClick={() => { logout(); navigate('/'); }} style={{ padding: '6px 12px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--on-surface-3)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'color 120ms', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
              >Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none', padding: '6px 14px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--on-surface-2)', borderRadius: '8px', transition: 'color 120ms', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-2)'}
              >Sign in</Link>
              <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--on-primary)', background: 'var(--primary)', borderRadius: '999px', textDecoration: 'none', transition: 'background 120ms', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0b2a1f'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
              >Rent a key <ArrowRight size={14} /></Link>
            </>
          )}
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="nb-mobile-actions" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
          <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-primary)', background: 'var(--primary)', borderRadius: '999px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Rent a key
          </Link>
          <button aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuPath(menuOpen ? null : location.pathname)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '8px' }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{ background: 'rgba(247,242,232,0.98)', borderTop: '1px solid var(--line)', padding: '16px clamp(16px,4vw,48px) 20px' }}>
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to} style={{ display: 'block', padding: '12px 4px', fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: isActive(link.to) ? 600 : 400, color: isActive(link.to) ? 'var(--on-surface)' : 'var(--on-surface-2)', textDecoration: 'none', borderBottom: '1px solid rgba(18,58,44,0.07)' }}>
              {link.label}
            </Link>
          ))}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 16px', borderRadius: '10px', background: 'rgba(18,58,44,0.07)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <button onClick={() => { setMenuPath(null); logout(); navigate('/'); }} style={{ padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(179,38,30,0.2)', background: 'rgba(179,38,30,0.06)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--error)' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ display: 'block', padding: '11px 16px', borderRadius: '10px', background: 'rgba(18,58,44,0.07)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--on-surface)', textAlign: 'center' }}>
                  Sign in
                </Link>
                <Link to="/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 16px', borderRadius: '999px', background: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-primary)' }}>
                  Rent a key <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}

    </nav>
  );
}
