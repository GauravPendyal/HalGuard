"use client";
import React, { useState } from 'react';
import { Search, X, MessageSquare, ChevronRight } from 'lucide-react';
import { Conversation } from './types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = conversations.filter((c) => {
    const titleMatch = c.title.toLowerCase().includes(query.toLowerCase());
    const messageMatch = c.messages.some((m) =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );
    return titleMatch || messageMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-gray-200 dark:border-chatgpt-borderDark overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-chatgpt-borderDark/60 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chat titles and messages..."
            className="flex-1 bg-transparent text-sm sm:text-base outline-none text-chatgpt-textLight dark:text-chatgpt-textDark placeholder-gray-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">
              No conversations found matching "{query}"
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-[#171717] shrink-0">
                    <MessageSquare className="w-4 h-4 text-chatgpt-accentGreen" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark truncate">
                      {conv.title}
                    </div>
                    <div className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark truncate">
                      {conv.messages.length} messages
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
