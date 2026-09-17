"use client";

import { useChat } from "@/context/ChatContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const SHORTCUTS = [
  ["⌘ K", "Search verifications"],
  ["⌘ ⇧ O", "New verification"],
  ["⌘ B", "Toggle sidebar"],
  ["⌘ ,", "Open settings"],
  ["⌘ /", "Keyboard shortcuts"],
  ["Enter", "Send verification"],
  ["⇧ Enter", "New line in composer"],
  ["Esc", "Close dialogs and drawers"],
];

export function ShortcutsModal() {
  const { modal, setModal } = useChat();
  return (
    <Dialog open={modal?.type === "shortcuts"} onOpenChange={(o) => !o && setModal(null)}>
      <DialogContent className="w-[min(460px,92vw)] rounded-[20px] border-hg-line bg-hg-surface p-6 text-hg-text shadow-hg-lg" data-testid="shortcuts-modal">
        <DialogTitle className="text-[16px] font-semibold">Keyboard shortcuts</DialogTitle>
        <DialogDescription className="text-[12.5px] text-hg-text2">Move faster without a mouse.</DialogDescription>
        <ul className="mt-2 divide-y divide-[var(--border)]">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between py-2.5 text-[13.5px]">
              <span className="text-hg-text2">{label}</span>
              <kbd className="rounded-md border border-hg-line bg-hg-sunken px-2 py-0.5 font-mono text-[11px] text-hg-text">{keys}</kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
