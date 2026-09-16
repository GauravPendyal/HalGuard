import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Code,
  BarChart2,
  Mail,
  Lightbulb,
  FileText,
  Brain,
  ChevronDown,
  User,
  Paperclip
} from 'lucide-react';
import { Message, PromptSuggestion } from '../types';
import { PROMPT_SUGGESTIONS } from '../constants/prompts';
import type { VerificationResult, Verdict } from '@/lib/api/types';

const verdictTone: Record<Verdict, string> = {
  verified: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  contradicted: 'border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300',
  conflicted: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  unverified: 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

function VerificationCard({ result }: { result: VerificationResult }) {
  const verdict = result.overallVerdict ?? 'unverified';
  const agentNames = result.trace.length
    ? Array.from(new Set(result.trace.map((event) => event.node).filter(Boolean)))
    : result.activeAgents;
  const evidence = result.claims.flatMap((claim) => claim.evidence).filter((item) => item.url);
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-chatgpt-borderLight bg-white/80 shadow-sm dark:border-chatgpt-borderDark dark:bg-[#242424]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-chatgpt-borderLight px-4 py-3 dark:border-chatgpt-borderDark">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Evidence verdict</p><p className="mt-0.5 text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">{result.executionId ? `Run ${result.executionId.slice(0, 12)}` : 'Completed run'}</p></div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${verdictTone[verdict]}`}>{verdict}</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div><p className="mb-2 text-xs font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Agent trace</p><div className="flex flex-wrap gap-1.5">{agentNames.map((name) => <span key={name} className="rounded-full border border-chatgpt-borderLight bg-gray-50 px-2 py-1 text-[11px] capitalize dark:border-chatgpt-borderDark dark:bg-[#1b1b1b]">{name.replaceAll('_', ' ')}</span>)}</div></div>
        <div><p className="mb-2 text-xs font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Run facts</p><p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">{result.claims.length} claim{result.claims.length === 1 ? '' : 's'} · {evidence.length} linked source{evidence.length === 1 ? '' : 's'}{result.totalLatencyMs != null ? ` · ${Math.round(result.totalLatencyMs)} ms` : ''}</p></div>
      </div>
      {result.claims.length > 0 && <div className="border-t border-chatgpt-borderLight px-4 py-3 dark:border-chatgpt-borderDark"><p className="mb-2 text-xs font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Claims</p><div className="space-y-2">{result.claims.map((claim) => <div key={claim.id} className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-[#1b1b1b]"><div className="flex items-start justify-between gap-3"><p className="font-medium">{claim.text || 'Claim'}</p><span className="shrink-0 uppercase text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">{claim.verdict || 'unreported'}</span></div>{claim.explanation && <p className="mt-1 text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">{claim.explanation}</p>}</div>)}</div></div>}
      {evidence.length > 0 && <div className="border-t border-chatgpt-borderLight px-4 py-3 dark:border-chatgpt-borderDark"><p className="mb-2 text-xs font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Sources</p><div className="space-y-1.5">{evidence.slice(0, 6).map((item) => <a key={item.id} href={item.url || '#'} target="_blank" rel="noreferrer" className="block truncate text-xs text-emerald-700 underline decoration-emerald-500/30 underline-offset-2 hover:decoration-emerald-500 dark:text-emerald-300">{item.title || item.source || item.url}</a>)}</div></div>}
    </section>
  );
}

interface ChatAreaProps {
  messages: Message[];
  isGenerating: boolean;
  onSelectPrompt: (promptText: string) => void;
  onRegenerate: () => void;
  onFeedbackMessage: (id: string, type: 'like' | 'dislike') => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isGenerating,
  onSelectPrompt,
  onRegenerate,
  onFeedbackMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (code: string, codeId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(codeId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSpeak = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingId(id);
      }
    }
  };

  const getPromptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code':
        return <Code className="w-5 h-5 text-amber-500" />;
      case 'BarChart2':
        return <BarChart2 className="w-5 h-5 text-blue-500" />;
      case 'Mail':
        return <Mail className="w-5 h-5 text-emerald-500" />;
      case 'Lightbulb':
        return <Lightbulb className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-chatgpt-accentGreen" />;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
        {/* HalluciGuard empty-state hero */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-[#2f2f2f] shadow-lg border border-chatgpt-borderLight dark:border-chatgpt-borderDark flex items-center justify-center text-chatgpt-textLight dark:text-white">
            <Sparkles className="w-9 h-9 text-chatgpt-accentGreen" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-chatgpt-textLight dark:text-chatgpt-textDark">
            What can I help with today?
          </h1>
        </div>

        {/* Prompt Suggestion Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
          {PROMPT_SUGGESTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-4 rounded-2xl border border-chatgpt-borderLight dark:border-chatgpt-borderDark/60 bg-white dark:bg-[#2f2f2f]/40 hover:bg-gray-50 dark:hover:bg-[#2f2f2f] text-left transition-all hover:scale-[1.01] shadow-xs group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-[#212121] group-hover:scale-105 transition-transform">
                  {getPromptIcon(item.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark">
                    {item.title}
                  </div>
                  <div className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={msg.id || idx}
            className={`flex items-start gap-3 md:gap-4 ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            {isUser ? (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                M
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#2f2f2f] border border-chatgpt-borderLight dark:border-chatgpt-borderDark text-chatgpt-accentGreen flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            {/* Content Bubble */}
            <div className={`flex-1 max-w-[85%] sm:max-w-[80%] ${isUser ? 'text-right' : ''}`}>
              <div
                className={`inline-block text-left text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gray-100 dark:bg-[#2f2f2f] text-chatgpt-textLight dark:text-chatgpt-textDark px-4 py-3 rounded-3xl rounded-tr-xs shadow-xs'
                    : 'text-chatgpt-textLight dark:text-chatgpt-textDark w-full'
                }`}
              >
                {/* Reasoned details header if applicable */}
                {msg.reasoningTime && (
                  <div className="mb-3 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span>Thought for {msg.reasoningTime} seconds</span>
                  </div>
                )}

                {/* Attachments preview */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-[#212121] text-xs"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-chatgpt-accentGreen" />
                        <span className="font-medium truncate max-w-[140px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Markdown content */}
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="max-w-none text-sm leading-relaxed space-y-3">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeString = String(children).replace(/\n$/, '');
                          const codeId = `${msg.id}-${Math.random()}`;

                          if (!inline && match) {
                            return (
                              <div className="my-4 rounded-xl overflow-hidden border border-chatgpt-borderLight dark:border-chatgpt-borderDark bg-[#1e1e1e] text-gray-100 shadow-md">
                                <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e] text-xs text-gray-400 font-mono">
                                  <span>{match[1]}</span>
                                  <button
                                    onClick={() => handleCopyCode(codeString, codeId)}
                                    className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors"
                                  >
                                    {copiedCodeId === codeId ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-green-400" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy code</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed font-mono">
                                  <code>{children}</code>
                                </pre>
                              </div>
                            );
                          }
                          return (
                            <code
                              className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#2f2f2f] text-chatgpt-accentGreen text-xs font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.verification && <VerificationCard result={msg.verification} />}
                    {msg.error && <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{msg.error}</p>}
                  </div>
                )}
              </div>

              {/* Message toolbar for Assistant */}
              {!isUser && (
                <div className="flex items-center gap-1 mt-2 text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">
                  <button
                    onClick={() => handleCopyText(msg.content, msg.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2f2f2f] hover:text-chatgpt-textLight dark:hover:text-white transition-colors"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSpeak(msg.content, msg.id)}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors ${
                      speakingId === msg.id ? 'text-chatgpt-accentGreen' : ''
                    }`}
                    title="Read aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onFeedbackMessage(msg.id, 'like')}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors ${
                      msg.feedback === 'like' ? 'text-green-500' : ''
                    }`}
                    title="Good response"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onFeedbackMessage(msg.id, 'dislike')}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors ${
                      msg.feedback === 'dislike' ? 'text-red-500' : ''
                    }`}
                    title="Bad response"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>

                  {idx === messages.length - 1 && (
                    <button
                      onClick={onRegenerate}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2f2f2f] hover:text-chatgpt-textLight dark:hover:text-white transition-colors"
                      title="Regenerate response"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Generating pulse state */}
      {isGenerating && (
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#2f2f2f] border border-chatgpt-borderLight dark:border-chatgpt-borderDark text-chatgpt-accentGreen flex items-center justify-center shrink-0 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 py-2">
            <div className="w-2 h-2 rounded-full bg-chatgpt-accentGreen animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-chatgpt-accentGreen animate-bounce delay-100" />
            <div className="w-2 h-2 rounded-full bg-chatgpt-accentGreen animate-bounce delay-200" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
