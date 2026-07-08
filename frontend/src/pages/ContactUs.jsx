import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Send, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { contactAPI } from '../api/client';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-40px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: d } } });

const INPUT_STYLE = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#e8edf8', boxSizing: 'border-box', transition: 'border-color 150ms' };

const SUBJECTS = [
  { value: '',            label: 'Select a topic' },
  { value: 'payment',    label: 'Payment / Billing Issue' },
  { value: 'key',        label: 'API Key Problem' },
  { value: 'refund',     label: 'Refund Request' },
  { value: 'enterprise', label: 'Enterprise / Bulk Plan' },
  { value: 'bug',        label: 'Bug Report' },
  { value: 'other',      label: 'Other' },
];

const CONTACT_ROWS = [
  { icon: Mail,  label: 'EMAIL',              value: 'deepanshu2210sharma@gmail.com', href: 'mailto:deepanshu2210sharma@gmail.com', note: 'For all queries — support, billing, and partnerships' },
  { icon: Phone, label: 'PHONE / WHATSAPP',   value: '+91 91317 70985',               href: 'tel:+919131770985',                   note: 'Mon–Sat, 10 AM–8 PM IST' },
  { icon: Clock, label: 'RESPONSE TIME',      value: 'Within 24 hours',               href: null,                                  note: 'Solo developer — every message read personally.' },
];

const QUICK_ANSWERS = [
  { q: 'Payment went through but no key?', a: 'Email me with your order reference — resolved within 2 hours.' },
  { q: 'Eligible for a refund?',           a: 'Yes — within 24 hours of purchase if the key is unused.' },
  { q: 'Need a bulk or team plan?',        a: 'Email me directly — custom pricing for high-volume users.' },
];

export default function ContactUs() {
  const [form, setForm]       = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const focus  = e => e.target.style.borderColor = 'rgba(192,193,255,0.35)';
  const blur   = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields.'); return;
    }
    setLoading(true);
    try {
      await contactAPI.submit(form.name, form.email, form.subject, form.message);
      setSent(true);
      toast.success("Message sent! We'll get back to you soon.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send. Please email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
      <Helmet>
        <title>Contact — AIRent | Get in Touch</title>
        <meta name="description" content="Contact AIRent for support, refund requests, or general questions. We respond within 24 hours." />
      </Helmet>
      <Navbar />

      <main style={{ flex: 1, paddingTop: '60px' }}>

        {/* Hero */}
        <section style={{ padding: 'clamp(64px,9vw,96px) clamp(20px,5vw,56px) clamp(40px,5vw,56px)', background: '#0d1017' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <motion.div initial="hidden" animate="show" variants={fadeUp(0)}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(192,193,255,0.2)', background: 'rgba(192,193,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '24px' }}>
                GET IN TOUCH
              </div>
            </motion.div>
            <motion.h1 initial="hidden" animate="show" variants={fadeUp(0.06)} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', color: '#e8edf8', marginBottom: '16px' }}>
              Let's talk.
            </motion.h1>
            <motion.p initial="hidden" animate="show" variants={fadeUp(0.12)} style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', color: 'var(--on-surface-2)', lineHeight: 1.7 }}>
              Have a question, issue, or want to collaborate? I'm here and happy to help.
            </motion.p>
          </div>
        </section>

        {/* Contact info */}
        <section style={{ padding: 'clamp(32px,4vw,48px) clamp(20px,5vw,56px)', background: '#0a0d14', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {CONTACT_ROWS.map((row, i) => {
              const Icon = row.icon;
              return (
                <motion.div key={row.label} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(i * 0.06)}
                  style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', gap: '16px 32px', alignItems: 'center', padding: '20px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                  className="contact-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(192,193,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color="var(--primary)" />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)' }}>{row.label}</span>
                  </div>
                  {row.href ? (
                    <a href={row.href} style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: '#e8edf8', textDecoration: 'none', transition: 'color 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = '#e8edf8'}
                    >{row.value}</a>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: '#e8edf8' }}>{row.value}</span>
                  )}
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--on-surface-3)', lineHeight: 1.6 }}>{row.note}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Form + Quick answers */}
        <section style={{ padding: 'clamp(48px,6vw,80px) clamp(20px,5vw,56px) clamp(64px,8vw,96px)', background: '#0a0d14' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '56px', alignItems: 'start' }} className="contact-grid">

            {/* Form */}
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0)}>
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '48px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(78,222,163,0.1)', border: '1px solid rgba(78,222,163,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={16} color="var(--secondary)" />
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: '#e8edf8', letterSpacing: '-0.02em' }}>Message received</h3>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--on-surface-2)', lineHeight: 1.7, marginBottom: '24px' }}>
                      I'll reply to <strong style={{ color: '#e8edf8' }}>{form.email}</strong> within 24 hours.
                    </p>
                    <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-2)', transition: 'border-color 120ms, color 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#e8edf8'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--on-surface-2)'; }}
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '24px' }}>SEND A MESSAGE</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }} className="form-row">
                      <div>
                        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '7px' }}>NAME *</label>
                        <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '7px' }}>EMAIL *</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@email.com" style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '7px' }}>TOPIC</label>
                      <select name="subject" value={form.subject} onChange={handleChange} style={{ ...INPUT_STYLE, appearance: 'none', cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
                        {SUBJECTS.map(s => <option key={s.value} value={s.value} style={{ background: '#111520' }}>{s.label}</option>)}
                      </select>
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                      <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '7px' }}>MESSAGE *</label>
                      <textarea name="message" value={form.message} onChange={handleChange} rows={6} placeholder="Describe your question or issue..." style={{ ...INPUT_STYLE, resize: 'none' }} onFocus={focus} onBlur={blur} />
                    </div>

                    <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, background: 'linear-gradient(135deg, #8083ff 0%, #c0c1ff 100%)', color: '#0b0066', boxShadow: '0 4px 20px -4px rgba(128,131,255,0.4)', opacity: loading ? 0.7 : 1, transition: 'filter 120ms' }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.08)'; }}
                      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                    >
                      {loading ? (
                        <span style={{ width: '14px', height: '14px', border: '2px solid rgba(11,0,102,0.3)', borderTopColor: '#0b0066', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      ) : <><Send size={14} /> Send message</>}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Quick answers + links */}
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp(0.08)}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--on-surface-3)', marginBottom: '16px' }}>QUICK ANSWERS</div>
              <div>
                {QUICK_ANSWERS.map((item, i) => (
                  <div key={item.q} style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: '#e8edf8', letterSpacing: '-0.01em', marginBottom: '6px' }}>{item.q}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8375rem', lineHeight: 1.65, color: 'var(--on-surface-2)' }}>{item.a}</p>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              </div>

              <div style={{ marginTop: '28px', padding: '20px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', background: '#111520' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--on-surface-3)', marginBottom: '12px' }}>HELPFUL LINKS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'View full FAQ',  to: '/faq' },
                    { label: 'Refund Policy',  to: '/refund-policy' },
                    { label: 'Privacy Policy', to: '/privacy-policy' },
                  ].map(link => (
                    <Link key={link.to} to={link.to} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface-3)', textDecoration: 'none', transition: 'color 120ms' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e8edf8'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--on-surface-3)'}
                    >
                      {link.label} <ArrowRight size={12} />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </section>
      </main>

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .contact-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .contact-row { grid-template-columns: 1fr !important; } .form-row { grid-template-columns: 1fr !important; } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.18); }
        select option { background: #111520; }
      `}</style>
    </div>
  );
}
