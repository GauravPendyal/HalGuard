"use client";

import { Menu, Sun, Moon, Share2, Settings2, Palette } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/context/ChatContext";
import { CONV_STATUS } from "@/lib/format";
import { StatusPill } from "@/components/chat/StatusPill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function IconAction({ label, onClick, children, testId }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} className="hg-icon-btn" aria-label={label} data-testid={testId}>{children}</button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="rounded-lg border border-hg-line bg-hg-surface text-hg-text shadow-hg">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ChatHeader({ title, status, children }) {
  const { setMobileOpen, setModal, toggleTheme, settings } = useChat();
  const dark = settings.theme === "dark" || (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const meta = status ? CONV_STATUS[status] : null;

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-2 px-3 md:px-5" data-testid="chat-header">
      <button type="button" onClick={() => setMobileOpen(true)} className="hg-icon-btn md:hidden" aria-label="Open sidebar" data-testid="mobile-menu-button"><Menu className="h-[18px] w-[18px]" strokeWidth={1.75} /></button>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {title && <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-hg-text" data-testid="conversation-title">{title}</h1>}
        {meta && <StatusPill verdict={meta.verdict} label={meta.label} testId="conversation-status" />}
        {children}
      </div>
      <div className="flex items-center gap-0.5">
        <IconAction label={dark ? "Light mode" : "Dark mode"} onClick={toggleTheme} testId="theme-toggle">
          {dark ? <Sun className="h-[17px] w-[17px]" strokeWidth={1.75} /> : <Moon className="h-[17px] w-[17px]" strokeWidth={1.75} />}
        </IconAction>
        <IconAction label="Appearance" onClick={() => setModal({ type: "settings", tab: "appearance" })} testId="appearance-button"><Palette className="h-[17px] w-[17px]" strokeWidth={1.75} /></IconAction>
        <IconAction label="Share" testId="share-button" onClick={() => { if (typeof window !== "undefined") navigator.clipboard?.writeText(window.location.href); toast.success("Link copied to clipboard"); }}><Share2 className="h-[17px] w-[17px]" strokeWidth={1.75} /></IconAction>
        <IconAction label="Settings" onClick={() => setModal({ type: "settings", tab: "general" })} testId="settings-button"><Settings2 className="h-[17px] w-[17px]" strokeWidth={1.75} /></IconAction>
      </div>
    </header>
  );
}
