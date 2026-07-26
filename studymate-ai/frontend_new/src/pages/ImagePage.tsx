// pages/ImagePage.tsx — Image Analyzer

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Upload, Loader2, Zap, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentsApi } from '@/lib/api';

const QUICK_ACTIONS = [
  { label: '📝 Describe Image', prompt: 'Describe this image in detail.' },
  { label: '📄 Extract Text', prompt: 'Extract all text visible in this image.' },
  { label: '🔍 Analyze Content', prompt: 'Analyze the content, objects, colors, and any notable elements in this image.' },
  { label: '❓ What is this?', prompt: 'What is shown in this image? Provide context and details.' },
];

export default function ImagePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prompt, setPrompt] = useState('Describe this image in detail.');
  const [result, setResult] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleFile = async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const res = await documentsApi.upload(file);
      setDocId(res.data.id);
      toast.success('Image uploaded!');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const analyze = async () => {
    if (!docId) { toast.error('Upload an image first'); return; }
    setAnalyzing(true);
    setResult('');
    try {
      const res = await documentsApi.analyze(docId, 'explain', prompt);
      setResult(res.data.result);
    } catch {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-white/5 px-6 py-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Image size={20} className="text-brand-400" /> Image Analyzer
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Describe, extract text, and analyze images with AI vision</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image Upload */}
        <div className="w-96 flex flex-col p-6 gap-4 border-r border-white/5">
          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-brand-400/40 rounded-2xl overflow-hidden cursor-pointer transition-all hover:bg-brand-500/5 aspect-square flex items-center justify-center relative"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-center p-6">
                {uploading ? (
                  <Loader2 size={40} className="mx-auto text-brand-400 animate-spin mb-3" />
                ) : (
                  <Upload size={40} className="mx-auto text-slate-500 mb-3" />
                )}
                <p className="text-slate-300 font-medium">Upload Image</p>
                <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP, GIF</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {previewUrl && (
            <button onClick={() => { setPreviewUrl(null); setDocId(null); setResult(''); }}
              className="btn-ghost text-sm justify-center">
              Change image
            </button>
          )}

          {/* Quick actions */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Actions</p>
            <div className="space-y-1.5">
              {QUICK_ACTIONS.map((a) => (
                <button key={a.label} onClick={() => setPrompt(a.prompt)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    prompt === a.prompt
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'glass text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Analysis */}
        <div className="flex-1 flex flex-col p-6 gap-4">
          {/* Custom prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Custom Question</label>
            <div className="flex gap-3">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask anything about the image..."
                className="input-field flex-1"
                onKeyDown={(e) => e.key === 'Enter' && analyze()}
              />
              <button onClick={analyze} disabled={analyzing || !docId} className="btn-brand flex-shrink-0">
                {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Eye size={16} /> Analyze</>}
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="flex-1 overflow-y-auto">
            {analyzing && (
              <div className="space-y-3 p-4">
                {[0,1,2,3].map(i => <div key={i} className="shimmer h-4 rounded-full" style={{ width: `${60+i*10}%` }} />)}
              </div>
            )}
            {result && !analyzing ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-5 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </motion.div>
            ) : !analyzing && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Eye size={48} className="text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium">Upload an image and click Analyze</p>
                <p className="text-sm text-slate-600 mt-1">AI will describe, extract text, or answer questions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
