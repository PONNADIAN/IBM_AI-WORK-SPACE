// pages/SettingsPage.tsx — User settings

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Key, Shield, Palette, Info, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ full_name: user?.full_name || '', username: user?.username || '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.me(); // verify token
      // In real app: call PUT /auth/me
      updateUser(form);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { icon: User, title: 'Profile', id: 'profile' },
    { icon: Key, title: 'API Keys', id: 'api' },
    { icon: Shield, title: 'Security', id: 'security' },
    { icon: Info, title: 'About', id: 'about' },
  ];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Settings sidebar */}
      <div className="w-56 border-r border-white/5 p-3 space-y-1">
        {sections.map(({ icon: Icon, title, id }) => (
          <a key={id} href={`#${id}`} className="sidebar-item">
            <Icon size={16} className="text-slate-500" />
            {title}
          </a>
        ))}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your account and preferences</p>
          </div>

          {/* Profile */}
          <section id="profile" className="glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <User size={18} className="text-brand-400" /> Profile
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #444ce7, #6172f3)' }}
                >
                  {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{user?.full_name || user?.username}</p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="input-field" placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="input-field" placeholder="username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input value={user?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
              </div>
              <button onClick={saveProfile} disabled={saving} className="btn-brand">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save Changes</>}
              </button>
            </div>
          </section>

          {/* API Keys */}
          <section id="api" className="glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <Key size={18} className="text-brand-400" /> AI Provider
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
                <p className="text-sm text-slate-300">
                  API keys are configured in your <code className="text-brand-400">.env</code> file on the server side.
                  Never expose API keys in the frontend!
                </p>
              </div>
              {[
                { label: 'AI Provider', value: 'Configured in .env → AI_PROVIDER', hint: 'openai | anthropic | gemini' },
                { label: 'AI Model', value: 'Configured in .env → AI_MODEL', hint: 'gpt-4o-mini | claude-3-5-haiku | gemini-3.5-flash' },
                { label: 'OpenAI Key', value: 'Set OPENAI_API_KEY in .env', hint: 'sk-...' },
              ].map(({ label, value, hint }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
                  <input value={value} disabled className="input-field opacity-60 cursor-not-allowed text-sm font-mono" />
                  <p className="text-xs text-slate-600 mt-1">{hint}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Security */}
          <section id="security" className="glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <Shield size={18} className="text-brand-400" /> Security
            </h2>
            <div className="space-y-3">
              {[
                { label: 'JWT Auth', status: 'Enabled', color: 'text-green-400' },
                { label: 'Refresh Tokens', status: 'Enabled', color: 'text-green-400' },
                { label: 'Password Hashing', status: 'bcrypt', color: 'text-green-400' },
                { label: 'CORS', status: 'Configured', color: 'text-green-400' },
                { label: 'Rate Limiting', status: '60 req/min', color: 'text-yellow-400' },
                { label: 'HTTPS', status: 'Via AWS App Runner', color: 'text-blue-400' },
              ].map(({ label, status, color }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-white/2">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className={`text-sm font-medium ${color}`}>{status}</span>
                </div>
              ))}
            </div>
          </section>

          {/* About */}
          <section id="about" className="glass rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <Info size={18} className="text-brand-400" /> About
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['App', 'AI Workspace'],
                ['Version', '1.0.0'],
                ['Frontend', 'React 19 + Vite + TypeScript'],
                ['Backend', 'Python FastAPI'],
                ['Database', 'SQLite (demo)'],
                ['AI', 'OpenAI / Anthropic / Gemini'],
                ['Built for', 'IBM Internship 2026'],
                ['Author', user?.username || 'Student'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">{label}</p>
                  <p className="text-white font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
