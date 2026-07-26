// pages/CodePage.tsx — AI Code Assistant

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Zap, Copy, Check, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentsApi } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';

const ACTIONS = [
  { id: 'code_explain', label: '📖 Explain Code', placeholder: 'Paste your code here to get a detailed explanation...' },
  { id: 'code_review', label: '🔍 Review Code', placeholder: 'Paste your code for a thorough review...' },
  { id: 'rewrite', label: '♻️ Refactor', placeholder: 'Paste code to refactor for better quality...' },
  { id: 'questions', label: '💬 Generate Tests', placeholder: 'Paste code to generate unit test cases...' },
];

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'SQL', 'Other'];

export default function CodePage() {
  const [code, setCode] = useState('');
  const [action, setAction] = useState('code_explain');
  const [language, setLanguage] = useState('Python');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentAction = ACTIONS.find((a) => a.id === action) || ACTIONS[0];

  const analyze = async () => {
    if (!code.trim()) { toast.error('Please paste some code first'); return; }
    setLoading(true);
    setResult('');
    try {
      // Use document analyze with a temp document approach
      // Create a blob with the code
      const file = new File([code], `code.${language.toLowerCase()}`, { type: 'text/plain' });
      const uploadRes = await documentsApi.upload(file);
      const docId = uploadRes.data.id;
      const res = await documentsApi.analyze(docId, action as any, `Language: ${language}`);
      setResult(res.data.result);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-white/5 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Code2 size={20} className="text-brand-400" /> Code Assistant
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Explain, review, refactor, and debug code with AI</p>
      </div>

      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Left: Code Input */}
        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* Controls */}
          <div className="flex gap-3 flex-wrap">
            {ACTIONS.map((a) => (
              <button key={a.id} onClick={() => setAction(a.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  action === a.id
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                    : 'glass text-slate-400 hover:text-slate-200'
                }`}
              >
                {a.label}
              </button>
            ))}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field w-36 text-sm cursor-pointer ml-auto"
            >
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Code editor */}
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={currentAction.placeholder}
              className="w-full h-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 resize-none outline-none focus:border-brand-500/40 transition-colors"
              spellCheck={false}
            />
          </div>

          <button onClick={analyze} disabled={loading || !code.trim()} className="btn-brand self-start">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Zap size={16} /> Run Analysis</>}
          </button>
        </div>

        {/* Right: Result */}
        <div className="flex-1 flex flex-col p-4 gap-4 border-l border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Result</h3>
            {result && (
              <button onClick={handleCopy} className="btn-ghost text-sm">
                {copied ? <><Check size={14} className="text-green-400" /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="space-y-3">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="shimmer h-4 rounded-full" style={{ width: `${60 + i * 8}%` }} />
                ))}
              </div>
            )}
            {result && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-5 prose prose-invert prose-sm max-w-none h-full overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children }) {
                      return className?.includes('language-') ? (
                        <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs border border-white/10">
                          <code className={className}>{children}</code>
                        </pre>
                      ) : (
                        <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs text-brand-300">{children}</code>
                      );
                    },
                  }}
                >
                  {result}
                </ReactMarkdown>
              </motion.div>
            )}
            {!result && !loading && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Code2 size={40} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500 text-sm">Analysis results will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
