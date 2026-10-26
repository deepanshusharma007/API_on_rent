import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail } from 'lucide-react';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Pricing',       to: '/pricing'     },
      { label: 'Marketplace',   to: '/marketplace' },
      { label: 'Playground',    to: '/playground'  },
      { label: 'System Status', to: '/status'      },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',    to: '/about'   },
      { label: 'Contact',  to: '/contact' },
      { label: 'FAQ',      to: '/faq'     },
      { label: 'API Docs', to: '/docs'    },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy',   to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms'          },
      { label: 'Refund Policy',    to: '/refund-policy'  },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--bg-alt)', borderTop: '1px solid rgba(18,58,44,0.12)', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,80px) clamp(28px,4vw,40px)' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '40px', marginBottom: '56px' }} className="footer-grid">

          {/* Brand */}
          <div>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 0' }}>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '1.75rem', lineHeight: 1, color: 'var(--on-surface)' }}>
                AIRent
              </span>
            </Link>
            <p style={{ color: 'var(--on-surface-3)', fontSize: '0.8125rem', lineHeight: 1.65, maxWidth: '220px', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>
              Rent frontier AI APIs by the hour. No subscriptions, no lock-in. Built in India.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { icon: <Github size={14} />,   href: 'https://github.com/deepanshusharma007',                   label: 'GitHub'   },
                { icon: <Linkedin size={14} />, href: 'https://www.linkedin.com/in/deepanshu-sharma-354154157/', label: 'LinkedIn' },
                { icon: <Mail size={14} />,     href: 'mailto:deepanshu2210sharma@gmail.com',                    label: 'Email'    },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid rgba(18,58,44,0.18)', color: 'var(--on-surface-3)', textDecoration: 'none', transition: 'color 120ms, border-color 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--on-surface)'; e.currentTarget.style.borderColor = 'rgba(18,58,44,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--on-surface-3)'; e.currentTarget.style.borderColor = 'rgba(18,58,44,0.18)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--on-surface-3)', marginBottom: '18px' }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {col.links.map(link => (
                  <li key={link.to}>
                    <Link to={link.to}
                      style={{ display: 'inline-block', padding: '9px 0', color: 'var(--on-surface-3)', fontSize: '0.8375rem', textDecoration: 'none', transition: 'color 120ms', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(18,58,44,0.09)', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--on-surface-4)', letterSpacing: '0.03em' }}>
            © {year} AIRent by Deepanshu Sharma
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--on-surface-4)', letterSpacing: '0.03em' }}>
            Payments secured by Cashfree
          </p>
        </div>
      </div>

    </footer>
  );
}
