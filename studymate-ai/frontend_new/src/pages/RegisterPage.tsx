// pages/RegisterPage.tsx — Premium register with Aurora background
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Zap, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import AuroraBackground from '@/components/ui/AuroraBackground';

const PERKS = [
  'Unlimited AI conversations',
  'PDF & document analysis',
  'Isolated secure workspace',
  'MCP agent integrations',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) {
      toast.error('Please fill all required fields'); return;
    }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const data = res.data;
      setAuth({
        user: { id: data.user_id, email: data.email, username: data.username, full_name: data.full_name, is_active: true, created_at: new Date().toISOString() },
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      toast.success('Account created! Welcome aboard 🚀');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#03010f' }}>
      <AuroraBackground />
      <div className="absolute inset-0 z-[1] pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(3,1,15,0.6) 100%)' }} />

      {/* Left: Perks */}
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-24 flex-1 relative z-10">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #00f5ff, #7c3aed)', boxShadow: '0 0 30px rgba(0,245,255,0.2)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">StudyMate AI</span>
          </div>

          <span className="hex-tag hex-tag-green mb-5 inline-block">Free Forever</span>
          <h1 className="text-5xl xl:text-6xl font-bold leading-[1.1] text-white mb-6 tracking-tight">
            Start learning<br />
            <span className="gradient-text">with AI today.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm mb-10">
            Join a growing community of students and lifelong learners using StudyMate AI.
          </p>

          <ul className="space-y-3">
            {PERKS.map((perk, i) => (
              <motion.li
                key={perk}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-300 text-sm"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <Check size={11} className="text-emerald-400" />
                </div>
                {perk}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 w-full lg:w-[520px] flex-shrink-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="w-full max-w-[400px]"
        >
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #00f5ff, #7c3aed)' }}>
              <Zap size={17} className="text-white" />
            </div>
            <span className="font-bold text-white">StudyMate AI</span>
          </div>

          <div style={{
            background: 'rgba(7, 5, 26, 0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.5rem',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
            padding: '2.25rem',
          }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Create account</h2>
              <p className="text-slate-500 text-sm">Free, no credit card required</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input type="text" value={form.full_name} onChange={set('full_name')}
                           placeholder="John Doe" className="input-field pl-8 text-sm py-2.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Username *</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input type="text" value={form.username} onChange={set('username')}
                           placeholder="johndoe" className="input-field pl-8 text-sm py-2.5" required />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Email *</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="email" value={form.email} onChange={set('email')}
                         placeholder="you@example.com" className="input-field pl-8" required />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Password *</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                         placeholder="Min. 6 characters" className="input-field pl-8 pr-9" required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-brand w-full justify-center py-3 text-sm mt-1">
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Creating account...</>
                  : <>Create free account <ArrowRight size={13} /></>
                }
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Sign in</Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-5">
            By continuing, you agree to our Terms of Service.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
