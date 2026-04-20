import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { fadeUp, staggerContainer, viewport } from '../lib/motion';

const FAQ_DATA = [
  {
    category: 'Getting Started',
    emoji: '🚀',
    items: [
      { q: 'What is AIRent?', a: 'AIRent is a marketplace where you can rent time-limited virtual API keys to access top AI models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and more. You pay a one-time amount for a specific token cap and rental window.' },
      { q: 'Do I need an OpenAI or Anthropic account?', a: 'No. AIRent provides everything. Purchase a plan and receive a virtual API key that works with any OpenAI-compatible SDK — no accounts with the underlying providers needed.' },
      { q: 'How quickly do I get access after payment?', a: 'Instantly. Your virtual API key appears in your dashboard and is emailed to you within seconds of a successful payment confirmation.' },
      { q: 'Do I need a credit card?', a: 'No. We accept UPI, net banking, debit/credit cards, and wallets via Cashfree — all major Indian payment methods accepted.' },
    ],
  },
  {
    category: 'Plans & Tokens',
    emoji: '💎',
    items: [
      { q: 'How do token caps work?', a: 'Each plan includes a maximum number of tokens you can consume. Tokens are counted per API request (input + output). Different models consume tokens at different rates — GPT-4o costs 10× more credits per token than Gemini Flash.' },
      { q: 'What happens when my tokens run out?', a: 'Once your token balance reaches zero, your virtual key stops accepting requests. You can purchase a new plan anytime to get more tokens.' },
      { q: 'What happens when my rental time expires?', a: 'Your key is automatically deactivated at the end of the rental window, even if you have tokens remaining. Time and token balance are separate limits — whichever runs out first ends the rental.' },
      { q: 'Can I upgrade mid-rental?', a: 'Not directly — purchase a new plan which activates as a separate rental. Contact me for special situations.' },
      { q: 'Are there bulk or enterprise plans?', a: 'Yes. Email deepanshu2210sharma@gmail.com for custom pricing on high-volume usage or team plans.' },
    ],
  },
  {
    category: 'Using the API',
    emoji: '⚡',
    items: [
      { q: 'How do I use my virtual key in code?', a: 'Replace your OpenAI API key with your virtual key and set the base URL to your AIRent endpoint. Use any OpenAI SDK — Python, Node.js, etc. — without any other code changes.' },
      { q: 'Can I use Claude or Gemini models?', a: 'Yes. All plans include access to all supported models. Specify the model name in your API call (e.g., model: "claude-3-5-sonnet-20241022"). The model determines the token drain rate.' },
      { q: 'What is the rate limit?', a: 'Rate limits depend on your plan (shown in RPM on the pricing page). Exceeding the limit returns a 429 with a Retry-After header. The limit resets every 60 seconds.' },
      { q: 'Does AIRent support streaming?', a: 'Yes. Pass stream: true in your request just as you would with the standard OpenAI API. Server-sent events (SSE) streaming is fully supported.' },
      { q: 'Is my IP address locked to the key?', a: 'After the first API request, your key is pinned to that IP address to prevent theft. If you change networks and get locked out, contact me to reset.' },
    ],
  },
  {
    category: 'Payments & Refunds',
    emoji: '💳',
    items: [
      { q: 'How is my payment secured?', a: 'Payments are processed entirely by Cashfree Payments, a PCI DSS-compliant gateway. We never see or store your card details.' },
      { q: 'Can I get a refund?', a: 'Yes — within 24 hours of purchase if you have made zero API calls. See the full Refund Policy for details.' },
      { q: 'Payment went through but no key?', a: 'Contact me at deepanshu2210sharma@gmail.com immediately with your payment reference. I resolve this within 2 business hours.' },
      { q: 'Do you provide invoices?', a: 'Yes. Download a PDF invoice from your dashboard (Rentals → Invoice icon) after purchase.' },
    ],
  },
  {
    category: 'Privacy & Security',
    emoji: '🔒',
    items: [
      { q: 'Do you store my prompts?', a: 'No. Prompts are forwarded in real time to the AI provider and are never stored on our servers. Only usage metadata (token count, model, timestamp, cost) is stored.' },
      { q: 'What PII masking does AIRent apply?', a: 'Before forwarding your prompt, we automatically redact emails, phone numbers, Social Security numbers, and credit card numbers as an added safety layer.' },
      { q: 'Can I delete my account?', a: 'Yes. Email deepanshu2210sharma@gmail.com to request account deletion. Data is permanently deleted within 30 days.' },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-lg border transition-all duration-200 overflow-hidden ${
        open ? 'bg-[#1a1a1a] border-violet-500/30' : 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={`text-sm font-medium transition-colors ${open ? 'text-white' : 'text-gray-300'}`}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-colors ${open ? 'text-violet-400' : 'text-gray-600'}`} />
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
            <p className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/[0.06] pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

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
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-5 text-center">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-2xl mx-auto"
        >
          <motion.div variants={fadeUp} className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <HelpCircle className="w-6 h-6 text-violet-400" />
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Frequently Asked <span className="text-violet-400">Questions</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 text-base mb-7">
            Can't find the answer?{' '}
            <Link to="/contact" className="text-violet-400 hover:text-violet-300 underline underline-offset-4 transition-colors">
              Contact me directly →
            </Link>
          </motion.p>

          {/* Search bar */}
          <motion.div variants={fadeUp} className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#111] border border-white/[0.10] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-xs">
                Clear
              </button>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Category tabs */}
      <section className="px-5 pb-6">
        <motion.div
          variants={staggerContainer(0.05)} initial="hidden" animate="show"
          className="max-w-4xl mx-auto flex gap-2 flex-wrap justify-center"
        >
          {categories.map((cat, i) => {
            const emojiItem = FAQ_DATA.find(d => d.category === cat);
            return (
              <motion.button
                key={cat}
                variants={fadeUp}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-[#111] border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.14]'
                }`}
              >
                {emojiItem ? `${emojiItem.emoji} ` : ''}{cat}
              </motion.button>
            );
          })}
        </motion.div>
      </section>

      {/* FAQ content */}
      <section className="px-5 pb-16 flex-1">
        <div className="max-w-3xl mx-auto space-y-7">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <HelpCircle className="w-10 h-10 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No results for "{search}"</p>
              <p className="text-gray-600 text-sm mt-2">
                Try a different term or{' '}
                <Link to="/contact" className="text-violet-400 hover:underline">contact me directly</Link>.
              </p>
            </motion.div>
          ) : (
            filtered.map(cat => (
              <motion.div
                key={cat.category}
                variants={staggerContainer(0.06)} initial="hidden" whileInView="show" viewport={viewport}
              >
                <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3">
                  <span className="text-lg">{cat.emoji}</span>
                  <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">{cat.category}</h2>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </motion.div>
                <motion.div variants={staggerContainer(0.05)} className="space-y-2">
                  {cat.items.map((item) => (
                    <motion.div key={item.q} variants={fadeUp}>
                      <AccordionItem q={item.q} a={item.a} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-5">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={viewport}
          className="max-w-md mx-auto text-center p-8 rounded-lg bg-[#111] border border-white/[0.08]"
        >
          <h3 className="text-white text-lg font-bold mb-2">Still have questions?</h3>
          <p className="text-gray-500 mb-5 text-sm">I typically respond within 24 hours.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Contact Me
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
