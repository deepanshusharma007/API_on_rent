import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Mail, Shield, Linkedin } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Product',
    links: [
      { label: 'Pricing',        to: '/pricing'     },
      { label: 'Marketplace',    to: '/marketplace' },
      { label: 'API Playground', to: '/playground'  },
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
      { label: 'Privacy Policy',  to: '/privacy-policy' },
      { label: 'Terms of Service',to: '/terms'          },
      { label: 'Refund Policy',   to: '/refund-policy'  },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', marginTop: 'auto' }}>
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group" style={{ textDecoration: 'none' }}>
              <img
                src="/logo.png" alt="AIRent"
                className="w-7 h-7 object-contain group-hover:opacity-80 transition-opacity"
                style={{ filter: 'drop-shadow(0 0 5px rgba(250,180,0,0.4))' }}
              />
              <span style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '0.9rem' }}>
                AI<span style={{ color: 'var(--c-accent)' }}>Rent</span>
              </span>
            </Link>
            <p style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', lineHeight: 1.6, maxWidth: '200px', marginBottom: '20px' }}>
              Rent frontier AI APIs by the hour. No subscriptions, no lock-in.
            </p>
            <div className="flex gap-2">
              {[
                { icon: <Github   size={15} />, href: 'https://github.com/deepanshusharma007',                        label: 'GitHub'   },
                { icon: <Linkedin size={15} />, href: 'https://www.linkedin.com/in/deepanshu-sharma-354154157/', label: 'LinkedIn' },
                { icon: <Mail     size={15} />, href: 'mailto:deepanshu2210sharma@gmail.com',                    label: 'Email'    },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--c-raised)', border: '1px solid var(--c-border)',
                    color: 'var(--c-text-3)', transition: 'color 150ms, border-color 150ms',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-text)'; e.currentTarget.style.borderColor = 'var(--c-border-hi)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-3)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p style={{ color: 'var(--c-text)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                {section.title}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 150ms' }}
                      onMouseEnter={e => e.target.style.color = 'var(--c-text-2)'}
                      onMouseLeave={e => e.target.style.color = 'var(--c-text-3)'}
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
        <div className="divider mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ color: 'var(--c-text-3)', fontSize: '0.8rem' }}>
            © {year} AIRent by Deepanshu Sharma · Built in India 🇮🇳
          </p>
          <div
            className="inline-flex items-center gap-2"
            style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', padding: '5px 10px', borderRadius: '6px', background: 'var(--c-raised)', border: '1px solid var(--c-border)' }}
          >
            <Shield size={13} style={{ color: 'var(--c-accent)' }} />
            Secured by Cashfree Payments
          </div>
        </div>
      </div>
    </footer>
  );
}
