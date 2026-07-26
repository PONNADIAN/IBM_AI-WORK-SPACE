// components/layout/Sidebar.tsx — Synaptix-style navigation sidebar
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, FileText, Code2, BarChart3, Image,
  FileCheck, Bookmark, Bot, Settings, LogOut, Sparkles, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tag: '' },
  { to: '/chat',      icon: MessageSquare,  label: 'AI Chat',     tag: 'HOT' },
  { to: '/documents', icon: FileText,       label: 'AI Analysis',   tag: '' },
  { to: '/quiz',      icon: FileCheck,      label: 'AI Quiz',   tag: 'NEW' },
  { to: '/code',      icon: Code2,          label: 'Code AI',     tag: '' },
  { to: '/csv',       icon: BarChart3,      label: 'Data Models',tag: '' },
  { to: '/images',    icon: Image,          label: 'Vision AI',   tag: '' },
  { to: '/resume',    icon: FileCheck,      label: 'Resume AI',   tag: '' },
  { to: '/prompts',   icon: Bookmark,       label: 'Prompts',     tag: '' },
  { to: '/agents',    icon: Bot,            label: 'Automation',   tag: 'NEW' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-[280px] flex flex-col relative z-10"
      style={{
        background: '#0A0514',
        borderRight: '1px solid rgba(255,255,255,0.03)',
      }}
    >
      {/* Logo */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">AI Workspace</h1>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn('sidebar-item group', isActive && 'active')}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={cn('flex-shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300')}
                />
                <span className="flex-1">{item.label}</span>
                {item.tag && (
                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                    item.tag === 'NEW' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                  )}>{item.tag}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-6 space-y-1">
        <NavLink to="/settings" className={({ isActive }) => cn('sidebar-item group', isActive && 'active')}>
          <Settings size={18} className="text-slate-400 flex-shrink-0 group-hover:text-slate-300" />
          <span>Settings</span>
        </NavLink>

        <button onClick={handleLogout} className="sidebar-item w-full text-left group">
          <LogOut size={18} className="text-slate-400 flex-shrink-0 group-hover:text-red-400 transition-colors" />
          <span className="group-hover:text-red-400 transition-colors">Sign out</span>
        </button>

        {user && (
          <div className="mt-4 px-2 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #9d4edd, #5a189a)' }}
            >
              {(user.full_name || user.username)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name || user.username}</p>
              <p className="text-xs truncate text-slate-500">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
