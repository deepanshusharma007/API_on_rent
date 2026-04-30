import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { fadeUp, staggerContainer, viewport } from '../lib/motion';

const FAQ_DATA = [
  { category: 'Getting Started', items: [
    { q: 'What is AIRent?',                            a: 'A marketplace to rent time-limited virtual API keys for top AI models — GPT-4o, Claude 3.5, Gemini 1.5 Pro. Pay once, get a key instantly, use any OpenAI-compatible client.' },
    { q: 'Do I need an OpenAI or Anthropic account?',  a: 'No. AIRent provides everything. Your virtual key works with any OpenAI-compatible SDK — no accounts with the underlying providers required.' },
    { q: 'How fast do I get access after payment?',    a: 'Instantly. Key appears in your dashboard and is emailed to you within seconds of payment confirmation.' },
    { q: 'Do I need a credit card?',                   a: 'No. We accept UPI, net banking, debit/credit cards, and wallets via Cashfree — all major Indian payment methods.' },
  ]},
  { category: 'Plans & Tokens', items: [
    { q: 'How do token caps work?',                    a: 'Each plan includes a maximum token budget (input + output per request). Different models drain at different rates — GPT-4o costs 10× more credits than Gemini Flash.' },
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
    <div style={{ borderBottom: '1px solid var(--c-border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: open ? 'var(--c-text)' : 'var(--c-text-2)', fontSize: '0.9rem', fontWeight: 500, transition: 'color 150ms' }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={16} style={{ color: open ? 'var(--c-accent)' : 'var(--c-text-3)' }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="prose-width" style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', lineHeight: 1.7, paddingBottom: '16px' }}>{a}</p>
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '56px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow mb-5">Help Center</motion.p>
            <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '16px' }}>
              Frequently asked questions
            </motion.h1>
            <motion.p variants={fadeUp} style={{ color: 'var(--c-text-2)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '28px' }}>
              Can't find the answer?{' '}
              <Link to="/contact" style={{ color: 'var(--c-accent)', textDecoration: 'none', fontWeight: 500 }}>Contact me directly →</Link>
            </motion.p>
            {/* Search */}
            <motion.div variants={fadeUp} style={{ position: 'relative', maxWidth: '420px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search questions..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="field" style={{ paddingLeft: '36px', paddingRight: search ? '60px' : '12px' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Clear
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Category tabs */}
      <section style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '32px' }}>
        <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
                cursor: 'pointer', border: '1px solid',
                background:   category === cat ? 'var(--c-accent-bg)' : 'var(--c-surface)',
                borderColor:  category === cat ? 'var(--c-accent-border)' : 'var(--c-border)',
                color:        category === cat ? 'var(--c-accent-hi)' : 'var(--c-text-3)',
                transition: 'all 150ms',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Questions */}
      <section style={{ padding: '0 20px 96px', flex: 1 }}>
        <div className="max-w-2xl mx-auto">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--c-text-3)' }}>
              <p style={{ fontSize: '1rem', marginBottom: '8px' }}>No results for "{search}"</p>
              <p style={{ fontSize: '0.875rem' }}>
                Try different terms or{' '}
                <Link to="/contact" style={{ color: 'var(--c-accent)', textDecoration: 'none' }}>contact me</Link>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {filtered.map(cat => (
                <motion.div
                  key={cat.category}
                  variants={staggerContainer(0.05)} initial="hidden" whileInView="show" viewport={viewport}
                >
                  <motion.p variants={fadeUp} className="eyebrow mb-4">{cat.category}</motion.p>
                  <div>
                    {cat.items.map(item => (
                      <AccordionItem key={item.q} q={item.q} a={item.a} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 20px', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-sm mx-auto text-center">
          <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Still have questions?</h3>
          <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', marginBottom: '20px' }}>I typically respond within 24 hours.</p>
          <Link to="/contact" className="btn btn-primary" style={{ display: 'inline-flex' }}>Contact me</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
