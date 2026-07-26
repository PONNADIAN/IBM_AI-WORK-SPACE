// pages/CSVPage.tsx — CSV Analyzer with charts

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Upload, Loader2, Zap, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentsApi } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import type { Document } from '@/types';

const CHART_COLORS = ['#6172f3', '#818cf8', '#a78bfa', '#60a5fa', '#34d399', '#f472b6'];

export default function CSVPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [query, setQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await documentsApi.upload(file);
      setDoc(res.data);
      toast.success('CSV uploaded! Ready to analyze.');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const analyze = async () => {
    if (!doc) return;
    setAnalyzing(true);
    setResult('');
    try {
      const res = await documentsApi.analyze(doc.id, 'csv_insights');
      setResult(res.data.result);
    } catch (e: any) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const askQuery = async () => {
    if (!doc || !query.trim()) return;
    setQuerying(true);
    setQueryResult('');
    try {
      const res = await documentsApi.analyze(doc.id, 'summarize', query);
      setQueryResult(res.data.result);
    } catch {
      toast.error('Query failed');
    } finally {
      setQuerying(false);
    }
  };

  // Mock chart data for demo
  const mockBarData = [
    { name: 'Jan', value: 4000 }, { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 }, { name: 'Apr', value: 4500 },
    { name: 'May', value: 6000 }, { name: 'Jun', value: 5500 },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-white/5 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={20} className="text-brand-400" /> CSV Analyzer
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Upload CSV data and get AI-powered insights</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Upload */}
        {!doc ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-brand-400/40 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-brand-500/5 max-w-lg mx-auto"
          >
            {uploading ? (
              <Loader2 size={40} className="mx-auto text-brand-400 animate-spin mb-4" />
            ) : (
              <Upload size={40} className="mx-auto text-slate-500 mb-4" />
            )}
            <p className="text-lg font-semibold text-slate-300 mb-2">
              {uploading ? 'Uploading CSV...' : 'Upload your CSV file'}
            </p>
            <p className="text-sm text-slate-500">Drag & drop or click to browse</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        ) : (
          <>
            {/* File info */}
            <div className="glass rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl">📊</span>
              <div className="flex-1">
                <p className="font-semibold text-white">{doc.original_filename}</p>
                <p className="text-sm text-slate-500">{formatFileSize(doc.file_size)}</p>
              </div>
              <button onClick={analyze} disabled={analyzing} className="btn-brand">
                {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Zap size={16} /> Get Insights</>}
              </button>
              <button onClick={() => { setDoc(null); setResult(''); }} className="btn-ghost text-sm">Change file</button>
            </div>

            {/* Preview data info */}
            {doc.extracted_text && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Data Preview</h3>
                <pre className="text-xs text-slate-400 overflow-x-auto font-mono whitespace-pre-wrap">
                  {doc.extracted_text.split('\n').slice(0, 10).join('\n')}
                </pre>
              </div>
            )}

            {/* Sample Chart */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-400" /> Sample Visualization
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mockBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid rgba(97,114,243,0.3)', borderRadius: '8px', color: '#e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {mockBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 text-center mt-2">Sample chart — run AI analysis for real insights</p>
            </div>

            {/* Natural Language Query */}
            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Ask a Question About Your Data</h3>
              <div className="flex gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. What is the trend? Which category is highest?"
                  className="input-field flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && askQuery()}
                />
                <button onClick={askQuery} disabled={querying} className="btn-brand">
                  {querying ? <Loader2 size={16} className="animate-spin" /> : 'Ask'}
                </button>
              </div>
              {queryResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-4 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{queryResult}</ReactMarkdown>
                </motion.div>
              )}
            </div>

            {/* AI Insights */}
            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-5 prose prose-invert prose-sm max-w-none">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand-400" /> AI Insights
                </h3>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
