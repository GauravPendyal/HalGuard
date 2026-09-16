"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import type { Attachment, Conversation, Message, ModelOption, UserSettings } from './types';
import { AI_MODELS } from './constants/models';
import { createRequest, runVerification } from '@/lib/api/verify';
import { apiGetHistory } from '@/lib/api/client';
import { mapVerification } from '@/lib/api/map';
import type { ConversationTurn, GenerationMode } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthContext';

const CONVERSATIONS_KEY = 'halluciguard.conversations.v1';
const SETTINGS_KEY = 'halluciguard.chat.settings.v1';

function newConversation(modelId: string, title = 'New verification', temporary = false): Conversation {
  const now = Date.now();
  return { id: `${temporary ? 'temp' : 'conv'}-${now}-${Math.random().toString(36).slice(2, 7)}`, title, createdAt: now, updatedAt: now, modelId, messages: [], pinned: false };
}

export function ChatWorkspace() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const abortRef = useRef<AbortController | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AI_MODELS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempChat, setTempChat] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ theme: 'light', webSearchEnabled: true, reasoningEnabled: false, tempChat: false });

  useEffect(() => {
    try {
      const storedConversations = window.localStorage.getItem(CONVERSATIONS_KEY);
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      const parsedConversations = storedConversations ? JSON.parse(storedConversations) as Conversation[] : [];
      const initial = parsedConversations.length ? parsedConversations : [newConversation(AI_MODELS[0].id)];
      setConversations(initial);
      setActiveConversationId(initial[0].id);
      if (storedSettings) setSettings((current) => ({ ...current, ...JSON.parse(storedSettings) }));
    } catch {
      const initial = newConversation(AI_MODELS[0].id);
      setConversations([initial]);
      setActiveConversationId(initial.id);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !token) return;
    let active = true;
    void apiGetHistory(token).then((records) => {
      if (!active || !Array.isArray(records)) return;
      const restored: Conversation[] = records.flatMap((record: Record<string, unknown>) => {
        try {
          const raw = record.result as Parameters<typeof mapVerification>[0];
          if (!raw || typeof raw !== 'object') return [];
          const verification = mapVerification(raw);
          const query = typeof record.query === 'string' ? record.query : 'Previous verification';
          const timestamp = typeof record.created_at === 'string' ? Date.parse(record.created_at) : Date.now();
          const createdAt = Number.isFinite(timestamp) ? timestamp : Date.now();
          return [{
            id: `history-${String(record.id || verification.executionId || createdAt)}`,
            title: query.slice(0, 48),
            createdAt,
            updatedAt: createdAt,
            modelId: 'normal',
            pinned: false,
            messages: [
              { id: `history-user-${String(record.id)}`, role: 'user' as const, content: query, timestamp: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
              { id: `history-assistant-${String(record.id)}`, role: 'assistant' as const, content: verification.answer.final || verification.answer.draft || 'Verification completed.', timestamp: new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), verification },
            ],
          }];
        } catch {
          return [];
        }
      });
      setConversations((current) => {
        const known = new Set(current.map((conversation) => conversation.id));
        return [...current, ...restored.filter((conversation) => !known.has(conversation.id))].sort((a, b) => b.updatedAt - a.updatedAt);
      });
    });
    return () => { active = false; };
  }, [hydrated, token]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations.filter((conversation) => !conversation.id.startsWith('temp-'))));
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
  }, [settings, hydrated]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const activeConversation = useMemo(() => conversations.find((item) => item.id === activeConversationId), [conversations, activeConversationId]);

  const handleNewChat = useCallback(() => {
    const conversation = newConversation(selectedModel.id, 'New verification', tempChat);
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
  }, [selectedModel.id, tempChat]);

  const handleToggleTempChat = useCallback(() => {
    if (!tempChat) {
      const conversation = newConversation(selectedModel.id, 'Temporary verification', true);
      setConversations((current) => [conversation, ...current]);
      setActiveConversationId(conversation.id);
      setTempChat(true);
      return;
    }
    setConversations((current) => {
      const persistent = current.filter((conversation) => !conversation.id.startsWith('temp-'));
      const next = persistent[0] ?? newConversation(selectedModel.id);
      setActiveConversationId(next.id);
      return persistent.length ? persistent : [next];
    });
    setTempChat(false);
  }, [selectedModel.id, tempChat]);

  const handleDeleteConversation = (id: string) => {
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id);
      if (activeConversationId === id) {
        const next = remaining[0] ?? newConversation(selectedModel.id, tempChat ? 'Temporary verification' : 'New verification', tempChat);
        setActiveConversationId(next.id);
        return remaining.length ? remaining : [next];
      }
      return remaining;
    });
  };

  const handleSelectConversation = (id: string) => {
    if (tempChat && !id.startsWith('temp-')) {
      setConversations((current) => current.filter((conversation) => !conversation.id.startsWith('temp-')));
      setTempChat(false);
    }
    setActiveConversationId(id);
  };

  const appendMessage = (conversationId: string, message: Message) => {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, updatedAt: Date.now(), messages: [...conversation.messages, message] } : conversation));
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (isGenerating) return;
    let conversation = activeConversation;
    if (!conversation) {
      conversation = newConversation(selectedModel.id, text.slice(0, 48) || 'New verification');
      setConversations((current) => [conversation!, ...current]);
      setActiveConversationId(conversation.id);
    }
    const conversationId = conversation.id;
    const previousMessages = conversation.messages;
    const userMessage: Message = { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), attachments };
    setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, title: item.messages.length ? item.title : (text.slice(0, 48) || 'New verification'), updatedAt: Date.now(), messages: [...item.messages, userMessage] } : item));

    if (!text.trim()) {
      appendMessage(conversationId, { id: `msg-error-${Date.now()}`, role: 'assistant', content: '', error: 'File-only verification is not enabled yet. Add a question or paste the text you want verified.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      return;
    }

    const history: ConversationTurn[] = previousMessages.filter((message) => message.role === 'user' || message.role === 'assistant').map((message) => ({ role: message.role, content: message.content }));
    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    try {
      const result = await runVerification(
        createRequest(text, { mode: selectedModel.id as GenerationMode, conversationHistory: history }),
        controller.signal,
        tempChat ? null : undefined,
      );
      appendMessage(conversationId, {
        id: `msg-reply-${Date.now()}`,
        role: 'assistant',
        content: result.answer.final || result.answer.draft || 'The pipeline completed without returning answer text.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verification: result,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      appendMessage(conversationId, { id: `msg-error-${Date.now()}`, role: 'assistant', content: '', error: error instanceof Error ? error.message : 'Verification failed.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...(activeConversation?.messages ?? [])].reverse().find((message) => message.role === 'user');
    if (lastUserMessage) void handleSendMessage(lastUserMessage.content, lastUserMessage.attachments ?? []);
  };

  if (!hydrated) return <div className="h-screen w-full bg-[#f7f7f5] dark:bg-[#212121]" />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-chatgpt-lightBg text-chatgpt-textLight dark:bg-chatgpt-darkBg dark:text-chatgpt-textDark">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={(id, title) => setConversations((current) => current.map((item) => item.id === id ? { ...item, title, updatedAt: Date.now() } : item))}
        onPinConversation={(id) => setConversations((current) => current.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item))}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onSignOut={() => void signOut().then(() => router.push('/'))}
        theme={settings.theme}
        onToggleTheme={() => setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}
      />
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Header isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(true)} selectedModel={selectedModel} onSelectModel={setSelectedModel} onNewChat={handleNewChat} onOpenSearch={() => setIsSearchOpen(true)} tempChat={tempChat} onToggleTempChat={handleToggleTempChat} hasMessages={Boolean(activeConversation?.messages.length)} />
        <ChatArea messages={activeConversation?.messages ?? []} isGenerating={isGenerating} onSelectPrompt={(prompt) => void handleSendMessage(prompt, [])} onRegenerate={handleRegenerate} onFeedbackMessage={(messageId, feedback) => setConversations((current) => current.map((conversation) => conversation.id !== activeConversationId ? conversation : { ...conversation, messages: conversation.messages.map((message) => message.id === messageId ? { ...message, feedback: message.feedback === feedback ? null : feedback } : message) }))} />
        <ChatInput onSendMessage={(text, attachments) => void handleSendMessage(text, attachments)} isGenerating={isGenerating} onStopGeneration={() => { abortRef.current?.abort(); setIsGenerating(false); }} webSearchEnabled={true} onToggleWebSearch={() => {}} reasoningEnabled={selectedModel.id === 'stress_test'} onToggleReasoning={() => setSelectedModel((current) => current.id === 'stress_test' ? AI_MODELS[0] : AI_MODELS[1])} />
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={(changes) => setSettings((current) => ({ ...current, ...changes }))} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} conversations={conversations} onSelectConversation={(id) => { handleSelectConversation(id); setIsSearchOpen(false); }} />
    </div>
  );
}
