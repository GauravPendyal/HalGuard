"use client";

import { ChevronsUpDown, Sparkles, SlidersHorizontal, Settings, Keyboard, HelpCircle, LogOut, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/context/ChatContext";
import { USER } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function UserMenu({ collapsed }) {
  const { setModal, settings, toggleTheme } = useChat();
  const dark = settings.theme === "dark" || (settings.theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const name = settings.nickname || USER.name;

  return (
    <div className="border-t border-hg-line p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" data-testid="user-menu-trigger" aria-label="Account menu"
            className={cn("flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-hg-sunken data-[state=open]:bg-hg-sunken", collapsed && "justify-center")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-semibold text-hg-accent">{USER.initials}</span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-hg-text" data-testid="user-name">{name}</span>
                  <span className="block truncate text-[11px] text-hg-muted">{USER.plan}</span>
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-hg-muted" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-60 rounded-xl border-hg-line bg-hg-surface p-1 shadow-hg" data-testid="user-menu">
          <div className="px-2.5 py-2">
            <div className="text-[13px] font-medium text-hg-text">{name}</div>
            <div className="text-[11.5px] text-hg-muted">{USER.email}</div>
          </div>
          <DropdownMenuSeparator className="bg-hg-line" />
          <DropdownMenuItem onClick={() => toast("You're already on HalluciGuard Pro", { description: "Unlimited deep verifications included." })} className="rounded-lg"><Sparkles className="h-3.5 w-3.5 text-hg-accent" /> Upgrade plan</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModal({ type: "settings", tab: "personalization" })} className="rounded-lg" data-testid="user-menu-personalization"><SlidersHorizontal className="h-3.5 w-3.5" /> Personalization</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModal({ type: "settings", tab: "general" })} className="rounded-lg" data-testid="user-menu-settings"><Settings className="h-3.5 w-3.5" /> Settings<DropdownMenuShortcut>⌘,</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} className="rounded-lg" data-testid="user-menu-theme">{dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />} {dark ? "Light mode" : "Dark mode"}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setModal({ type: "shortcuts" })} className="rounded-lg"><Keyboard className="h-3.5 w-3.5" /> Keyboard shortcuts<DropdownMenuShortcut>⌘/</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast("Help center", { description: "Docs and support are coming soon." })} className="rounded-lg"><HelpCircle className="h-3.5 w-3.5" /> Help</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-hg-line" />
          <DropdownMenuItem onClick={() => toast("Signed out (demo)", { description: "Authentication is not wired in this build." })} className="rounded-lg"><LogOut className="h-3.5 w-3.5" /> Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
