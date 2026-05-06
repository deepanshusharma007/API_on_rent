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

const linkStyle = {
  color: 'var(--ink-6)',
  fontSize: '0.8375rem',
  textDecoration: 'none',
  transition: 'color 120ms',
  lineHeight: 1.5,
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--ink-0)', borderTop: '1px solid var(--ink-4)', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: 'clamp(48px,8vw,80px) clamp(20px,5vw,80px) clamp(28px,4vw,40px)' }}>

        {/* Top row — brand + columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '40px', marginBottom: '56px' }}
          className="footer-grid">

          {/* Brand */}
          <div>
            <Link to="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.02em', color: 'var(--ink-9)' }}>
                AI<span style={{ color: 'var(--c-accent)' }}>Rent</span>
              </span>
            </Link>
            <p style={{ color: 'var(--ink-6)', fontSize: '0.8125rem', lineHeight: 1.65, maxWidth: '220px', marginBottom: '24px' }}>
              Rent frontier AI APIs by the hour. No subscriptions, no lock-in. Built in India.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { icon: <Github size={14} />,   href: 'https://github.com/deepanshusharma007',                        label: 'GitHub'   },
                { icon: <Linkedin size={14} />, href: 'https://www.linkedin.com/in/deepanshu-sharma-354154157/',      label: 'LinkedIn' },
                { icon: <Mail size={14} />,     href: 'mailto:deepanshu2210sharma@gmail.com',                         label: 'Email'    },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', border: '1px solid var(--ink-4)', color: 'var(--ink-6)', textDecoration: 'none', transition: 'color 120ms, border-color 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-9)'; e.currentTarget.style.borderColor = 'var(--ink-5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-6)'; e.currentTarget.style.borderColor = 'var(--ink-4)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-5)', marginBottom: '18px' }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {col.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      style={linkStyle}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-8)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-6)'}
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
        <div style={{ borderTop: '1px solid var(--ink-3)', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-5)', letterSpacing: '0.03em' }}>
            © {year} AIRent by Deepanshu Sharma
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-5)', letterSpacing: '0.03em' }}>
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
