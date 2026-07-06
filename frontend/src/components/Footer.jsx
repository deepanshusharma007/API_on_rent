import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail } from 'lucide-react';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Pricing',        to: '/pricing'     },
      { label: 'Marketplace',    to: '/marketplace' },
      { label: 'Playground',     to: '/playground'  },
      { label: 'System Status',  to: '/status'      },
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
    <footer style={{ background: 'oklch(0.13 0.025 240)', borderTop: '1px solid var(--nb-border)', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,80px) clamp(28px,4vw,40px)' }}>

        {/* Top row — brand + columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '40px', marginBottom: '56px' }}
          className="footer-grid">

          {/* Brand */}
          <div>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '7px', background: 'var(--mint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, color: 'oklch(0.14 0.03 240)' }}>AI</span>
              </div>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.02em', color: 'var(--nb-text)' }}>
                AI<span style={{ color: 'var(--mint)' }}>Rent</span>
              </span>
            </Link>
            <p style={{ color: 'var(--nb-text-3)', fontSize: '0.8125rem', lineHeight: 1.65, maxWidth: '220px', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>
              Rent frontier AI APIs by the hour. No subscriptions, no lock-in. Built in India.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { icon: <Github size={14} />,   href: 'https://github.com/deepanshusharma007',                   label: 'GitHub'   },
                { icon: <Linkedin size={14} />, href: 'https://www.linkedin.com/in/deepanshu-sharma-354154157/', label: 'LinkedIn' },
                { icon: <Mail size={14} />,     href: 'mailto:deepanshu2210sharma@gmail.com',                    label: 'Email'    },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px', border: '1px solid var(--nb-border)', color: 'var(--nb-text-3)',
                    textDecoration: 'none', transition: 'color 120ms, border-color 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--nb-text)'; e.currentTarget.style.borderColor = 'var(--nb-border-hi)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--nb-text-3)'; e.currentTarget.style.borderColor = 'var(--nb-border)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--nb-text-4)', marginBottom: '18px' }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {col.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      style={{ color: 'var(--nb-text-3)', fontSize: '0.8375rem', textDecoration: 'none', transition: 'color 120ms', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
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
        <div style={{ borderTop: '1px solid var(--nb-border)', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-4)', letterSpacing: '0.03em' }}>
            © {year} AIRent by Deepanshu Sharma
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-4)', letterSpacing: '0.03em' }}>
            Payments secured by Cashfree
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
