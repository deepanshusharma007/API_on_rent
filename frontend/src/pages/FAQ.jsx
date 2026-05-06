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
const SP = { padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '1120px', margin: '0 auto' };

const FAQ_DATA = [
  { category: 'Getting Started', items: [
    { q: 'What is AIRent?',                            a: 'A marketplace to rent time-limited virtual API keys for top AI models — GPT-4o, Claude 3.5, Gemini 1.5 Pro. Pay once, get a key instantly, use any OpenAI-compatible client.' },
    { q: 'Do I need an OpenAI or Anthropic account?',  a: 'No. AIRent provides everything. Your virtual key works with any OpenAI-compatible SDK — no accounts with the underlying providers required.' },
    { q: 'How fast do I get access after payment?',    a: 'Instantly. Key appears in your dashboard and is emailed to you within seconds of payment confirmation.' },
    { q: 'Do I need a credit card?',                   a: 'No. We accept UPI, net banking, debit/credit cards, and wallets via Cashfree — all major Indian payment methods.' },
  ]},
  { category: 'Plans & Tokens', items: [
    { q: 'How do token caps work?',                    a: 'Each plan includes a maximum token budget (input + output per request). Different models drain at different rates — GPT-4o costs 10x more credits than Gemini Flash.' },
    { q: 'What happens when tokens run out?',          a: 'Your key stops accepting requests. Buy a new plan anytime to continue — it activates as a separate rental.' },
    { q: 'What happens when rental time expires?',     a: 'The key deactivates at the end of the window even if tokens remain. Time and tokens are independent — whichever runs out first ends the rental.' },
    { q: 'Are there bulk or enterprise plans?',        a: 'Yes. Email deepanshu2210sharma@gmail.com for custom pricing on high-volume or team usage.' },
  ]},
  { category: 'Using the API', items: [
    { q: 'How do I use my virtual key in code?',       a: 'Set your API key to the virtual key and base_url to your AIRent endpoint. Any OpenAI SDK works — Python, Node.js, cURL — no other changes needed.' },
    { q: 'Can I use Claude or Gemini models?',         a: 'Yes. All plans include all supported models. Specify the model name in your request — the model determines the drain rate.' },
    { q: 'Does AIRent support streaming?',             a: 'Yes. Pass stream: true just as with the standard OpenAI API. SSE streaming is fully supported.' },
    { q: 'Is my IP locked to the key?',                a: 'After the first request, the key is pinned to that IP to prevent theft. Contact me to reset if you change networks.' },
  ]},
  { category: 'Payments & Refunds', items: [
    { q: 'How is my payment secured?',                 a: 'Payments are processed by Cashfree Payments, a PCI DSS-compliant gateway. We never see or store your card details.' },
    { q: 'Can I get a refund?',                        a: 'Yes — within 24 hours of purchase if you have made zero API calls. See the full Refund Policy for details.' },
    { q: 'Payment went through but no key?',           a: 'Email deepanshu2210sharma@gmail.com with your payment reference — resolved within 2 business hours.' },
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
    <div style={{ borderTop: '1px solid var(--nb-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '24px',
          alignItems: 'start',
          padding: '20px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: open ? 'var(--nb-text)' : 'var(--nb-text-2)', letterSpacing: '-0.01em', lineHeight: 1.45, transition: 'color 120ms' }}>
          {q}
        </span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.18, ease: EASE }} style={{ marginTop: '2px', flexShrink: 0 }}>
          <ChevronDown size={15} style={{ color: open ? 'var(--nb-green)' : 'var(--nb-text-3)', transition: 'color 120ms' }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.75, color: 'var(--nb-text-2)', paddingBottom: '20px', maxWidth: '62ch' }}>{a}</p>
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
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(cat => cat.items.length > 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>FAQ — AIRent | Common Questions About AI API Rental</title>
        <meta name="description" content="Answers to common questions about renting AI APIs — how it works, pricing, supported models, refunds, and security." />
        <link rel="canonical" href="https://airent.dev/faq" />
      </Helmet>
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="nb-grid-hero"
        style={{
          paddingTop: 'clamp(120px,16vw,180px)',
          paddingBottom: 'clamp(64px,8vw,96px)',
          paddingLeft: 'clamp(20px,5vw,72px)',
          paddingRight: 'clamp(20px,5vw,72px)',
          borderBottom: '1px solid var(--nb-border)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(to bottom, transparent, var(--nb-bg))', pointerEvents: 'none' }} />
        <div style={{ ...MAX, position: 'relative' }}>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              <span style={{ width: '18px', height: '1px', background: 'var(--nb-green)', display: 'inline-block' }} />
              HELP CENTER
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp(0.06)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.8rem,7vw,5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '28px' }}
          >
            Frequently asked<br />
            <span style={{ color: 'var(--nb-text-2)' }}>questions.</span>
          </motion.h1>
          <motion.div variants={fadeUp(0.12)} initial="hidden" animate="show" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--nb-text-2)' }}>
              Can't find the answer?
            </p>
            <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--nb-green)', textDecoration: 'none', letterSpacing: '0.06em' }}>
              CONTACT ME DIRECTLY <ArrowRight size={11} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Search + filters ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)', padding: 'clamp(24px,4vw,40px) clamp(20px,5vw,72px)' }}>
        <div style={{ ...MAX, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '360px' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nb-text-3)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search questions..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="field"
              style={{ paddingLeft: '34px', borderRadius: '4px', fontSize: '0.8375rem' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--nb-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                CLEAR
              </button>
            )}
          </div>

          {/* Category pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid',
                  letterSpacing: '0.06em',
                  background:   category === cat ? 'var(--nb-green-bg)' : 'transparent',
                  borderColor:  category === cat ? 'var(--nb-green-border)' : 'var(--nb-border)',
                  color:        category === cat ? 'var(--nb-green)' : 'var(--nb-text-3)',
                  transition: 'all 120ms',
                }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Questions ── */}
      <section style={{ flex: 1, ...SP }}>
        <div style={{ ...MAX }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', color: 'var(--nb-text-2)', marginBottom: '8px' }}>No results for "{search}"</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--nb-text-3)' }}>
                Try different terms or{' '}
                <Link to="/contact" style={{ color: 'var(--nb-green)', textDecoration: 'none' }}>contact me directly</Link>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '64px', alignItems: 'start' }} className="faq-grid">
              {/* Sidebar */}
              <div style={{ position: 'sticky', top: '80px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '16px' }}>CATEGORIES</span>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 0',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--nb-border)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem',
                      color: category === cat ? 'var(--nb-text)' : 'var(--nb-text-3)',
                      cursor: 'pointer',
                      fontWeight: category === cat ? 600 : 400,
                      transition: 'color 120ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = category === cat ? 'var(--nb-text)' : 'var(--nb-text-3)'}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {filtered.map(cat => (
                  <motion.div key={cat.category} variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>{cat.category.toUpperCase()}</span>
                    <div>
                      {cat.items.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
                      <div style={{ borderTop: '1px solid var(--nb-border)' }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ borderTop: '1px solid var(--nb-border)', background: 'var(--nb-surface)', ...SP }}>
        <div style={{ ...MAX }}>
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>STILL HAVE QUESTIONS</span>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 'clamp(1.2rem,3vw,1.8rem)', letterSpacing: '-0.025em', color: 'var(--nb-text)' }}>I typically respond within 24 hours.</h2>
            </div>
            <Link to="/contact" className="btn btn-primary" style={{ padding: '10px 22px' }}>Contact me <ArrowRight size={14} /></Link>
          </motion.div>
        </div>
      </section>

      <Footer />
      <style>{`
        @media (max-width: 768px) { .faq-grid { grid-template-columns: 1fr !important; } .faq-grid > *:first-child { position: static !important; } }
      `}</style>
    </div>
  );
}
