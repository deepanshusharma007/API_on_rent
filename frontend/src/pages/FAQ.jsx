import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-60px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: d } } });

const FAQ_DATA = [
  { category: 'Getting Started', items: [
    { q: 'What is AIRent?',                            a: 'A marketplace to rent time-limited virtual API keys for top AI models. Pay once, get a key instantly, use any OpenAI-compatible client.' },
    { q: 'Do I need an OpenAI or Anthropic account?',  a: 'No. AIRent provides everything. Your virtual key works with any OpenAI-compatible SDK â€” no accounts with the underlying providers required.' },
    { q: 'How fast do I get access after payment?',    a: 'Instantly. Key appears in your dashboard and is emailed to you within seconds of payment confirmation.' },
    { q: 'Do I need a credit card?',                   a: 'No. We accept UPI, net banking, debit/credit cards, and wallets via Cashfree â€” all major Indian payment methods.' },
  ]},
  { category: 'Plans & Tokens', items: [
    { q: 'How do token caps work?',                    a: 'Each plan includes a maximum token budget (input + output per request). Different models drain at different rates.' },
    { q: 'What happens when tokens run out?',          a: 'Your key stops accepting requests. Buy a new plan anytime to continue â€” it activates as a separate rental.' },
    { q: 'What happens when rental time expires?',     a: 'The key deactivates at the end of the window even if tokens remain. Time and tokens are independent â€” whichever runs out first ends the rental.' },
    { q: 'Are there bulk or enterprise plans?',        a: 'Yes. Email deepanshu2210sharma@gmail.com for custom pricing on high-volume or team usage.' },
  ]},
  { category: 'Using the API', items: [
    { q: 'How do I use my virtual key in code?',       a: 'Set your API key to the virtual key and base_url to your AIRent endpoint. Any OpenAI SDK works â€” Python, Node.js, cURL â€” no other changes needed.' },
    { q: 'Can I use Claude or Gemini models?',         a: 'Yes. All plans include all supported providers. Specify the model name in your request â€” the model determines the drain rate.' },
    { q: 'Does AIRent support streaming?',             a: 'Yes. Pass stream: true just as with the standard OpenAI API. SSE streaming is fully supported.' },
    { q: 'Is my IP locked to the key?',                a: 'After the first request, the key is pinned to that IP to prevent theft. Contact us to reset if you change networks.' },
  ]},
  { category: 'Payments & Refunds', items: [
    { q: 'How is my payment secured?',                 a: 'Payments are processed by Cashfree Payments, a PCI DSS-compliant gateway. We never see or store your card details.' },
    { q: 'Can I get a refund?',                        a: 'Yes â€” within 24 hours of purchase if you have made zero API calls. See the full Refund Policy for details.' },
    { q: 'Payment went through but no key?',           a: 'Email deepanshu2210sharma@gmail.com with your payment reference â€” resolved within 2 business hours.' },
    { q: 'Do you provide invoices?',                   a: 'Yes. Download a PDF invoice from your dashboard after purchase.' },
  ]},
  { category: 'Privacy & Security', items: [
    { q: 'Do you store my prompts?',                   a: 'No. Prompts are forwarded in real time to the AI provider and never stored on our servers. Only usage metadata is kept.' },
    { q: 'What PII masking does AIRent apply?',        a: 'Before forwarding, we auto-redact emails, phone numbers, SSNs, and credit card numbers as an added safety layer.' },
    { q: 'Can I delete my account?',                   a: 'Yes. Email deepanshu2210sharma@gmail.com to request deletion. Data is permanently removed within 30 days.' },
  ]},
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: open ? '#e8edf8' : 'var(--on-surface-2)', letterSpacing: '-0.01em', lineHeight: 1.45, transition: 'color 120ms' }}>{q}</span>
        <ChevronDown size={15} color={open ? 'var(--primary)' : 'var(--on-surface-3)'} style={{ flexShrink: 0, marginTop: '3px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease, color 120ms' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} style={{ overflow: 'hidden' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.75, color: 'var(--on-surface-2)', paddingBottom: '20px', maxWidth: '62ch' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', ...FAQ_DATA.map(c => c.category)];

  const filtered = FAQ_DATA
    .filter(cat => category === 'All' || cat.category === category)
    .map(cat => ({ ...cat, items: cat.items.filter(item => !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())) }))
    .filter(cat => cat.items.length > 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>FAQ â€” AIRent | Common Questions About AI API Rental</title>
        <meta name="description" content="Answers to common questions about renting AI APIs â€” how it works, pricing, supported models, refunds, and security." />
      </Helmet>
      <Navbar />

      <main style={{ flex: 1, paddingTop: 'var(--header-h, 60px)' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,56px) clamp(40px,5vw,60px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" animate="show" variants={fadeUp(0)}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(192,193,255,0.2)', background: 'rgba(192,193,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '24px' }}>
                HELP CENTER
              </div>
            </motion.div>
            <motion.h1 initial="hidden" animate="show" variants={fadeUp(0.06)} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '16px' }}>
              Frequently Asked<br />Questions
            </motion.h1>
            <motion.p initial="hidden" animate="show" variants={fadeUp(0.12)} style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)', lineHeight: 1.7, marginBottom: '32px' }}>
              Everything you need to know about renting AI APIs via AIRent.
            </motion.p>

            {/* Search */}
            <motion.div initial="hidden" animate="show" variants={fadeUp(0.16)} style={{ position: 'relative', maxWidth: '480px' }}>
              <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-3)', pointerEvents: 'none' }} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search questions..."
                style={{ width: '100%', padding: '13px 16px 13px 40px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#e8edf8', boxSizing: 'border-box', transition: 'border-color 150ms' }}
                onFocus={e => e.target.style.borderColor = 'rgba(192,193,255,0.35)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section style={{ padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,56px) clamp(64px,8vw,96px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px', alignItems: 'start' }} className="faq-grid">

            {/* Sidebar categories */}
            <div style={{ position: 'sticky', top: '80px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>CATEGORIES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} style={{
                    padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: category === cat ? 'rgba(192,193,255,0.1)' : 'transparent',
                    color: category === cat ? 'var(--primary)' : 'var(--on-surface-2)',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: category === cat ? 600 : 400,
                    transition: 'background 120ms, color 120ms',
                  }}
                    onMouseEnter={e => { if (category !== cat) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e8edf8'; } }}
                    onMouseLeave={e => { if (category !== cat) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-2)'; } }}
                  >{cat}</button>
                ))}
              </div>
            </div>

            {/* FAQ list */}
            <div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--on-surface-3)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>No results for "{search}"</div>
              ) : filtered.map((cat, ci) => (
                <motion.div key={cat.category} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(ci * 0.05)} style={{ marginBottom: '48px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--primary)', marginBottom: '4px' }}>{cat.category.toUpperCase()}</div>
                  {cat.items.map((item, i) => <AccordionItem key={i} q={item.q} a={item.a} />)}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                </motion.div>
              ))}

              {/* CTA */}
              <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)} style={{ padding: '28px', borderRadius: '14px', background: 'rgba(192,193,255,0.04)', border: '1px solid rgba(192,193,255,0.12)', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)', marginBottom: '16px' }}>Still have questions?</p>
                <a href="mailto:deepanshu2210sharma@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, background: 'var(--primary)', color: 'var(--on-primary)', transition: 'filter 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  Email us <ArrowRight size={13} />
                </a>
              </motion.div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <style>{`
        @media (max-width: 720px) { .faq-grid { grid-template-columns: 1fr !important; } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

