"use client";
import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeftClose,
  SquarePen,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Edit2,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Compass,
  Check,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { Conversation } from './types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onPinConversation: (id: string) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  theme: 'dark' | 'light' | 'system';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onPinConversation,
  onOpenSearch,
  onOpenSettings,
  onOpenUpgrade,
  theme,
  onToggleTheme,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const groupConversations = () => {
    const pinned = conversations.filter((c) => c.pinned);
    const unpinned = conversations.filter((c) => !c.pinned);

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const previous7Days: Conversation[] = [];
    const older: Conversation[] = [];

    unpinned.forEach((c) => {
      const diff = now - c.updatedAt;
      if (diff < oneDay) {
        today.push(c);
      } else if (diff < oneDay * 2) {
        yesterday.push(c);
      } else if (diff < oneDay * 7) {
        previous7Days.push(c);
      } else {
        older.push(c);
      }
    });

    return { pinned, today, yesterday, previous7Days, older };
  };

  const { pinned, today, yesterday, previous7Days, older } = groupConversations();

  const renderConversationItem = (conv: Conversation) => {
    const isActive = activeConversationId === conv.id;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
          isActive
            ? 'bg-chatgpt-sidebarHoverLight dark:bg-[#212121] text-chatgpt-textLight dark:text-chatgpt-textDark font-medium'
            : 'text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark hover:bg-chatgpt-sidebarHoverLight/60 dark:hover:bg-[#212121]/50 hover:text-chatgpt-textLight dark:hover:text-chatgpt-textDark'
        }`}
      >
        <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => handleSaveRename(conv.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(conv.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-white dark:bg-black/40 text-chatgpt-textLight dark:text-chatgpt-textDark text-xs px-2 py-1 rounded outline-none border border-chatgpt-accentGreen"
          />
        ) : (
          <span className="flex-1 truncate text-xs sm:text-sm">{conv.title}</span>
        )}

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-1 bg-gradient-to-l from-chatgpt-sidebarLight dark:from-[#171717] via-chatgpt-sidebarLight dark:via-[#171717] to-transparent pl-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPinConversation(conv.id);
              }}
              className="p-1 hover:text-chatgpt-textLight dark:hover:text-white rounded"
              title={conv.pinned ? 'Unpin' : 'Pin chat'}
            >
              <Pin className={`w-3.5 h-3.5 ${conv.pinned ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => handleStartRename(conv, e)}
              className="p-1 hover:text-chatgpt-textLight dark:hover:text-white rounded"
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conv.id);
              }}
              className="p-1 hover:text-red-500 rounded"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-chatgpt-sidebarLight dark:bg-chatgpt-sidebarDark border-r border-chatgpt-borderLight dark:border-chatgpt-borderDark/30 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'
        }`}
      >
        {/* Header */}
        <div className="p-3 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
              title="Search Chats"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={onNewChat}
              className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
              title="New Chat"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Explore GPTs section */}
        <div className="px-2 py-1">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-chatgpt-textLight dark:text-chatgpt-textDark hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark transition-colors font-medium"
          >
            <div className="w-6 h-6 rounded-full bg-chatgpt-accentGreen/15 flex items-center justify-center text-chatgpt-accentGreen">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>New chat</span>
          </button>

          <button
            onClick={onOpenUpgrade}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark hover:text-chatgpt-textLight dark:hover:text-chatgpt-textDark transition-colors"
          >
            <div className="w-6 h-6 rounded-full border border-chatgpt-borderLight dark:border-chatgpt-borderDark flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span>Explore GPTs</span>
          </button>
        </div>

        <div className="my-2 border-t border-chatgpt-borderLight dark:border-chatgpt-borderDark/40" />

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          {pinned.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-3 h-3" /> Pinned
              </div>
              <div className="space-y-0.5 mt-1">{pinned.map(renderConversationItem)}</div>
            </div>
          )}

          {today.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark uppercase tracking-wider">
                Today
              </div>
              <div className="space-y-0.5 mt-1">{today.map(renderConversationItem)}</div>
            </div>
          )}

          {yesterday.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark uppercase tracking-wider">
                Yesterday
              </div>
              <div className="space-y-0.5 mt-1">{yesterday.map(renderConversationItem)}</div>
            </div>
          )}

          {previous7Days.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark uppercase tracking-wider">
                Previous 7 Days
              </div>
              <div className="space-y-0.5 mt-1">{previous7Days.map(renderConversationItem)}</div>
            </div>
          )}

          {older.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark uppercase tracking-wider">
                Older
              </div>
              <div className="space-y-0.5 mt-1">{older.map(renderConversationItem)}</div>
            </div>
          )}
        </div>

        {/* Upgrade Plan Card */}
        <div className="p-2 border-t border-chatgpt-borderLight dark:border-chatgpt-borderDark/40">
          <button
            onClick={onOpenUpgrade}
            className="w-full p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left transition-colors group flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500 text-black font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark">
                  Upgrade Plan
                </div>
                <div className="text-[11px] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">
                  Get GPT-4o, DALL-E & more
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Footer User Profile & Settings */}
        <div className="p-2 border-t border-chatgpt-borderLight dark:border-chatgpt-borderDark/40">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark transition-colors">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-3 flex-1 text-left min-w-0"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                M
              </div>
              <div className="flex-1 truncate">
                <div className="text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark truncate flex items-center gap-1.5">
                  Manjunath Reddy
                </div>
                <div className="text-[11px] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark font-medium">
                  ChatGPT Plus
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2f2f2f] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2f2f2f] text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
