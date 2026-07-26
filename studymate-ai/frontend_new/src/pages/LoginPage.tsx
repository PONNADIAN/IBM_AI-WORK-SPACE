// pages/LoginPage.tsx — Premium enterprise login (Synaptix Style)
import { useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const Animated3DBackground = lazy(() => import('@/components/ui/Animated3DBackground'));

const FEATURE_CHIPS = ['GPT-4o', 'Claude', 'Gemini', 'MCP', 'RAG', 'Agents', 'Vector DB'];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const data = res.data;
      setAuth({
        user: { id: data.user_id, email: data.email, username: data.username, full_name: data.full_name, is_active: true, created_at: new Date().toISOString() },
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#0A0514]">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <Animated3DBackground />
      </Suspense>

      {/* Radial vignette overlay for depth over the background image */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(5,2,10,0.95) 100%)' }} />

      {/* Left: Branding panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-24 flex-1 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="mb-14">
            <div className="mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22H22L12 2Z" fill="url(#paint0_linear)"/>
                <path d="M12 2L2 22H12V2Z" fill="url(#paint1_linear)"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#E0AAFF"/>
                    <stop offset="1" stopColor="#7C3AED"/>
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="7" y1="2" x2="7" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF007A"/>
                    <stop offset="1" stopColor="#7C3AED" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Welcome to AI Workspace</h1>
            <p className="text-slate-400 text-lg">Limitless AI capabilities in one unified workspace.</p>
          </div>

          {/* Feature chips — glass pills */}
          <div className="flex flex-wrap gap-2">
            {FEATURE_CHIPS.map((chip, i) => (
              <motion.span
                key={chip}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-purple-200 transition-all duration-200 hover:-translate-y-0.5 cursor-default"
                style={{
                  background: 'rgba(157,78,221,0.1)',
                  border: '1px solid rgba(157,78,221,0.2)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {chip}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Login form */}
      <div className="flex items-center justify-center p-6 lg:p-12 w-full lg:w-[500px] flex-shrink-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px]"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2Z" fill="url(#paint0_linear)"/>
              <path d="M12 2L2 22H12V2Z" fill="url(#paint1_linear)"/>
            </svg>
            <span className="font-bold text-white text-xl">AI Workspace</span>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '1.5rem',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset',
            padding: '2.25rem',
          }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Sign in</h2>
              <p className="text-slate-400 text-sm">Welcome back to your workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                         placeholder="you@example.com" className="input-field pl-9" autoComplete="email" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                         placeholder="••••••••" className="input-field pl-9 pr-10" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 mt-2 rounded-lg font-semibold text-white text-sm transition-all"
                      style={{ background: 'linear-gradient(90deg, #6D28D9, #7C3AED)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Signing in...</span>
                  : <span className="flex items-center justify-center gap-2">Continue <ArrowRight size={16} /></span>
                }
              </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-6">
              No account?{' '}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
