"use client";
import React, { useState } from 'react';
import { X, Moon, Sun, Monitor, Key, Shield, MessageSquare, Check, Sparkles } from 'lucide-react';
import { UserSettings } from './types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'instructions' | 'api'>('general');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(settings.customInstructionsSystem || '');

  if (!isOpen) return null;

  const handleSaveApi = () => {
    onUpdateSettings({ apiKey });
    alert('API Key updated successfully!');
  };

  const handleSaveInstructions = () => {
    onUpdateSettings({ customInstructionsSystem: customPrompt });
    alert('Custom instructions updated!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-gray-200 dark:border-chatgpt-borderDark overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-chatgpt-borderDark/60">
          <h2 className="text-lg font-bold text-chatgpt-textLight dark:text-chatgpt-textDark">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Tabs Navigation */}
          <div className="w-full md:w-48 p-2 border-r border-gray-200 dark:border-chatgpt-borderDark/60 bg-gray-50 dark:bg-[#171717] flex md:flex-col gap-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-colors ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-[#212121] text-chatgpt-textLight dark:text-chatgpt-textDark shadow-xs'
                  : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#212121]/50'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('instructions')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-colors ${
                activeTab === 'instructions'
                  ? 'bg-white dark:bg-[#212121] text-chatgpt-textLight dark:text-chatgpt-textDark shadow-xs'
                  : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#212121]/50'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Custom Instructions</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-colors ${
                activeTab === 'api'
                  ? 'bg-white dark:bg-[#212121] text-chatgpt-textLight dark:text-chatgpt-textDark shadow-xs'
                  : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#212121]/50'
              }`}
            >
              <Key className="w-4 h-4 text-purple-500" />
              <span>API Key</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark mb-3">
                    Theme Selection
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
                        settings.theme === 'light'
                          ? 'border-chatgpt-accentGreen bg-emerald-500/10 text-chatgpt-accentGreen'
                          : 'border-gray-200 dark:border-chatgpt-borderDark text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                      <span>Light</span>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
                        settings.theme === 'dark'
                          ? 'border-chatgpt-accentGreen bg-emerald-500/10 text-chatgpt-accentGreen'
                          : 'border-gray-200 dark:border-chatgpt-borderDark text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      <Moon className="w-5 h-5" />
                      <span>Dark</span>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ theme: 'system' })}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
                        settings.theme === 'system'
                          ? 'border-chatgpt-accentGreen bg-emerald-500/10 text-chatgpt-accentGreen'
                          : 'border-gray-200 dark:border-chatgpt-borderDark text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      <Monitor className="w-5 h-5" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-chatgpt-borderDark/60 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark">
                        Web Search Integration
                      </div>
                      <div className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">
                        Allow ChatGPT to fetch live web data when needed
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.webSearchEnabled}
                      onChange={(e) => onUpdateSettings({ webSearchEnabled: e.target.checked })}
                      className="w-4 h-4 accent-chatgpt-accentGreen cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'instructions' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark mb-1">
                    Custom System Prompt
                  </label>
                  <p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mb-3">
                    What would you like ChatGPT to know about you to provide better responses?
                  </p>
                  <textarea
                    rows={6}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. I am a senior fullstack developer who prefers clean TypeScript and concise code snippets..."
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#2f2f2f] border border-gray-200 dark:border-chatgpt-borderDark text-sm outline-none focus:border-chatgpt-accentGreen text-chatgpt-textLight dark:text-chatgpt-textDark resize-none"
                  />
                </div>
                <button
                  onClick={handleSaveInstructions}
                  className="px-4 py-2 rounded-xl bg-chatgpt-accentGreen hover:bg-chatgpt-accentGreenHover text-white text-sm font-semibold transition-colors"
                >
                  Save Instructions
                </button>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-chatgpt-textLight dark:text-chatgpt-textDark mb-1">
                    OpenAI API Key (Optional)
                  </label>
                  <p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mb-3">
                    Enter your OpenAI API key to make live API calls. If left empty, simulated high-fidelity responses are generated automatically.
                  </p>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="w-full p-3 pr-16 rounded-xl bg-gray-50 dark:bg-[#2f2f2f] border border-gray-200 dark:border-chatgpt-borderDark text-sm outline-none focus:border-chatgpt-accentGreen text-chatgpt-textLight dark:text-chatgpt-textDark"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-3 text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark hover:text-white"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSaveApi}
                  className="px-4 py-2 rounded-xl bg-chatgpt-accentGreen hover:bg-chatgpt-accentGreenHover text-white text-sm font-semibold transition-colors"
                >
                  Save API Key
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
