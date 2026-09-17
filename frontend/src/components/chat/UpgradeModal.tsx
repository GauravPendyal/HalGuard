"use client";
import React from 'react';
import { X, Check, Sparkles, Zap, Users, ShieldAlert } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-[#212121] rounded-3xl shadow-2xl border border-gray-200 dark:border-chatgpt-borderDark overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-chatgpt-borderDark/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-chatgpt-textLight dark:text-chatgpt-textDark">
              Upgrade your plan
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Plan */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-chatgpt-borderDark bg-gray-50 dark:bg-[#171717] flex flex-col justify-between">
            <div>
              <div className="text-base font-bold text-chatgpt-textLight dark:text-chatgpt-textDark">
                Free
              </div>
              <div className="text-2xl font-extrabold mt-2 text-chatgpt-textLight dark:text-chatgpt-textDark">
                $0 <span className="text-xs font-normal text-gray-400">/ month</span>
              </div>
              <p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mt-2">
                For everyday tasks and casual query assistance.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-chatgpt-textLight dark:text-chatgpt-textDark">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Access to GPT-4o mini</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Standard response speed</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <X className="w-4 h-4 shrink-0" />
                  <span>Limited access to GPT-4o</span>
                </li>
              </ul>
            </div>

            <button
              disabled
              className="mt-6 w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-400 cursor-not-allowed"
            >
              Your Current Plan
            </button>
          </div>

          {/* Plus Plan (Highlighted) */}
          <div className="p-5 rounded-2xl border-2 border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col justify-between relative shadow-lg">
            <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-500 text-black font-bold text-[10px] tracking-wider uppercase">
              POPULAR
            </div>
            <div>
              <div className="text-base font-bold text-chatgpt-textLight dark:text-chatgpt-textDark flex items-center gap-1.5">
                <span>Plus</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold mt-2 text-chatgpt-textLight dark:text-chatgpt-textDark">
                $20 <span className="text-xs font-normal text-gray-400">/ month</span>
              </div>
              <p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mt-2">
                Everything in Free, plus advanced AI reasoning & image creation.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-chatgpt-textLight dark:text-chatgpt-textDark">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Unlimited access to GPT-4o</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Access to o1 reasoning models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>DALL-E 3 image generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Advanced Data Analysis & Web Research</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                alert('Upgraded to ChatGPT Plus!');
                onClose();
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-colors shadow-md"
            >
              Get Plus
            </button>
          </div>

          {/* Team Plan */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-chatgpt-borderDark bg-gray-50 dark:bg-[#171717] flex flex-col justify-between">
            <div>
              <div className="text-base font-bold text-chatgpt-textLight dark:text-chatgpt-textDark flex items-center gap-1.5">
                <span>Team</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold mt-2 text-chatgpt-textLight dark:text-chatgpt-textDark">
                $25 <span className="text-xs font-normal text-gray-400">/ user / month</span>
              </div>
              <p className="text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark mt-2">
                For organizations seeking collaboration & privacy security.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-chatgpt-textLight dark:text-chatgpt-textDark">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Everything in Plus</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Higher message limits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Shared workspace & custom GPTs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Admin console & workspace management</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                alert('Selected ChatGPT Team Plan!');
                onClose();
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
            >
              Get Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
