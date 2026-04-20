import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Clock, Send, CheckCircle, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, scaleIn, viewport } from '../lib/motion';

const CONTACT_INFO = [
  {
    icon: Mail,
    color: 'text-violet-400',
    title: 'Email',
    value: 'deepanshu2210sharma@gmail.com',
    sub: 'For all queries — support, billing, and partnerships',
    href: 'mailto:deepanshu2210sharma@gmail.com',
  },
  {
    icon: MessageSquare,
    color: 'text-sky-400',
    title: 'Phone / WhatsApp',
    value: '+91 91317 70985',
    sub: 'Mon – Sat, 10 AM – 8 PM IST',
    href: 'tel:+919131770985',
  },
  {
    icon: Clock,
    color: 'text-emerald-400',
    title: 'Response Time',
    value: 'Usually within 24 hours',
    sub: null,
    note: true,
  },
];

const SUBJECTS = [
  { value: '',           label: 'Select a topic' },
  { value: 'payment',   label: '💳 Payment / Billing Issue' },
  { value: 'key',       label: '🔑 API Key Problem' },
  { value: 'refund',    label: '↩️ Refund Request' },
  { value: 'enterprise',label: '🏢 Enterprise / Bulk Plan' },
  { value: 'bug',       label: '🐛 Bug Report' },
  { value: 'other',     label: '💬 Other' },
];

const inputClass = `w-full px-3 py-2.5 rounded-lg bg-[#111] border border-white/[0.10]
  text-white placeholder-gray-600 focus:outline-none focus:border-violet-500
  transition-all text-sm`;

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success("Message sent! I'll get back to you soon.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-5 text-center">
        <motion.div
          variants={staggerContainer(0.1)} initial="hidden" animate="show"
          className="max-w-xl mx-auto"
        >
          <motion.p variants={fadeUp} className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-3">
            Get in touch
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Let's <span className="text-violet-400">talk</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 text-base leading-relaxed">
            Have a question, issue, or want to collaborate? I'm here and happy to help.
          </motion.p>
        </motion.div>
      </section>

      {/* Main grid */}
      <section className="py-8 px-5 flex-1">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.15)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Form */}
            <motion.div variants={fadeLeft}>
              <div className="bg-[#111] border border-white/[0.08] rounded-lg p-7">
                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4"
                      >
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </motion.div>
                      <h3 className="text-white text-lg font-bold mb-2">Message Received!</h3>
                      <p className="text-gray-400 text-sm mb-6 max-w-xs">
                        I'll get back to you at <strong className="text-white">{form.email}</strong> within 24 hours.
                      </p>
                      <button
                        onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                        className="px-5 py-2 border border-white/[0.12] hover:bg-white/[0.04] text-gray-300 rounded-lg text-sm transition-all"
                      >
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      <h2 className="text-lg font-bold text-white mb-5">Send a message</h2>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
                            Name <span className="text-violet-400">*</span>
                          </label>
                          <input type="text" name="name" value={form.name} onChange={handleChange}
                            placeholder="Your name" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
                            Email <span className="text-violet-400">*</span>
                          </label>
                          <input type="email" name="email" value={form.email} onChange={handleChange}
                            placeholder="you@email.com" className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">Topic</label>
                        <select name="subject" value={form.subject} onChange={handleChange}
                          className={inputClass + ' appearance-none cursor-pointer'}>
                          {SUBJECTS.map(s => (
                            <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
                          Message <span className="text-violet-400">*</span>
                        </label>
                        <textarea name="message" value={form.message} onChange={handleChange}
                          rows={5} placeholder="Describe your question or issue in detail..."
                          className={inputClass + ' resize-none'} />
                      </div>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loading
                          ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><Send className="w-4 h-4" /> Send Message</>
                        }
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Info side */}
            <motion.div variants={fadeRight} className="space-y-3">
              {CONTACT_INFO.map(info => (
                <div
                  key={info.title}
                  className="flex gap-4 p-5 rounded-lg bg-[#111] border border-white/[0.08] hover:border-white/[0.14] transition-all"
                >
                  <div className={`w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 ${info.color}`}>
                    <info.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-1 font-medium">{info.title}</p>
                    {info.href
                      ? <a href={info.href} className="text-white font-semibold hover:text-violet-300 transition-colors block text-sm">{info.value}</a>
                      : <p className="text-white font-semibold text-sm">{info.value}</p>
                    }
                    {info.sub && <p className="text-gray-500 text-sm mt-1">{info.sub}</p>}
                    {info.note && (
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                        <Heart className="w-3 h-3 text-pink-400 shrink-0" />
                        Please be patient — I am the sole developer behind this tech and work hard for you.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick FAQ box */}
              <div className="p-5 bg-[#111] border border-white/[0.08] rounded-lg">
                <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-4">Quick Answers</h3>
                <div className="space-y-4">
                  {[
                    { q: 'Payment went through but no key?', a: 'Email me with your order reference. Resolved within 2 hours.' },
                    { q: 'Eligible for a refund?', a: 'Yes — within 24 h of purchase if the key is unused.' },
                    { q: 'Need a bulk / team plan?', a: 'Email me — I offer custom plans for high-volume users.' },
                  ].map(item => (
                    <div key={item.q}>
                      <p className="text-gray-300 text-sm font-medium mb-0.5">{item.q}</p>
                      <p className="text-gray-600 text-sm">{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
