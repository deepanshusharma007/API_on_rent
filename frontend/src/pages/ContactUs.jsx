import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { contactAPI } from '../api/client';
import { Link } from 'react-router-dom';

const EASE = [0.22, 1, 0.36, 1];
const VP = { once: true, margin: '-60px' };
const fadeUp = (d = 0) => ({ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: d } } });
const SP = { padding: 'clamp(64px,9vw,104px) clamp(20px,5vw,72px)' };
const MAX = { maxWidth: '1120px', margin: '0 auto' };

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
  { label: 'EMAIL', value: 'deepanshu2210sharma@gmail.com', href: 'mailto:deepanshu2210sharma@gmail.com', note: 'For all queries — support, billing, and partnerships' },
  { label: 'PHONE / WHATSAPP', value: '+91 91317 70985', href: 'tel:+919131770985', note: 'Mon–Sat, 10 AM–8 PM IST' },
  { label: 'RESPONSE TIME', value: 'Within 24 hours', href: null, note: 'Solo developer — I read every message personally.' },
];

const QUICK_ANSWERS = [
  { q: 'Payment went through but no key?', a: 'Email me with your order reference — resolved within 2 hours.' },
  { q: 'Eligible for a refund?',           a: 'Yes — within 24 h of purchase if the key is unused.' },
  { q: 'Need a bulk or team plan?',        a: 'Email me directly — I offer custom pricing for high-volume users.' },
];

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6375rem',
  color: 'var(--nb-text-3)',
  letterSpacing: '0.08em',
  marginBottom: '6px',
};

export default function ContactUs() {
  const [form, setForm]       = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

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
      toast.error(err?.response?.data?.detail || 'Failed to send. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nb-bg)' }}>
      <Helmet>
        <title>Contact — AIRent | Get in Touch</title>
        <meta name="description" content="Contact AIRent for support, refund requests, or general questions. We respond within 24 hours." />
        <link rel="canonical" href="https://airent.dev/contact" />
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
              GET IN TOUCH
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp(0.06)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.8rem,7vw,5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--nb-text)', lineHeight: 0.98, marginBottom: '28px' }}
          >
            Let's talk.
          </motion.h1>
          <motion.p
            variants={fadeUp(0.12)} initial="hidden" animate="show"
            style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.75, color: 'var(--nb-text-2)', maxWidth: '44ch' }}
          >
            Have a question, issue, or want to collaborate? I'm here and happy to help.
          </motion.p>
        </div>
      </section>

      {/* ── Contact info rows ── */}
      <section style={{ borderBottom: '1px solid var(--nb-border)', background: 'var(--nb-surface)', ...SP }}>
        <div style={{ ...MAX }}>
          {CONTACT_ROWS.map((row, i) => (
            <motion.div
              key={row.label}
              variants={fadeUp(0)}
              initial="hidden"
              whileInView="show"
              viewport={VP}
              style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: '24px 48px', alignItems: 'start', padding: '24px 0', borderTop: '1px solid var(--nb-border)' }}
              className="contact-row"
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', paddingTop: '3px' }}>{row.label}</span>
              {row.href ? (
                <a href={row.href} style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--nb-text)', textDecoration: 'none', letterSpacing: '-0.01em', transition: 'color 120ms' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-green)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text)'}
                >{row.value}</a>
              ) : (
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--nb-text)', letterSpacing: '-0.01em' }}>{row.value}</span>
              )}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--nb-text-2)' }}>{row.note}</p>
            </motion.div>
          ))}
          <div style={{ borderTop: '1px solid var(--nb-border)' }} />
        </div>
      </section>

      {/* ── Form + quick answers ── */}
      <section style={{ flex: 1, ...SP }}>
        <div style={{ ...MAX, display: 'grid', gridTemplateColumns: '1fr 400px', gap: '64px', alignItems: 'start' }} className="contact-grid">

          {/* Form */}
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ padding: '48px 0' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: 'var(--nb-green-bg)', border: '1px solid var(--nb-green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--nb-green)' }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--nb-text)', letterSpacing: '-0.02em' }}>Message received</h3>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--nb-text-2)', lineHeight: 1.7, marginBottom: '28px', maxWidth: '42ch' }}>
                    I'll reply to <strong style={{ color: 'var(--nb-text)' }}>{form.email}</strong> within 24 hours.
                  </p>
                  <button
                    onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className="btn btn-secondary" style={{ fontSize: '0.8375rem' }}
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '28px' }}>SEND A MESSAGE</span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={labelStyle}>NAME *</label>
                      <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="field" style={{ borderRadius: '4px' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>EMAIL *</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@email.com" className="field" style={{ borderRadius: '4px' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>TOPIC</label>
                    <select name="subject" value={form.subject} onChange={handleChange} className="field" style={{ appearance: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      {SUBJECTS.map(s => <option key={s.value} value={s.value} style={{ background: 'var(--nb-raised)' }}>{s.label}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>MESSAGE *</label>
                    <textarea name="message" value={form.message} onChange={handleChange} rows={6} placeholder="Describe your question or issue..." className="field" style={{ resize: 'none', borderRadius: '4px' }} />
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '11px 28px', fontSize: '0.875rem' }}>
                    {loading
                      ? <span style={{ width: '14px', height: '14px', border: '2px solid rgba(2,44,34,0.3)', borderTopColor: '#02180e', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      : <><Send size={13} /> Send message</>
                    }
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick answers */}
          <motion.div variants={fadeUp(0)} initial="hidden" whileInView="show" viewport={VP}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--nb-text-3)', letterSpacing: '0.1em', display: 'block', marginBottom: '20px' }}>QUICK ANSWERS</span>
            <div>
              {QUICK_ANSWERS.map((item, i) => (
                <div key={item.q} style={{ padding: '18px 0', borderTop: '1px solid var(--nb-border)' }}>
                  <p style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--nb-text)', letterSpacing: '-0.01em', marginBottom: '6px' }}>{item.q}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8375rem', lineHeight: 1.65, color: 'var(--nb-text-2)' }}>{item.a}</p>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--nb-border)' }} />
            </div>

            <div style={{ marginTop: '32px', padding: '20px', border: '1px solid var(--nb-border)', borderRadius: '4px', background: 'var(--nb-surface)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6375rem', color: 'var(--nb-text-3)', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>LINKS</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'View full FAQ', to: '/faq' },
                  { label: 'Refund Policy', to: '/refund-policy' },
                  { label: 'Privacy Policy', to: '/privacy-policy' },
                ].map(link => (
                  <Link key={link.to} to={link.to} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-body)', fontSize: '0.8375rem', color: 'var(--nb-text-3)', textDecoration: 'none', transition: 'color 120ms' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--nb-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--nb-text-3)'}
                  >
                    {link.label} <ArrowRight size={12} />
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .contact-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .contact-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
