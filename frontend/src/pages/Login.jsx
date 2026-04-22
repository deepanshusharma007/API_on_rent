import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { fadeUp, staggerContainer } from '../lib/motion';

const inputClass =
  'w-full px-4 py-3 rounded-lg bg-[#111] border border-white/[0.10] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all text-sm';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Show notice if user was auto-logged out due to session conflict
  useEffect(() => {
    const notice = sessionStorage.getItem('auth_notice');
    if (notice) {
      sessionStorage.removeItem('auth_notice');
      toast.error(notice, { duration: 6000 });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/marketplace');
    } else {
      toast.error(result.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <motion.div
        variants={staggerContainer(0.1)} initial="hidden" animate="show"
        className="w-full max-w-md"
      >
        {/* Brand */}
        <motion.div variants={fadeUp} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AIRent</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to access your AI API rentals</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={fadeUp} className="bg-[#111] border border-white/[0.08] rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass + ' pl-11'}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass + ' pl-11 pr-11'}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2.5 mt-2"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><LogIn className="w-4 h-4" /> Sign In</>
              }
            </motion.button>
          </form>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>

        {/* Back to home */}
        <motion.p variants={fadeUp} className="text-center mt-6 text-xs text-gray-700">
          <Link to="/" className="hover:text-gray-500 transition-colors">← Back to home</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
