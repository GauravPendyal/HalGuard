export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  name: string;
  type: string; // e.g. 'image/png', 'application/pdf', 'text/plain'
  url?: string;
  size?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  reasoningTime?: string;
  isStreaming?: boolean;
  feedback?: 'like' | 'dislike' | null;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  pinned?: boolean;
  modelId: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  isPro?: boolean;
  tag?: string;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  apiKey?: string;
  customInstructionsSystem?: string;
  customInstructionsUser?: string;
  webSearchEnabled: boolean;
  reasoningEnabled: boolean;
  tempChat: boolean;
}

export interface PromptSuggestion {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  prompt: string;
}
