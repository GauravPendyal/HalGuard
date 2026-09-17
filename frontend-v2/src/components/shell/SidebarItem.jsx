"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pin, PinOff, Pencil, Archive, Trash2, FolderInput, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/context/ChatContext";
import { CONV_STATUS, VERDICTS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function SidebarItem({ conversation: c, active, onNavigate }) {
  const { projects, updateConversation, deleteConversation, navigate, activePath } = useChat();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commitRename = async () => {
    setEditing(false);
    if (title.trim() && title.trim() !== c.title) await updateConversation(c.id, { title: title.trim() });
    else setTitle(c.title);
  };

  const status = CONV_STATUS[c.status] || CONV_STATUS.reviewing;
  const color = VERDICTS[status.verdict].color;

  return (
    <div
      className={cn("group relative flex items-center rounded-lg pr-1 transition-colors duration-150 hover:bg-hg-sunken", active && "bg-hg-sunken")}
      data-testid={`conversation-item-${c.id}`}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setTitle(c.title); setEditing(false); } }}
          className="w-full rounded-md bg-hg-surface px-2.5 py-[6px] text-[13px] outline-none ring-1 ring-[rgba(var(--accent-rgb),.5)]"
          data-testid="rename-input"
          aria-label="Rename verification"
        />
      ) : (
        <button
          type="button"
          onClick={() => { onNavigate?.(); navigate(`/c/${c.id}`); }}
          className={cn("flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[6px] text-left text-[13px]", active ? "text-hg-text" : "text-hg-text2 group-hover:text-hg-text")}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
          <span className="truncate">{c.title}</span>
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Verification options" data-testid={`conversation-menu-${c.id}`}
            className={cn("hg-icon-btn h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100", active && "opacity-100")}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-52 rounded-xl border-hg-line bg-hg-surface p-1 shadow-hg">
          <DropdownMenuItem onClick={() => { if (typeof window !== "undefined") navigator.clipboard?.writeText(`${window.location.origin}/c/${c.id}`); toast.success("Link copied"); }} className="rounded-lg"><Share2 className="h-3.5 w-3.5" /> Share</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditing(true)} className="rounded-lg" data-testid="menu-rename"><Pencil className="h-3.5 w-3.5" /> Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateConversation(c.id, { pinned: !c.pinned })} className="rounded-lg" data-testid="menu-pin">
            {c.pinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Pin</>}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg"><FolderInput className="h-3.5 w-3.5" /> Move to project</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl border-hg-line bg-hg-surface p-1">
              {projects.length === 0 && <div className="px-2 py-1.5 text-xs text-hg-muted">No projects yet</div>}
              {projects.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => updateConversation(c.id, { project_id: p.id })} className="rounded-lg">{p.name}</DropdownMenuItem>
              ))}
              {c.project_id && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => updateConversation(c.id, { project_id: null })} className="rounded-lg">Remove from project</DropdownMenuItem></>}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator className="bg-hg-line" />
          <DropdownMenuItem onClick={async () => { await updateConversation(c.id, { archived: true }); toast.success("Archived"); if (activePath === `/c/${c.id}`) navigate("/"); }} className="rounded-lg" data-testid="menu-archive"><Archive className="h-3.5 w-3.5" /> Archive</DropdownMenuItem>
          <DropdownMenuItem onClick={() => deleteConversation(c.id, activePath.replace("/c/", ""))} className="rounded-lg text-hg-contradicted focus:text-hg-contradicted" data-testid="menu-delete"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
