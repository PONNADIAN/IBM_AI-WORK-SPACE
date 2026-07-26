// pages/AgentsPage.tsx — AI Agents + Per-user MCP Connections Hub
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Play, Loader2, CheckCircle2, XCircle, Clock, RefreshCw,
  GitBranch, FolderOpen, Globe, Database, MessageSquare, BookOpen,
  HardDrive, Wifi, WifiOff, AlertTriangle, Plus, Trash2, X,
  Sparkles, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// ── Types ────────────────────────────────────────────────────────────────────
interface MCPConnection {
  id: string | null;
  provider: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error' | 'loading';
  last_sync: string | null;
  expires_at: string | null;
  meta: { name: string; icon: string; description: string; auth_type: string };
  pg_host?: string;
  pg_port?: string | number;
  pg_database?: string;
  pg_username?: string;
  pg_ssl?: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  system_prompt: string;
}

// ── MCP Provider Icons ────────────────────────────────────────────────────────
function ProviderIcon({ provider, size = 20 }: { provider: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    github:     <GitBranch size={size} />,
    gdrive:     <HardDrive size={size} />,
    slack:      <MessageSquare size={size} />,
    notion:     <BookOpen size={size} />,
    postgres:   <Database size={size} />,
    filesystem: <FolderOpen size={size} />,
    browser:    <Globe size={size} />,
  };
  return <>{icons[provider] || <Bot size={size} />}</>;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Connected
    </span>
  );
  if (status === 'expired') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
      <AlertTriangle size={10} />
      Expired
    </span>
  );
  if (status === 'loading') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)', color: '#00f5ff' }}>
      <Loader2 size={10} className="animate-spin" />
      Connecting
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
      <WifiOff size={10} />
      Disconnected
    </span>
  );
}

// ── Postgres Modal ─────────────────────────────────────────────────────────────
function PostgresModal({ onClose, onConnect }: { onClose: () => void; onConnect: (data: any) => void }) {
  const [form, setForm] = useState({ host: '', port: '5432', database: '', username: '', password: '', ssl: false });
  const [loading, setLoading] = useState(false);
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [f]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/mcp/connect/postgres', { ...form, port: Number(form.port) });
      toast.success('PostgreSQL connected!');
      onConnect(form);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Connection failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-md rounded-2xl p-6"
                  style={{ background: '#0d0b26', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-cyan-400"
                 style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}>
              <Database size={16} />
            </div>
            <h3 className="text-white font-bold">Connect PostgreSQL</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Host *</label>
              <input value={form.host} onChange={set('host')} placeholder="localhost" className="input-field text-sm py-2.5" required />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Port</label>
              <input value={form.port} onChange={set('port')} placeholder="5432" className="input-field text-sm py-2.5" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Database *</label>
            <input value={form.database} onChange={set('database')} placeholder="mydb" className="input-field text-sm py-2.5" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Username *</label>
              <input value={form.username} onChange={set('username')} placeholder="postgres" className="input-field text-sm py-2.5" required />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Password *</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" className="input-field text-sm py-2.5" required />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ssl} onChange={e => setForm(p => ({ ...p, ssl: e.target.checked }))}
                   className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-400">Use SSL</span>
          </label>
          <p className="text-[11px] text-slate-600 mt-1">
            🔒 Credentials are encrypted with AES-256. Password is never stored in plaintext.
          </p>
          <button type="submit" disabled={loading} className="btn-brand w-full justify-center py-2.5 text-sm mt-2">
            {loading ? <><Loader2 size={13} className="animate-spin" /> Connecting...</> : 'Connect Database'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ── MCP Card ──────────────────────────────────────────────────────────────────
function MCPCard({ conn, onConnect, onDisconnect }: {
  conn: MCPConnection;
  onConnect: (provider: string) => void;
  onDisconnect: (provider: string) => void;
}) {
  const isConnected = conn.status === 'connected';
  const isLoading   = conn.status === 'loading';

  const cardClass = isConnected ? 'bento-card mcp-card-connected' :
                    conn.status === 'expired' ? 'bento-card mcp-card-expired' : 'bento-card';

  const colors: Record<string, string> = {
    github: '#e2e8f0', gdrive: '#00f5ff', slack: '#a855f7', notion: '#94a3b8',
    postgres: '#06b6d4', filesystem: '#10b981', browser: '#f59e0b',
  };
  const color = colors[conn.provider] || '#00f5ff';

  const formatDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={cardClass} style={{ borderRadius: '1.25rem' }}>
        {/* Top glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-xl"
             style={{ background: `linear-gradient(90deg, transparent, ${color}${isConnected ? '60' : '20'}, transparent)` }} />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}>
              <ProviderIcon provider={conn.provider} size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm leading-tight">{conn.meta.name}</h3>
              <p className="text-xs text-slate-600 mt-0.5">{conn.meta.auth_type === 'none' ? 'No auth required' : conn.meta.auth_type === 'credentials' ? 'Credentials' : 'OAuth 2.0'}</p>
            </div>
          </div>
          <StatusBadge status={isLoading ? 'loading' : conn.status} />
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{conn.meta.description}</p>

        {/* Postgres info */}
        {isConnected && conn.provider === 'postgres' && conn.pg_host && (
          <div className="mb-4 p-2.5 rounded-lg text-xs text-slate-400 space-y-1"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p><span className="text-slate-600">Host:</span> {conn.pg_host}:{conn.pg_port || '5432'}</p>
            <p><span className="text-slate-600">DB:</span> {conn.pg_database} {conn.pg_ssl && <span className="ml-1 hex-tag hex-tag-green" style={{fontSize:'9px'}}>SSL</span>}</p>
          </div>
        )}

        {/* Last sync */}
        {isConnected && conn.last_sync && (
          <p className="text-[11px] text-slate-600 mb-4 flex items-center gap-1.5">
            <Clock size={10} />
            Last sync: {formatDate(conn.last_sync)}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {isConnected ? (
            <>
              <button onClick={() => onConnect(conn.provider)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all text-cyan-400 hover:bg-cyan-400/10"
                      style={{ border: '1px solid rgba(0,245,255,0.15)' }}>
                <RefreshCw size={12} /> Reconnect
              </button>
              <button onClick={() => onDisconnect(conn.provider)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-red-400 hover:bg-red-400/10"
                      style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <button onClick={() => onConnect(conn.provider)} disabled={isLoading}
                    className="btn-brand w-full justify-center py-2 text-xs">
              {isLoading ? <><Loader2 size={12} className="animate-spin" /> Connecting...</> : <><Plus size={12} /> Connect</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: Agent }) {
  const [running, setRunning] = useState(false);

  return (
    <div className="bento-card flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
             style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
          {agent.icon}
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">{agent.name}</h3>
        </div>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed flex-1">{agent.description}</p>
      <button
        onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 2000); }}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all text-purple-400 hover:bg-purple-400/10"
        style={{ border: '1px solid rgba(167,139,250,0.2)' }}
      >
        {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        {running ? 'Starting...' : 'Launch'}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);
  const [showPgModal, setShowPgModal] = useState(false);
  const [tab, setTab] = useState<'mcp' | 'agents'>('mcp');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingConns(true);
    try {
      const [connsRes, agentsRes] = await Promise.all([
        api.get('/api/mcp/connections'),
        api.get('/api/agents/'),
      ]);
      setConnections(connsRes.data.connections);
      setAgents(agentsRes.data.agents);
    } catch (err) {
      toast.error('Failed to load connections');
    } finally { setLoadingConns(false); }
  };

  const handleConnect = async (provider: string) => {
    if (provider === 'postgres') { setShowPgModal(true); return; }

    // Set loading state
    setConnections(prev => prev.map(c => c.provider === provider ? { ...c, status: 'loading' } : c));

    try {
      if (provider === 'browser' || provider === 'filesystem') {
        await api.post(`/api/mcp/connect/${provider}`);
        toast.success(`${provider} connected!`);
        await loadData();
      } else if (provider === 'github') {
        const res = await api.get('/api/mcp/connect/github');
        window.open(res.data.oauth_url, '_blank', 'width=600,height=700');
        toast.success('Complete OAuth in the popup window, then refresh.');
        setConnections(prev => prev.map(c => c.provider === provider ? { ...c, status: 'disconnected' } : c));
      } else if (provider === 'gdrive') {
        const res = await api.get('/api/mcp/connect/gdrive');
        window.open(res.data.oauth_url, '_blank', 'width=600,height=700');
        toast.success('Complete OAuth in the popup, then refresh.');
        setConnections(prev => prev.map(c => c.provider === provider ? { ...c, status: 'disconnected' } : c));
      } else {
        toast(`OAuth for ${provider} — configure CLIENT_ID in .env first.`);
        setConnections(prev => prev.map(c => c.provider === provider ? { ...c, status: 'disconnected' } : c));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to connect ${provider}`);
      setConnections(prev => prev.map(c => c.provider === provider ? { ...c, status: 'disconnected' } : c));
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await api.delete(`/api/mcp/disconnect/${provider}`);
      toast.success(`${provider} disconnected`);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Disconnect failed');
    }
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">AI Agents <span className="gradient-text">& MCP</span></h1>
              <p className="text-slate-400 text-sm">Your personal MCP connections — isolated, encrypted, per-user.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hex-tag hex-tag-green text-xs">{connectedCount} Connected</span>
              <button onClick={loadData} className="btn-ghost text-xs py-2 px-3">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Security notice */}
          <div className="mt-5 px-4 py-3 rounded-xl text-xs text-slate-400 flex items-center gap-3"
               style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)' }}>
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
            <span>All tokens are encrypted with <b className="text-slate-300">AES-256</b> and stored per-user. Tokens are never exposed to the frontend or stored in <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">.env</code>. Each user's filesystem is completely isolated.</span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'mcp', label: 'MCP Connections', icon: Wifi },
            { id: 'agents', label: 'AI Agents', icon: Sparkles },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === t.id ? 'text-white bg-white/08' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    style={tab === t.id ? { background: 'rgba(255,255,255,0.08)' } : {}}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* MCP Grid */}
        {tab === 'mcp' && (
          loadingConns ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={28} className="animate-spin text-cyan-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {connections.map((conn, i) => (
                <MCPCard key={conn.provider} conn={conn} onConnect={handleConnect} onDisconnect={handleDisconnect} />
              ))}
            </div>
          )
        )}

        {/* Agents Grid */}
        {tab === 'agents' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        )}
      </div>

      {/* Postgres Modal */}
      <AnimatePresence>
        {showPgModal && (
          <PostgresModal onClose={() => setShowPgModal(false)} onConnect={() => loadData()} />
        )}
      </AnimatePresence>
    </div>
  );
}
