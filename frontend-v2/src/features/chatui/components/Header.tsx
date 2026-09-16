import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft,
  ChevronDown,
  Sparkles,
  SquarePen,
  Share2,
  Lock,
  Check,
  Search,
  Plus
} from 'lucide-react';
import { ModelOption } from '../types';
import { AI_MODELS } from '../constants/models';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
  tempChat: boolean;
  onToggleTempChat: () => void;
  hasMessages: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  selectedModel,
  onSelectModel,
  onNewChat,
  onOpenSearch,
  tempChat,
  onToggleTempChat,
  hasMessages,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModelIcon = (id: string) => {
    if (id === 'stress_test') return <Lock className="w-4 h-4 text-amber-500" />;
    return <Sparkles className="w-4 h-4 text-chatgpt-accentGreen" />;
  };

  return (
    <header className="h-14 border-b border-chatgpt-borderLight dark:border-chatgpt-borderDark/40 flex items-center justify-between px-3 sticky top-0 z-20 bg-chatgpt-lightBg dark:bg-chatgpt-darkBg">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
            title="Open Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors md:hidden"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-cardDark text-chatgpt-textLight dark:text-chatgpt-textDark font-semibold text-lg transition-colors group"
          >
            <span>{selectedModel.name}</span>
            {selectedModel.badge && (
              <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {selectedModel.badge}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark group-hover:text-chatgpt-textLight dark:group-hover:text-chatgpt-textDark transition-transform duration-200" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-80 bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-xl border border-gray-200 dark:border-chatgpt-borderDark p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-xs font-semibold px-3 py-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Verification mode
              </div>
              <div className="space-y-1">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors ${
                      selectedModel.id === model.id
                        ? 'bg-gray-100 dark:bg-[#383838]'
                        : 'hover:bg-gray-50 dark:hover:bg-[#383838]/60'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 dark:bg-[#212121]">
                      {getModelIcon(model.id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-chatgpt-textLight dark:text-chatgpt-textDark">
                          {model.name}
                        </span>
                        {selectedModel.id === model.id && (
                          <Check className="w-4 h-4 text-chatgpt-accentGreen" />
                        )}
                      </div>
                      <p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mt-0.5 line-clamp-2">
                        {model.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
          title="Search Chats"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Temporary Chat Toggle */}
        <button
          onClick={onToggleTempChat}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            tempChat
              ? 'bg-amber-500/20 text-amber-500 dark:bg-amber-500/25'
              : 'hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark'
          }`}
          title={tempChat ? 'Temporary Chat (Active)' : 'Enable Temporary Chat'}
        >
          <Lock className="w-4 h-4" />
          {tempChat && <span className="text-xs font-semibold hidden sm:inline">Temporary</span>}
        </button>

        {hasMessages && (
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'HalluciGuard verification',
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }
            }}
            className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors"
            title="Share Chat"
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-chatgpt-sidebarHoverLight dark:hover:bg-chatgpt-sidebarHoverDark text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark transition-colors hidden md:block"
          title="New Chat"
        >
          <SquarePen className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
