// types/index.ts — All TypeScript types for the app

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  email: string;
  username: string;
  full_name?: string;
}

export interface Conversation {
  id: string;
  title: string;
  is_pinned: boolean;
  model_used?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'csv' | 'image';
  file_size: number;
  extracted_text?: string;
  summary?: string;
  created_at: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  is_favorite: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  system_prompt: string;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'needs_token' | 'needs_config' | 'needs_oauth';
  icon: string;
}

export type AnalyzeAction =
  | 'summarize'
  | 'rewrite'
  | 'translate'
  | 'explain'
  | 'questions'
  | 'keypoints'
  | 'ats_score'
  | 'code_explain'
  | 'code_review'
  | 'csv_insights';

export interface ApiError {
  detail: string;
}
