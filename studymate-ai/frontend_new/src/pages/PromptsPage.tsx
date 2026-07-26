// pages/PromptsPage.tsx — Prompt Library

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Plus, Star, Trash2, Edit3, Search, Download, Upload, Check, X, Copy, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptsApi } from '@/lib/api';
import { copyToClipboard, formatDate } from '@/lib/utils';
import type { SavedPrompt } from '@/types';

const CATEGORIES = ['All', 'General', 'Writing', 'Code', 'Analysis', 'Creative', 'Business', 'Education'];

const DEFAULT_PROMPTS = [
  { title: 'Explain Like I\'m 5', content: 'Explain [topic] in simple terms that a 5-year-old could understand.', category: 'Education' },
  { title: 'Code Review Expert', content: 'Review the following code for bugs, security issues, and performance improvements:\n\n[paste code here]', category: 'Code' },
  { title: 'Professional Email', content: 'Write a professional email to [recipient] about [topic]. Tone: [formal/friendly]', category: 'Writing' },
  { title: 'SWOT Analysis', content: 'Perform a detailed SWOT analysis for [company/product/idea]', category: 'Business' },
];

export default function PromptsPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'General', tags: '' });

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['prompts', category, search, favOnly],
    queryFn: () => promptsApi.list({
      category: category !== 'All' ? category : undefined,
      search: search || undefined,
      favorites_only: favOnly || undefined,
    }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => promptsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompts'] }); setShowForm(false); resetForm(); toast.success('Prompt saved!'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => promptsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompts'] }); setEditingId(null); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => promptsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompts'] }); toast.success('Deleted'); },
  });

  const favMut = useMutation({
    mutationFn: ({ id, is_favorite }: { id: string; is_favorite: boolean }) =>
      promptsApi.update(id, { is_favorite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });

  const resetForm = () => setForm({ title: '', content: '', category: 'General', tags: '' });

  const startEdit = (p: SavedPrompt) => {
    setEditingId(p.id);
    setForm({ title: p.title, content: p.content, category: p.category, tags: p.tags });
    setShowForm(true);
  };

  const saveForm = () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content required'); return; }
    if (editingId) {
      updateMut.mutate({ id: editingId, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const importDefaults = async () => {
    await promptsApi.import(DEFAULT_PROMPTS);
    qc.invalidateQueries({ queryKey: ['prompts'] });
    toast.success('Starter prompts imported!');
  };

  const exportAll = async () => {
    const res = await promptsApi.export();
    const blob = new Blob([typeof res.data === 'string' ? res.data : JSON.stringify(res.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'my-prompts.json'; a.click();
    toast.success('Prompts exported!');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bookmark size={20} className="text-brand-400" /> Prompt Library
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Save, organize, and reuse your best prompts</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={importDefaults} className="btn-ghost text-sm"><Upload size={14} /> Import Starters</button>
          <button onClick={exportAll} className="btn-ghost text-sm"><Download size={14} /> Export</button>
          <button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }} className="btn-brand text-sm">
            <Plus size={14} /> New Prompt
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar filters */}
        <div className="w-48 border-r border-white/5 p-3 space-y-1">
          <button onClick={() => setFavOnly(!favOnly)}
            className={`sidebar-item w-full ${favOnly ? 'active' : ''}`}>
            <Star size={16} className={favOnly ? 'text-yellow-400' : 'text-slate-500'} />
            Favorites
          </button>
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 mb-1">Categories</p>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`sidebar-item w-full text-left ${category === cat ? 'active' : ''}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts..." className="input-field pl-9 text-sm" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0,1,2,3].map(i => <div key={i} className="shimmer h-36 rounded-xl" />)}
              </div>
            )}
            {prompts.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Bookmark size={40} className="mx-auto text-slate-700 mb-3" />
                <p className="text-slate-400 font-medium">No prompts yet</p>
                <p className="text-sm text-slate-600 mt-1">Create a prompt or import starters</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prompts.map((p: SavedPrompt) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 group hover:border-brand-500/20 transition-all border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{p.title}</h3>
                      <span className="inline-block text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full mt-1">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => favMut.mutate({ id: p.id, is_favorite: !p.is_favorite })}>
                        <Star size={15} className={p.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600 hover:text-yellow-400'} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-3 mb-3">{p.content}</p>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { copyToClipboard(p.content); promptsApi.use(p.id); toast.success('Copied!'); }}
                      className="btn-ghost text-xs py-1 px-2"><Copy size={12} /> Copy</button>
                    <button onClick={() => startEdit(p)} className="btn-ghost text-xs py-1 px-2"><Edit3 size={12} /> Edit</button>
                    <button onClick={() => deleteMut.mutate(p.id)}
                      className="btn-ghost text-xs py-1 px-2 hover:text-red-400"><Trash2 size={12} /></button>
                    <span className="ml-auto text-xs text-slate-600">Used {p.use_count}×</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowForm(false); setEditingId(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="glass rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Prompt' : 'New Prompt'}</h2>
              <div className="space-y-4">
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Prompt title" className="input-field" />
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Prompt content... Use [placeholders] for variable parts" rows={5}
                  className="input-field resize-none" />
                <div className="flex gap-3">
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="input-field flex-1 cursor-pointer">
                    {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="Tags (comma-separated)" className="input-field flex-1" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveForm} className="btn-brand flex-1 justify-center">
                  {(createMut.isPending || updateMut.isPending) ? 'Saving...' : <><Check size={16} /> Save Prompt</>}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
