import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Clock, Send, CheckCircle2, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, viewport } from '../lib/motion';
import { contactAPI } from '../api/client';

const CONTACT_INFO = [
  {
    icon: Mail, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',
    title: 'Email',
    value: 'deepanshu2210sharma@gmail.com',
    sub: 'For all queries — support, billing, and partnerships',
    href: 'mailto:deepanshu2210sharma@gmail.com',
  },
  {
    icon: MessageSquare, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',
    title: 'Phone / WhatsApp',
    value: '+91 91317 70985',
    sub: 'Mon – Sat, 10 AM – 8 PM IST',
    href: 'tel:+919131770985',
  },
  {
    icon: Clock, color: '#34d399', bg: 'rgba(52,211,153,0.1)',
    title: 'Response Time',
    value: 'Usually within 24 hours',
    sub: null, note: true,
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

export default function ContactUs() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      await contactAPI.submit(form.name, form.email, form.subject, form.message);
      setSent(true);
      toast.success("Message sent! We'll get back to you soon.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-16 px-5 text-center mesh-hero">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" animate="show" className="max-w-xl mx-auto">
          <motion.div variants={fadeUp} className="mb-5 flex justify-center">
            <span className="label-pill">Get in touch</span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-[clamp(2.2rem,5vw,3.5rem)] font-black text-[#f0eefa] mb-4 leading-tight tracking-tight">
            Let's <span className="gradient-text">talk</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#8e8ca4] text-base leading-relaxed">
            Have a question, issue, or want to collaborate? I'm here and happy to help.
          </motion.p>
        </motion.div>
      </section>

      {/* Main grid */}
      <section className="py-12 px-5 flex-1">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer(0.12)} initial="hidden" whileInView="show" viewport={viewport}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Form */}
            <motion.div variants={fadeLeft}>
              <div
                className="rounded-2xl p-7"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              >
                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-14 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <h3 className="text-[#f0eefa] text-lg font-bold mb-2">Message received!</h3>
                      <p className="text-[#8e8ca4] text-sm mb-7 max-w-xs leading-relaxed">
                        I'll reply to <strong className="text-[#f0eefa]">{form.email}</strong> within 24 hours.
                      </p>
                      <button
                        onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                        className="px-5 py-2.5 text-[#8e8ca4] hover:text-[#f0eefa] text-sm rounded-xl transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                      >
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onSubmit={handleSubmit} className="space-y-4"
                    >
                      <h2 className="text-base font-bold text-[#f0eefa] mb-6">Send a message</h2>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#8e8ca4] mb-2">
                            Name <span className="text-violet-400">*</span>
                          </label>
                          <input type="text" name="name" value={form.name} onChange={handleChange}
                            placeholder="Your name" className="field" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#8e8ca4] mb-2">
                            Email <span className="text-violet-400">*</span>
                          </label>
                          <input type="email" name="email" value={form.email} onChange={handleChange}
                            placeholder="you@email.com" className="field" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8e8ca4] mb-2">Topic</label>
                        <select name="subject" value={form.subject} onChange={handleChange}
                          className="field appearance-none cursor-pointer">
                          {SUBJECTS.map(s => (
                            <option key={s.value} value={s.value} style={{ background: 'var(--bg-base)' }}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8e8ca4] mb-2">
                          Message <span className="text-violet-400">*</span>
                        </label>
                        <textarea name="message" value={form.message} onChange={handleChange}
                          rows={5} placeholder="Describe your question or issue..."
                          className="field resize-none" />
                      </div>
                      <motion.button
                        type="submit" disabled={loading}
                        whileHover={{ scale: 1.01, boxShadow: '0 0 28px rgba(124,58,237,0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.22)' }}
                      >
                        {loading
                          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><Send className="w-4 h-4" /> Send Message</>}
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
                  className="flex gap-4 p-5 rounded-2xl transition-all duration-200"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: info.bg }}>
                    <info.icon className="w-4 h-4" style={{ color: info.color }} />
                  </div>
                  <div>
                    <p className="text-[#52505f] text-xs uppercase tracking-widest mb-1 font-medium">{info.title}</p>
                    {info.href
                      ? <a href={info.href} className="text-[#f0eefa] font-semibold hover:text-violet-300 transition-colors block text-sm">{info.value}</a>
                      : <p className="text-[#f0eefa] font-semibold text-sm">{info.value}</p>
                    }
                    {info.sub && <p className="text-[#52505f] text-xs mt-1">{info.sub}</p>}
                    {info.note && (
                      <p className="text-[#52505f] text-xs mt-1.5 flex items-center gap-1.5">
                        <Heart className="w-3 h-3 text-pink-400 shrink-0" />
                        I'm the sole developer here — I work hard for you, please be patient.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick FAQ */}
              <div
                className="p-5 rounded-2xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h3 className="text-[#f0eefa] font-semibold text-sm mb-5">Quick answers</h3>
                <div className="space-y-4">
                  {[
                    { q: 'Payment went through but no key?', a: 'Email me with your order reference — resolved within 2 hours.' },
                    { q: 'Eligible for a refund?',           a: 'Yes — within 24 h of purchase if the key is unused.' },
                    { q: 'Need a bulk / team plan?',         a: 'Email me — I offer custom pricing for high-volume users.' },
                  ].map(item => (
                    <div key={item.q}>
                      <p className="text-[#8e8ca4] text-sm font-medium mb-0.5">{item.q}</p>
                      <p className="text-[#52505f] text-xs leading-relaxed">{item.a}</p>
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
