// pages/ChatPage.tsx — Full-featured AI chat with streaming

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, Trash2, Pin, PinOff, Search, Edit3, Check, X,
  Copy, RefreshCw, Square, Sparkles, MessageSquare, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { conversationsApi, streamChat } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { cn, formatDate, copyToClipboard } from '@/lib/utils';
import type { Message } from '@/types';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const store = useChatStore();

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations
  useEffect(() => {
    conversationsApi.list({ search: search || undefined }).then((res) => {
      store.setConversations(res.data);
    }).catch(() => { });
  }, [search]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      store.setActiveConversation(conversationId);
      store.setMessages([]);
      conversationsApi.getMessages(conversationId).then((res) => {
        store.setMessages(res.data);
      }).catch(() => toast.error('Failed to load messages'));
    } else {
      store.setActiveConversation(null);
      store.setMessages([]);
    }
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages, store.streamingContent]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || store.isStreaming) return;

    setInput('');
    store.addMessage({ id: Date.now().toString(), role: 'user', content: msg, created_at: new Date().toISOString() });
    store.setStreaming(true);
    store.clearStreamingContent();

    const ac = new AbortController();
    setAbortController(ac);

    try {
      let convId = conversationId;

      for await (const event of streamChat(msg, convId)) {
        if (event.type === 'conversation_id' && event.conversation_id) {
          convId = event.conversation_id;
          if (!conversationId) {
            navigate(`/chat/${convId}`, { replace: true });
            // Refresh conversations list
            conversationsApi.list().then((r) => store.setConversations(r.data));
          }
        } else if (event.type === 'chunk' && event.content) {
          store.appendStreamChunk(event.content);
        } else if (event.type === 'done') {
          store.finalizeStreamMessage();
          break;
        } else if (event.type === 'error') {
          toast.error((event as any).message || event.content || 'Stream error');
          store.setStreaming(false);
          break;
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to send message');
      }
      store.setStreaming(false);
    }
  }, [input, conversationId, store.isStreaming]);

  const stopStreaming = () => {
    abortController?.abort();
    store.finalizeStreamMessage();
    setAbortController(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newChat = () => {
    navigate('/chat');
    store.setMessages([]);
    store.setActiveConversation(null);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await conversationsApi.delete(id);
      store.removeConversation(id);
      if (conversationId === id) navigate('/chat');
      toast.success('Chat deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const pinConversation = async (id: string, pinned: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await conversationsApi.update(id, { is_pinned: !pinned });
      store.updateConversation(id, { is_pinned: !pinned });
    } catch { toast.error('Failed to update'); }
  };

  const saveTitle = async (id: string) => {
    if (!newTitle.trim()) { setEditingTitle(null); return; }
    try {
      await conversationsApi.update(id, { title: newTitle });
      store.updateConversation(id, { title: newTitle });
      setEditingTitle(null);
    } catch { toast.error('Failed to rename'); }
  };

  const filteredConvs = store.conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Conversation Sidebar */}
      <div className="w-72 flex flex-col border-r border-white/5" style={{ background: '#0a0f1e' }}>
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <button onClick={newChat} className="btn-brand w-full justify-center text-sm">
            <Plus size={16} /> New Chat
          </button>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConvs.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              <p>No chats yet</p>
            </div>
          )}
          {filteredConvs.map((conv) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'group relative p-3 rounded-lg cursor-pointer transition-all',
                conversationId === conv.id
                  ? 'bg-brand-500/15 border border-brand-500/25'
                  : 'hover:bg-white/5'
              )}
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <div className="flex items-start gap-2">
                {conv.is_pinned && <Pin size={10} className="text-brand-400 mt-1 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  {editingTitle === conv.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="input-field text-xs py-0.5 px-2 flex-1"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(conv.id); if (e.key === 'Escape') setEditingTitle(null); }}
                      />
                      <button onClick={() => saveTitle(conv.id)} className="text-green-400 hover:text-green-300">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingTitle(null)} className="text-slate-500 hover:text-slate-300">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-200 truncate font-medium">{conv.title}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(conv.updated_at)}</p>
                </div>
              </div>

              {/* Action buttons (show on hover) */}
              {editingTitle !== conv.id && (
                <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditingTitle(conv.id); setNewTitle(conv.title); }}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10">
                    <Edit3 size={11} />
                  </button>
                  <button onClick={(e) => pinConversation(conv.id, conv.is_pinned, e)}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10">
                    {conv.is_pinned ? <PinOff size={11} /> : <Pin size={11} />}
                  </button>
                  <button onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {store.messages.length === 0 && !store.isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: 'linear-gradient(135deg, #444ce7 0%, #6172f3 100%)',
                    boxShadow: '0 8px 40px rgba(68, 76, 231, 0.4)',
                  }}
                >
                  <Sparkles size={36} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">How can I help you?</h2>
                <p className="text-slate-400 mb-8 max-w-md">
                  I can help you chat, analyze documents, write code, answer questions, and much more.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                  {[
                    'Explain quantum computing simply',
                    'Write a Python web scraper',
                    'Summarize a research paper',
                    'Help debug my code',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-3 rounded-xl glass glass-hover text-sm text-slate-300 text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {store.messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} msg={msg} />
            ))}
          </AnimatePresence>

          {/* Streaming message */}
          {store.isStreaming && store.streamingContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #444ce7, #6172f3)' }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="message-assistant flex-1 p-4 text-sm text-slate-200 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {store.streamingContent}
                </ReactMarkdown>
                <span className="inline-block w-0.5 h-4 bg-brand-400 ml-0.5 animate-pulse" />
              </div>
            </motion.div>
          )}

          {/* Typing indicator */}
          {store.isStreaming && !store.streamingContent && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #444ce7, #6172f3)' }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="message-assistant p-4 flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot w-2 h-2 rounded-full bg-brand-400 block" />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-white/5 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-3 flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AI Workspace... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 resize-none outline-none max-h-32 overflow-y-auto"
                style={{ minHeight: '24px', lineHeight: '1.5rem' }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
                disabled={store.isStreaming}
              />
              {store.isStreaming ? (
                <button onClick={stopStreaming}
                  className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0">
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    'p-2.5 rounded-xl transition-all flex-shrink-0',
                    input.trim()
                      ? 'text-white glow-sm'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  )}
                  style={input.trim() ? { background: 'linear-gradient(135deg, #444ce7, #6172f3)' } : {}}
                >
                  <Send size={16} />
                </button>
              )}
            </div>
            <p className="text-center text-xs text-slate-600 mt-2">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble Component ──────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const handleCopy = async () => {
    await copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-4 group', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
        style={isUser
          ? { background: 'linear-gradient(135deg, #2d3282, #444ce7)' }
          : { background: 'linear-gradient(135deg, #444ce7, #6172f3)' }
        }
      >
        {isUser ? 'U' : <Sparkles size={14} className="text-white" />}
      </div>

      {/* Content */}
      <div className={cn('max-w-[70%] space-y-1', isUser && 'items-end flex flex-col')}>
        <div className={cn('p-4 text-sm', isUser ? 'message-user' : 'message-assistant text-slate-200')}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = className?.includes('language-');
                    return isBlock ? (
                      <div className="relative group/code">
                        <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-xs border border-white/10">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(String(children))}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 text-slate-400 hover:text-white opacity-0 group-hover/code:opacity-100 transition-all text-xs"
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs text-brand-300 border border-white/10"
                        {...props}>{children}</code>
                    );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
        >
          {copied ? <><Check size={11} className="text-green-400" /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
    </motion.div>
  );
}
