import { Monitor, Moon, Sun, X } from 'lucide-react';
import type { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }: SettingsModalProps) {
  if (!isOpen) return null;
  const options = [
    { id: 'light' as const, label: 'Light', Icon: Sun },
    { id: 'dark' as const, label: 'Dark', Icon: Moon },
    { id: 'system' as const, label: 'System', Icon: Monitor },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-label="Workspace settings" className="w-full max-w-md rounded-2xl border border-chatgpt-borderLight bg-white p-6 shadow-2xl dark:border-chatgpt-borderDark dark:bg-[#212121]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-bold">Workspace settings</h2><p className="mt-1 text-xs text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Model credentials are configured securely on the HalluciGuard server.</p></div><button type="button" onClick={onClose} aria-label="Close settings" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-[#303030]"><X className="h-5 w-5" /></button></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-chatgpt-textMutedLight dark:text-chatgpt-textMutedDark">Appearance</p>
        <div className="grid grid-cols-3 gap-3">{options.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => onUpdateSettings({ theme: id })} className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-semibold transition ${settings.theme === id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'border-chatgpt-borderLight text-chatgpt-textMutedLight hover:bg-gray-50 dark:border-chatgpt-borderDark dark:text-chatgpt-textMutedDark dark:hover:bg-[#2f2f2f]'}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
      </section>
    </div>
  );
}
