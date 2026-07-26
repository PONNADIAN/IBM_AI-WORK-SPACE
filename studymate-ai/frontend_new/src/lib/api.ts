// lib/api.ts — Axios instance with auth interceptor

import axios from 'axios';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api')) return cleanUrl;
  return `${cleanUrl}/api`;
};

const API_BASE = getApiBase();

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  me: () => api.get('/auth/me'),
};

// ── Conversations ─────────────────────────────────────────────────────────────

export const conversationsApi = {
  list: (params?: { search?: string; pinned_only?: boolean }) =>
    api.get('/conversations', { params }),
  create: (title?: string) =>
    api.post('/conversations', { title }),
  getMessages: (id: string) =>
    api.get(`/conversations/${id}/messages`),
  update: (id: string, data: { title?: string; is_pinned?: boolean }) =>
    api.put(`/conversations/${id}`, data),
  delete: (id: string) =>
    api.delete(`/conversations/${id}`),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  analyze: (document_id: string, action: string, extra_instruction?: string, target_language?: string) =>
    api.post('/documents/analyze', { document_id, action, extra_instruction, target_language }),
  list: () => api.get('/documents/'),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// ── Prompts ───────────────────────────────────────────────────────────────────

export const promptsApi = {
  list: (params?: { category?: string; favorites_only?: boolean; search?: string }) =>
    api.get('/prompts/', { params }),
  create: (data: { title: string; content: string; category?: string; tags?: string }) =>
    api.post('/prompts/', data),
  update: (id: string, data: Partial<{ title: string; content: string; is_favorite: boolean }>) =>
    api.put(`/prompts/${id}`, data),
  delete: (id: string) => api.delete(`/prompts/${id}`),
  use: (id: string) => api.post(`/prompts/${id}/use`),
  export: () => api.get('/prompts/export'),
  import: (prompts: object[]) => api.post('/prompts/import', prompts),
};

// ── Agents ────────────────────────────────────────────────────────────────────

export const agentsApi = {
  list: () => api.get('/agents/'),
  listMCP: () => api.get('/agents/mcp-servers'),
};

// ── Streaming helper ─────────────────────────────────────────────────────────

export async function* streamChat(
  message: string,
  conversation_id?: string,
  system_prompt?: string
): AsyncGenerator<{ type: string; content?: string; conversation_id?: string; message?: string }> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversation_id, system_prompt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Stream error' }));
    throw new Error(err.detail || 'Stream request failed');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch { /* ignore malformed */ }
      }
    }
  }
}

// ── Agent streaming ───────────────────────────────────────────────────────────

export async function* streamAgent(
  agent_id: string,
  message: string,
  history: Array<{ role: string; content: string }> = []
): AsyncGenerator<{ type: string; content?: string }> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE}/agents/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ agent_id, message, conversation_history: history }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    throw new Error('Agent stream failed');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch { /* ignore */ }
      }
    }
  }
}

// ── Document Analysis streaming ───────────────────────────────────────────────

export async function* streamDocumentAnalysis(
  document_id: string,
  action: string,
  extra_instruction?: string,
  target_language?: string
): AsyncGenerator<{ type: string; content?: string; result?: string; message?: string }> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE}/documents/analyze/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ document_id, action, extra_instruction, target_language }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    const err = await response.json().catch(() => ({ detail: 'Analysis stream error' }));
    throw new Error(err.detail || 'Analysis stream request failed');
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch { /* ignore */ }
      }
    }
  }
}
