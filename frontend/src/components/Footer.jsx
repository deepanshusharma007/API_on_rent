import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Mail, Shield, ArrowUpRight } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Product',
    links: [
      { label: 'Pricing',        to: '/pricing' },
      { label: 'API Playground', to: '/playground' },
      { label: 'Marketplace',    to: '/marketplace' },
      { label: 'System Status',  to: '/status' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',   to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'FAQ',     to: '/faq' },
      { label: 'API Docs',to: '/docs' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service',to: '/terms' },
      { label: 'Refund Policy',  to: '/refund-policy' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)' }}
      />

      <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <img
                src="/logo.png"
                alt="AIRent"
                className="w-8 h-8 object-contain drop-shadow-[0_0_6px_rgba(250,180,0,0.45)] group-hover:drop-shadow-[0_0_10px_rgba(250,180,0,0.65)] transition-all"
              />
              <span className="text-[#f0eefa] font-bold text-base tracking-tight">
                AI<span className="text-violet-400">Rent</span>
              </span>
            </Link>
            <p className="text-[#52505f] text-sm leading-relaxed mb-6 max-w-[200px]">
              Rent frontier AI models by the hour. No subscriptions, no lock-in.
            </p>
            <div className="flex gap-2">
              {[
                { icon: <Github className="w-4 h-4" />, href: 'https://github.com/deepanshusharma007', label: 'GitHub' },
                { icon: <Mail   className="w-4 h-4" />, href: 'mailto:deepanshu2210sharma@gmail.com',  label: 'Email'  },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#52505f] hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-[#f0eefa] text-xs font-semibold uppercase tracking-widest mb-5">
                {section.title}
              </p>
              <ul className="space-y-3">
                {section.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group inline-flex items-center gap-1 text-[#52505f] hover:text-[#8e8ca4] text-sm transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="divider mb-7" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#52505f] text-xs">
            © {year} AIRent by Deepanshu Sharma · Built in India 🇮🇳
          </p>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#52505f]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Shield className="w-3.5 h-3.5 text-violet-500" />
            Secured by Cashfree Payments
          </div>
        </div>
      </div>
    </footer>
  );
}
