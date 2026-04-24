import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, Mail, Shield, ArrowUpRight } from 'lucide-react';

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'API Playground', to: '/playground' },
      { label: 'System Status', to: '/status' },
      { label: 'Marketplace', to: '/marketplace' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'FAQ', to: '/faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Refund Policy', to: '/refund-policy' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] mt-auto">
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="AIRent" className="w-8 h-8 object-contain drop-shadow-[0_0_5px_rgba(250,180,0,0.4)]" />
              <span className="text-white font-bold text-lg">
                AI<span className="text-violet-400">Rent</span>
              </span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-[220px]">
              Rent access to GPT-4o, Claude & Gemini — pay only for what you use. No subscriptions.
            </p>
            <div className="flex gap-2">
              {[
                { icon: <Github className="w-4 h-4" />, href: 'https://github.com/deepanshusharma007', label: 'GitHub' },
                { icon: <Mail className="w-4 h-4" />, href: 'mailto:deepanshu2210sharma@gmail.com', label: 'Email' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link sections */}
          {footerSections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {year}{' '}
            <span className="text-gray-500">AIRent by Deepanshu Sharma</span>
            {' '}— All rights reserved. Built in India 🇮🇳
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-gray-500 text-xs">Payments secured by Cashfree</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
