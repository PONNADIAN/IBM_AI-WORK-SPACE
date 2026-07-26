// pages/DashboardPage.tsx — Oxeni-style AI Platform Hub
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, FileText, Code2, BarChart3, Image, FileCheck,
  Bookmark, Bot, ArrowRight, Activity, Cpu, Zap, Globe, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const quickActions = [
  {
    title: 'AI Chat',
    desc: 'Converse with GPT-4, Claude, or Gemini in real time.',
    icon: MessageSquare, link: '/chat', color: '#00f5ff', tag: 'Most Used',
  },
  {
    title: 'Document AI',
    desc: 'Upload PDFs, Word docs and extract deep insights.',
    icon: FileText, link: '/documents', color: '#7c3aed', tag: null,
  },
  {
    title: 'Code Intelligence',
    desc: 'Debug, explain, and generate code with AI.',
    icon: Code2, link: '/code', color: '#ec4899', tag: null,
  },
  {
    title: 'Data Analyst',
    desc: 'Upload CSVs, visualize trends and get AI analysis.',
    icon: BarChart3, link: '/csv', color: '#10b981', tag: null,
  },
  {
    title: 'Vision AI',
    desc: 'Analyze and understand images with multimodal AI.',
    icon: Image, link: '/images', color: '#f59e0b', tag: null,
  },
  {
    title: 'Resume Analyzer',
    desc: 'Score and improve your resume with ATS AI.',
    icon: FileCheck, link: '/resume', color: '#06b6d4', tag: null,
  },
  {
    title: 'Prompt Library',
    desc: 'Save and reuse your best AI prompts.',
    icon: Bookmark, link: '/prompts', color: '#a78bfa', tag: null,
  },
  {
    title: 'AI Agents',
    desc: 'Autonomous agents with MCP tool integrations.',
    icon: Bot, link: '/agents', color: '#00f5ff', tag: 'NEW',
  },
];

const stats = [
  { label: 'AI Provider',  value: 'Gemini 3.5 Flash', icon: Cpu, color: '#00f5ff' },
  { label: 'Status',       value: 'Online',           icon: Activity,   color: '#10b981' },
  { label: 'Models Ready', value: '3 Active',   icon: Globe,      color: '#7c3aed' },
  { label: 'Uptime',       value: '99.9%',      icon: TrendingUp, color: '#ec4899' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex-1 overflow-y-auto relative" style={{ background: 'transparent' }}>
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.015) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 px-6 md:px-10 py-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-widest">{greeting}</p>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                {user?.full_name || user?.username || 'Explorer'} <span className="gradient-text">✦</span>
              </h1>
              <p className="text-slate-400 mt-2 text-base">Your AI command center is ready.</p>
            </div>

            <Link to="/chat" className="btn-brand text-sm py-3 px-6 flex-shrink-0">
              <Zap size={16} />
              New AI Chat
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  <p className="text-sm font-bold text-white">{s.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Bento Grid ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">AI Tools</h2>
            <span className="hex-tag hex-tag-purple">{quickActions.length} modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link to={action.link} className="group block h-full">
                  <div className="bento-card h-full relative" style={{
                    borderColor: `${action.color}15`,
                  }}>
                    {/* Glow top bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
                         style={{ background: `linear-gradient(90deg, transparent, ${action.color}, transparent)` }} />

                    {action.tag && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: `${action.color}20`, color: action.color, border: `1px solid ${action.color}40` }}>
                        {action.tag}
                      </span>
                    )}

                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                         style={{ background: `${action.color}12`, border: `1px solid ${action.color}25` }}>
                      <action.icon size={20} style={{ color: action.color }} />
                    </div>

                    <h3 className="font-bold text-white mb-1.5 text-sm">{action.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{action.desc}</p>

                    <div className="flex items-center gap-1 mt-4 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                         style={{ color: action.color }}>
                      Open <ArrowRight size={11} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bento-card"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Activity size={15} className="text-cyan-400" /> Recent Activity
              </h3>
              <Link to="/chat" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">View all</Link>
            </div>
            <div className="space-y-3">
              {[
                { icon: MessageSquare, label: 'Brainstorming SaaS product ideas', time: '2h ago', color: '#00f5ff' },
                { icon: FileText,      label: 'Q3 Financial Report.pdf analyzed', time: 'Yesterday', color: '#7c3aed' },
                { icon: Code2,         label: 'Python async code explained',       time: '2 days ago', color: '#ec4899' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
                     style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: `${item.color}12`, border: `1px solid ${item.color}25` }}>
                    <item.icon size={15} style={{ color: item.color }} />
                  </div>
                  <p className="flex-1 text-sm text-slate-300 font-medium">{item.label}</p>
                  <p className="text-xs text-slate-600 flex-shrink-0">{item.time}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro tip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bento-card relative overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: '#7c3aed' }} />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-2xl opacity-10" style={{ background: '#00f5ff' }} />
            <div className="relative z-10">
              <span className="hex-tag hex-tag-purple mb-4 inline-block">Pro Tip</span>
              <h3 className="font-bold text-white mb-3 text-base">Maximize your AI</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-5">
                Use <span className="text-cyan-400 font-semibold">AI Agents</span> with MCP tools for complex multi-step workflows. Upload entire folders to <span className="text-purple-400 font-semibold">Document AI</span> for bulk analysis.
              </p>
              <Link to="/agents" className="btn-brand text-xs py-2.5 w-full justify-center">
                Explore Agents <ArrowRight size={12} />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}
