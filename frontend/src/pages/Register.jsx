import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { fadeUp, staggerContainer } from '../lib/motion';

const PERKS = [
  'Instant API key — delivered in seconds',
  'GPT-4o, Claude 3.5, Gemini — all models',
  'No subscriptions, pay per rental',
];

export default function Register() {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore(s => s.register);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8)          { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    const result = await register(email, password);
    if (result.success) {
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } else {
      toast.error(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 70%), var(--bg-base)' }}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <motion.div
        variants={staggerContainer(0.08)} initial="hidden" animate="show"
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
            <img
              src="/logo.png" alt="AIRent"
              className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(250,180,0,0.5)] group-hover:drop-shadow-[0_0_14px_rgba(250,180,0,0.7)] transition-all"
            />
            <span className="text-[#f0eefa] font-bold text-lg tracking-tight">AI<span className="text-violet-400">Rent</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-[#f0eefa] mb-1.5 tracking-tight">Create your account</h1>
          <p className="text-[#52505f] text-sm">Start renting AI in under 60 seconds</p>
        </motion.div>

        {/* Perks */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2 mb-6">
          {PERKS.map(p => (
            <div key={p} className="flex items-center gap-2.5 text-sm text-[#52505f]">
              <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
              {p}
            </div>
          ))}
        </motion.div>

        {/* Card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-7"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8e8ca4] mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52505f] pointer-events-none" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required className="field pl-10" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8e8ca4] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52505f] pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" required minLength={8} className="field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#52505f] hover:text-[#8e8ca4] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8e8ca4] mb-2">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52505f] pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" required className="field pl-10" />
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01, boxShadow: '0 0 28px rgba(124,58,237,0.4)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.22)' }}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><UserPlus className="w-4 h-4" /><span>Create account</span></>}
            </motion.button>
          </form>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-center text-[#52505f] text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        <motion.p variants={fadeUp} className="text-center mt-5 text-xs text-[#2e2c3a]">
          <Link to="/" className="hover:text-[#52505f] transition-colors">← Back to home</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
