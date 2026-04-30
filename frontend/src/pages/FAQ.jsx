import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { fadeUp, staggerContainer, viewport } from '../lib/motion';

const FAQ_DATA = [
  {
    category: 'Getting Started', emoji: '🚀',
    items: [
      { q: 'What is AIRent?',                        a: 'AIRent is a marketplace to rent time-limited virtual API keys for top AI models — GPT-4o, Claude 3.5, Gemini 1.5 Pro and more. Pay once, get a key instantly, use any OpenAI-compatible SDK.' },
      { q: 'Do I need an OpenAI or Anthropic account?', a: 'No. AIRent provides everything. Your virtual key works with any OpenAI-compatible client — no accounts with the underlying providers required.' },
      { q: 'How quickly do I get access after payment?', a: 'Instantly. Your key appears in your dashboard and is emailed to you within seconds of payment confirmation.' },
      { q: 'Do I need a credit card?',                a: 'No. We accept UPI, net banking, debit/credit cards, and wallets via Cashfree — all major Indian payment methods.' },
    ],
  },
  {
    category: 'Plans & Tokens', emoji: '💎',
    items: [
      { q: 'How do token caps work?',                 a: 'Each plan includes a maximum token budget. Tokens count input + output per request. Different models drain at different rates — GPT-4o costs 10× more than Gemini Flash.' },
      { q: 'What happens when tokens run out?',       a: 'Your key stops accepting requests once the balance hits zero. Purchase a new plan anytime to continue.' },
      { q: 'What happens when rental time expires?',  a: 'The key deactivates at the end of the window even if tokens remain. Time and tokens are independent limits — whichever runs out first ends the rental.' },
      { q: 'Are there bulk or enterprise plans?',     a: 'Yes. Email deepanshu2210sharma@gmail.com for custom pricing on high-volume or team usage.' },
    ],
  },
  {
    category: 'Using the API', emoji: '⚡',
    items: [
      { q: 'How do I use my virtual key in code?',   a: 'Set your API key to the virtual key and base_url to your AIRent endpoint. Any OpenAI SDK works — Python, Node.js, cURL — no other changes.' },
      { q: 'Can I use Claude or Gemini models?',      a: 'Yes. All plans include all supported models. Specify the model name in your request — the model determines the drain rate.' },
      { q: 'Does AIRent support streaming?',          a: 'Yes. Pass stream: true just as with the standard OpenAI API. SSE streaming is fully supported.' },
      { q: 'Is my IP locked to the key?',             a: 'After the first request, the key is pinned to that IP to prevent theft. Contact me to reset if you change networks.' },
    ],
  },
  {
    category: 'Payments & Refunds', emoji: '💳',
    items: [
      { q: 'How is my payment secured?',              a: 'Payments are processed by Cashfree Payments, a PCI DSS-compliant gateway. We never see or store your card details.' },
      { q: 'Can I get a refund?',                     a: 'Yes — within 24 hours of purchase if you have made zero API calls. See the full Refund Policy for details.' },
      { q: 'Payment went through but no key?',        a: 'Email me at deepanshu2210sharma@gmail.com with your payment reference — resolved within 2 business hours.' },
      { q: 'Do you provide invoices?',                a: 'Yes. Download a PDF invoice from your dashboard after purchase.' },
    ],
  },
  {
    category: 'Privacy & Security', emoji: '🔒',
    items: [
      { q: 'Do you store my prompts?',                a: 'No. Prompts are forwarded in real time to the AI provider and never stored. Only usage metadata (token count, model, timestamp) is kept.' },
      { q: 'What PII masking does AIRent apply?',     a: 'Before forwarding your prompt we auto-redact emails, phone numbers, SSNs, and credit card numbers as an added safety layer.' },
      { q: 'Can I delete my account?',                a: 'Yes. Email deepanshu2210sharma@gmail.com to request deletion. Data is permanently removed within 30 days.' },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: open ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${open ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={`text-sm font-medium transition-colors ${open ? 'text-[#f0eefa]' : 'text-[#8e8ca4]'}`}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-violet-400' : 'text-[#52505f]'}`} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="px-5 pb-5 text-[#8e8ca4] text-sm leading-relaxed pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [search, setSearch]           = useState('');
  const [activeCategory, setCategory] = useState('All');

  const categories = ['All', ...FAQ_DATA.map(c => c.category)];

  const filtered = FAQ_DATA
    .filter(cat => activeCategory === 'All' || cat.category === activeCategory)
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-14 px-5 text-center mesh-hero">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <HelpCircle className="w-5 h-5 text-violet-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-[clamp(2rem,5vw,3.5rem)] font-black text-[#f0eefa] mb-3 leading-tight tracking-tight">
            Frequently Asked <span className="gradient-text">Questions</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#52505f] text-sm mb-8">
            Can't find the answer?{' '}
            <Link to="/contact" className="text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors">
              Contact me directly →
            </Link>
          </motion.p>
          {/* Search */}
          <motion.div variants={fadeUp} className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-[#52505f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text" placeholder="Search questions..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="field pl-10 pr-10"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#52505f] hover:text-[#8e8ca4] text-xs transition-colors">
                Clear
              </button>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Category tabs */}
      <section className="px-5 pb-6">
        <div className="max-w-3xl mx-auto flex gap-2 flex-wrap justify-center">
          {categories.map(cat => {
            const emojiItem = FAQ_DATA.find(d => d.category === cat);
            const active    = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'rgba(124,58,237,0.12)' : 'var(--bg-surface)',
                  border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  color: active ? '#a78bfa' : '#8e8ca4',
                }}
              >
                {emojiItem ? `${emojiItem.emoji} ` : ''}{cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accordion */}
      <section className="px-5 pb-16 flex-1">
        <div className="max-w-3xl mx-auto space-y-8">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <HelpCircle className="w-10 h-10 text-[#2e2c3a] mx-auto mb-4" />
              <p className="text-[#8e8ca4] text-lg">No results for "{search}"</p>
              <p className="text-[#52505f] text-sm mt-2">
                Try different terms or{' '}
                <Link to="/contact" className="text-violet-400 hover:underline">contact me</Link>.
              </p>
            </motion.div>
          ) : (
            filtered.map(cat => (
              <motion.div
                key={cat.category}
                variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}
              >
                <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3">
                  <span className="text-base">{cat.emoji}</span>
                  <span className="text-xs uppercase tracking-widest text-[#52505f] font-semibold">{cat.category}</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.055)' }} />
                </motion.div>
                <div className="space-y-2">
                  {cat.items.map(item => (
                    <motion.div key={item.q} variants={fadeUp}>
                      <AccordionItem q={item.q} a={item.a} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-sm mx-auto text-center p-8 rounded-2xl"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h3 className="text-[#f0eefa] text-base font-bold mb-2">Still have questions?</h3>
          <p className="text-[#52505f] text-sm mb-5">I typically respond within 24 hours.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-xl text-sm transition-all"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 16px rgba(124,58,237,0.22)' }}
          >
            Contact me
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
