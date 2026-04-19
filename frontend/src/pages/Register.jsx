import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { fadeUp, staggerContainer } from '../lib/motion';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all text-sm';

const PERKS = [
  'Instant API key — delivered in seconds',
  'All AI models: GPT-4o, Claude, Gemini',
  'No subscriptions, pay only what you use',
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07070f] relative overflow-hidden">
      <div className="blob-1 top-[-80px] right-[-80px] opacity-40" />
      <div className="blob-3 bottom-[-100px] left-[-60px] opacity-30" />
      <div className="absolute inset-0 grid-pattern opacity-15" />

      <motion.div
        variants={staggerContainer(0.1)} initial="hidden" animate="show"
        className="relative w-full max-w-md"
      >
        {/* Brand */}
        <motion.div variants={fadeUp} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white">AIRent</span>
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
          <p className="text-gray-500 text-sm">Start renting AI in under 60 seconds</p>
        </motion.div>

        {/* Perks */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2 mb-6">
          {PERKS.map(p => (
            <div key={p} className="flex items-center gap-2.5 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              {p}
            </div>
          ))}
        </motion.div>

        {/* Card */}
        <motion.div variants={fadeUp} className="glass-card border border-white/[0.08] rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className={inputClass + ' pl-11'} placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className={inputClass + ' pl-11 pr-11'} placeholder="Min. 8 characters" required minLength={8} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass + ' pl-11'} placeholder="••••••••" required />
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-lg shadow-violet-500/25 mt-2"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><UserPlus className="w-4 h-4" /> Create Account</>
              }
            </motion.button>
          </form>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>

        <motion.p variants={fadeUp} className="text-center mt-6 text-xs text-gray-700">
          <Link to="/" className="hover:text-gray-500 transition-colors">← Back to home</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
