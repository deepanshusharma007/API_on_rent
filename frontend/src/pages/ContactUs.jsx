import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Clock, Send, CheckCircle2, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { fadeUp, fadeLeft, fadeRight, staggerContainer, viewport } from '../lib/motion';
import { contactAPI } from '../api/client';

const CONTACT_INFO = [
  {
    icon: Mail, title: 'Email',
    value: 'deepanshu2210sharma@gmail.com',
    sub: 'For all queries — support, billing, and partnerships',
    href: 'mailto:deepanshu2210sharma@gmail.com',
  },
  {
    icon: MessageSquare, title: 'Phone / WhatsApp',
    value: '+91 91317 70985',
    sub: 'Mon – Sat, 10 AM – 8 PM IST',
    href: 'tel:+919131770985',
  },
  {
    icon: Clock, title: 'Response Time',
    value: 'Usually within 24 hours',
    sub: null, note: true,
  },
];

const SUBJECTS = [
  { value: '',           label: 'Select a topic' },
  { value: 'payment',   label: 'Payment / Billing Issue' },
  { value: 'key',       label: 'API Key Problem' },
  { value: 'refund',    label: 'Refund Request' },
  { value: 'enterprise',label: 'Enterprise / Bulk Plan' },
  { value: 'bug',       label: 'Bug Report' },
  { value: 'other',     label: 'Other' },
];

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <Helmet>
        <title>Contact — AIRent | Get in Touch</title>
        <meta name="description" content="Contact AIRent for support, refund requests, or general questions. We respond within 2 business hours Mon–Sat." />
        <link rel="canonical" href="https://airent.dev/contact" />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '56px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div className="max-w-2xl mx-auto">
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="eyebrow mb-5">Get in touch</motion.p>
            <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.1, marginBottom: '16px' }}>
              Let's talk.
            </motion.h1>
            <motion.p variants={fadeUp} className="prose-width" style={{ color: 'var(--c-text-2)', fontSize: '1rem', lineHeight: 1.7 }}>
              Have a question, issue, or want to collaborate? I'm here and happy to help.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main grid */}
      <section style={{ padding: '0 20px 96px', flex: 1 }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="show" viewport={viewport} className="grid md:grid-cols-2 gap-10">

            {/* Form */}
            <motion.div variants={fadeLeft}>
              <div className="card" style={{ padding: '28px' }}>
                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}
                    >
                      <CheckCircle2 size={40} style={{ color: 'var(--c-accent)', marginBottom: '16px' }} />
                      <h3 style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Message received!</h3>
                      <p style={{ color: 'var(--c-text-3)', fontSize: '0.875rem', marginBottom: '24px', maxWidth: '260px', lineHeight: 1.6 }}>
                        I'll reply to <strong style={{ color: 'var(--c-text-2)' }}>{form.email}</strong> within 24 hours.
                      </p>
                      <button
                        onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                        className="btn btn-secondary" style={{ fontSize: '0.825rem' }}
                      >
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit}>
                      <h2 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '20px' }}>Send a message</h2>

                      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '0.78rem', fontWeight: 500, marginBottom: '6px' }}>
                            Name <span style={{ color: 'var(--c-accent)' }}>*</span>
                          </label>
                          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="field" />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '0.78rem', fontWeight: 500, marginBottom: '6px' }}>
                            Email <span style={{ color: 'var(--c-accent)' }}>*</span>
                          </label>
                          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@email.com" className="field" />
                        </div>
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '0.78rem', fontWeight: 500, marginBottom: '6px' }}>Topic</label>
                        <select name="subject" value={form.subject} onChange={handleChange} className="field" style={{ appearance: 'none', cursor: 'pointer' }}>
                          {SUBJECTS.map(s => <option key={s.value} value={s.value} style={{ background: 'var(--c-raised)' }}>{s.label}</option>)}
                        </select>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: 'var(--c-text-2)', fontSize: '0.78rem', fontWeight: 500, marginBottom: '6px' }}>
                          Message <span style={{ color: 'var(--c-accent)' }}>*</span>
                        </label>
                        <textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Describe your question or issue..." className="field" style={{ resize: 'none' }} />
                      </div>

                      <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                        {loading
                          ? <span style={{ width: '16px', height: '16px', border: '2px solid rgba(2,44,34,0.3)', borderTopColor: '#022c22', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                          : <><Send size={14} /> Send Message</>
                        }
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Info side — list, not cards */}
            <motion.div variants={fadeRight} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Contact items */}
              {CONTACT_INFO.map((info, i) => (
                <div
                  key={info.title}
                  style={{
                    padding: '20px 0',
                    borderBottom: i < CONTACT_INFO.length - 1 ? '1px solid var(--c-border)' : 'none',
                    display: 'flex', gap: '14px', alignItems: 'flex-start',
                  }}
                >
                  <info.icon size={16} style={{ color: 'var(--c-accent)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>{info.title}</p>
                    {info.href
                      ? <a href={info.href} style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', display: 'block', transition: 'color 150ms' }}
                          onMouseEnter={e => e.target.style.color = 'var(--c-accent)'}
                          onMouseLeave={e => e.target.style.color = 'var(--c-text)'}
                        >{info.value}</a>
                      : <p style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem' }}>{info.value}</p>
                    }
                    {info.sub && <p style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', marginTop: '3px' }}>{info.sub}</p>}
                    {info.note && (
                      <p style={{ color: 'var(--c-text-3)', fontSize: '0.775rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Heart size={12} style={{ color: '#f472b6', flexShrink: 0 }} />
                        I'm the sole developer here — please be patient.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick FAQ */}
              <div style={{ marginTop: '32px', paddingTop: '28px', borderTop: '1px solid var(--c-border)' }}>
                <h3 style={{ color: 'var(--c-text)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '20px' }}>Quick answers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {[
                    { q: 'Payment went through but no key?', a: 'Email me with your order reference — resolved within 2 hours.' },
                    { q: 'Eligible for a refund?',           a: 'Yes — within 24 h of purchase if the key is unused.' },
                    { q: 'Need a bulk or team plan?',        a: 'Email me — I offer custom pricing for high-volume users.' },
                  ].map(item => (
                    <div key={item.q}>
                      <p style={{ color: 'var(--c-text-2)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '3px' }}>{item.q}</p>
                      <p style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', lineHeight: 1.6 }}>{item.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
