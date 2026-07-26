// pages/DocumentsPage.tsx — Document upload and streaming analysis

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, Zap, Loader2, ChevronDown, Download, X, Sparkles, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentsApi, streamDocumentAnalysis } from '@/lib/api';
import { formatFileSize, formatDate, getFileIcon, copyToClipboard } from '@/lib/utils';
import type { Document, AnalyzeAction } from '@/types';

const ACTIONS: { id: AnalyzeAction; label: string; description: string }[] = [
  { id: 'summarize', label: 'Summarize', description: 'Generate a clear summary' },
  { id: 'keypoints', label: 'Key Points', description: 'Extract main takeaways' },
  { id: 'explain', label: 'Explain', description: 'Simplify complex content' },
  { id: 'rewrite', label: 'Rewrite', description: 'Improve clarity & structure' },
  { id: 'translate', label: 'Translate', description: 'Convert to another language' },
  { id: 'questions', label: 'Questions', description: 'Generate study questions' },
];

export default function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [action, setAction] = useState<AnalyzeAction>('summarize');
  const [result, setResult] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [targetLang, setTargetLang] = useState('Spanish');
  const [copied, setCopied] = useState(false);

  // In-memory cache for instant switching between actions & documents
  const [analysisCache, setAnalysisCache] = useState<Record<string, string>>({});

  const getCacheKey = (docId: string, act: string, lang?: string) =>
    `${docId}_${act}_${lang || ''}`;

  // Instant response from cache on document/action select
  useEffect(() => {
    if (selectedDoc) {
      const key = getCacheKey(selectedDoc.id, action, action === 'translate' ? targetLang : undefined);
      if (analysisCache[key]) {
        setResult(analysisCache[key]);
      } else {
        setResult('');
      }
    }
  }, [selectedDoc, action, targetLang, analysisCache]);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then((r) => r.data),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded!');
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Upload failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      if (selectedDoc?.id === id) setSelectedDoc(null);
      toast.success('Document deleted');
    },
  });

  const handleFile = (file: File) => {
    uploadMut.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const analyze = async () => {
    if (!selectedDoc || analyzing) return;

    const cacheKey = getCacheKey(selectedDoc.id, action, action === 'translate' ? targetLang : undefined);
    if (analysisCache[cacheKey]) {
      setResult(analysisCache[cacheKey]);
      return;
    }

    setAnalyzing(true);
    setResult('');

    try {
      let fullText = '';
      for await (const event of streamDocumentAnalysis(
        selectedDoc.id,
        action,
        undefined,
        action === 'translate' ? targetLang : undefined
      )) {
        if (event.type === 'chunk' && event.content) {
          fullText += event.content;
          setResult(fullText);
        } else if (event.type === 'done' && event.result) {
          fullText = event.result;
          setResult(fullText);
        } else if (event.type === 'error') {
          toast.error(event.message || 'Analysis error');
          break;
        }
      }

      if (fullText) {
        setAnalysisCache((prev) => ({ ...prev, [cacheKey]: fullText }));
      }
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await copyToClipboard(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText size={20} className="text-brand-400" /> Document Analyzer
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Upload documents and analyze them with AI</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Upload + file list */}
        <div className="w-80 flex flex-col border-r border-white/5 p-4 space-y-4">
          {/* Upload zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 hover:border-white/25 hover:bg-white/2'
            }`}
          >
            {uploadMut.isPending ? (
              <Loader2 size={24} className="mx-auto animate-spin text-brand-400 mb-2" />
            ) : (
              <Upload size={24} className="mx-auto text-slate-500 mb-2" />
            )}
            <p className="text-sm text-slate-300 font-medium">
              {uploadMut.isPending ? 'Uploading...' : 'Drop file or click'}
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, CSV, Images</p>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {/* Files list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading && [0,1,2].map(i => (
              <div key={i} className="shimmer h-16 rounded-xl" />
            ))}
            {docs.map((doc: Document) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedDoc(doc)}
                className={`p-3 rounded-xl cursor-pointer border transition-all group ${
                  selectedDoc?.id === doc.id
                    ? 'border-brand-500/40 bg-brand-500/10'
                    : 'border-white/5 glass glass-hover'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{getFileIcon(doc.file_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{doc.original_filename}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(doc.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right panel - Analysis */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {!selectedDoc ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <FileText size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium">Select a document to analyze</p>
                <p className="text-sm text-slate-600 mt-1">Upload a file on the left to get started</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {getFileIcon(selectedDoc.file_type)} {selectedDoc.original_filename}
                  </h2>
                  <p className="text-sm text-slate-500">{formatFileSize(selectedDoc.file_size)}</p>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="btn-ghost text-sm"><X size={14} /></button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      action === a.id
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : 'glass text-slate-400 hover:text-slate-200'
                    }`}
                    title={a.description}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {action === 'translate' && (
                <div className="mb-4 flex items-center gap-3">
                  <label className="text-sm text-slate-400">Target language:</label>
                  <input value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                    className="input-field w-40 text-sm" placeholder="e.g. Spanish" />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <button onClick={analyze} disabled={analyzing} className="btn-brand">
                  {analyzing ? (
                    <><Loader2 size={16} className="animate-spin text-cyan-300" /> Analyzing live...</>
                  ) : (
                    <><Zap size={16} /> Analyze</>
                  )}
                </button>

                {result && !analyzing && (
                  <button onClick={handleCopy} className="btn-ghost text-xs flex items-center gap-1.5 text-slate-400 hover:text-white">
                    {copied ? <><Check size={14} className="text-green-400" /> Copied</> : <><Copy size={14} /> Copy Output</>}
                  </button>
                )}
              </div>

              {/* Result */}
              <div className="flex-1 overflow-y-auto">
                {analyzing && !result && (
                  <div className="space-y-3 p-4 glass rounded-xl">
                    <div className="flex items-center gap-2 text-brand-400 text-sm font-medium mb-3">
                      <Sparkles size={16} className="animate-spin" /> Stream processing analysis...
                    </div>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="shimmer h-4 rounded-full" style={{ width: `${70 + Math.random() * 30}%` }} />
                    ))}
                  </div>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="glass rounded-xl p-5 prose prose-invert prose-sm max-w-none relative">
                    {analyzing && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-3 bg-cyan-500/10 px-3 py-1 rounded-full w-fit border border-cyan-500/20">
                        <Sparkles size={12} className="animate-pulse" /> Streaming in real-time...
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                    {analyzing && (
                      <span className="inline-block w-2 h-4 bg-brand-400 ml-1 animate-pulse" />
                    )}
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
