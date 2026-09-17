"use client";

import { useState } from "react";
import { Plus, Search, Home, ShieldCheck, FileSearch, History, Library, PanelLeftClose, PanelLeftOpen, FolderPlus, Folder, X, MoreHorizontal, Trash2 } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { groupConversations } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { SidebarItem } from "./SidebarItem";
import { UserMenu } from "./UserMenu";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/verify", label: "Verify", icon: ShieldCheck, action: true },
  { to: "/evidence", label: "Evidence", icon: FileSearch },
  { to: "/history", label: "History", icon: History },
  { to: "/library", label: "Library", icon: Library },
];

function NavItem({ item, collapsed, onNavigate, onAction }) {
  const { activePath, navigate } = useChat();
  const Icon = item.icon;
  const isActive = !item.action && (item.end ? activePath === item.to : activePath.startsWith(item.to));
  const base = "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-[background-color,color] duration-150 hover:bg-hg-sunken hover:text-hg-text focus-visible:outline-2";
  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  );
  const el = item.action ? (
    <button type="button" onClick={onAction} className={cn(base, "w-full text-hg-text2")} data-testid={`nav-${item.label.toLowerCase()}`}>{inner}</button>
  ) : (
    <button type="button" onClick={() => { onNavigate?.(); navigate(item.to); }} data-testid={`nav-${item.label.toLowerCase()}`}
      className={cn(base, "w-full text-left", isActive ? "bg-hg-sunken text-hg-text font-medium before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-hg-accent" : "text-hg-text2")}>
      {inner}
    </button>
  );
  if (!collapsed) return el;
  return (
    <Tooltip><TooltipTrigger asChild>{el}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip>
  );
}

export function HalluciGuardSidebar() {
  const { conversations, projects, collapsed, setCollapsed, mobileOpen, setMobileOpen, setModal, newVerification, createProject, deleteProject, activePath, navigate } = useChat();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const close = () => setMobileOpen(false);

  const activeId = activePath.startsWith("/c/") ? activePath.replace("/c/", "") : null;

  const handleNewProject = async () => {
    const name = window.prompt("Project name");
    if (name?.trim()) await createProject(name.trim());
  };

  const groups = groupConversations((conversations || []).filter((c) => !c.project_id));

  return (
    <>
      <div onClick={close} aria-hidden="true"
        className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside
        data-testid="sidebar"
        data-collapsed={collapsed}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-hg-line bg-hg-bg transition-[width,transform] duration-200 ease-out md:relative md:translate-x-0",
          collapsed ? "md:w-[72px]" : "md:w-[264px]",
          "w-[280px]", mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex h-14 items-center px-3", collapsed ? "justify-center" : "justify-between pl-4")}>
          <button type="button" onClick={() => { close(); navigate("/"); }} className="flex items-center gap-2.5 text-left" aria-label="HalluciGuard home" data-testid="sidebar-logo">
            <LogoMark size={26} />
            {!collapsed && <Wordmark className="text-[15px]" />}
          </button>
          {!collapsed && (
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={close} className="hg-icon-btn md:hidden" aria-label="Close sidebar" data-testid="sidebar-close"><X className="h-4 w-4" /></button>
              <button type="button" onClick={() => setCollapsed(true)} className="hg-icon-btn hidden md:inline-flex" aria-label="Collapse sidebar" data-testid="sidebar-collapse"><PanelLeftClose className="h-4 w-4" strokeWidth={1.75} /></button>
            </div>
          )}
        </div>
        {collapsed && (
          <button type="button" onClick={() => setCollapsed(false)} className="hg-icon-btn mx-auto mb-1 hidden md:inline-flex" aria-label="Expand sidebar" data-testid="sidebar-expand"><PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} /></button>
        )}

        <div className={cn("px-3", collapsed && "flex flex-col items-center gap-1")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={newVerification} data-testid="new-verification-button"
                className={cn("group flex items-center gap-2 rounded-full border border-hg-line bg-hg-sunken text-[13.5px] font-medium text-hg-text transition-[border-color,background-color,transform] duration-150 hover:border-[rgba(var(--accent-rgb),.5)] active:scale-[.99]",
                  collapsed ? "h-9 w-9 justify-center" : "h-9 w-full justify-center px-3")}>
                <Plus className="h-4 w-4 text-hg-accent transition-transform duration-200 group-hover:rotate-90" strokeWidth={2} />
                {!collapsed && <span>New Verification</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">New Verification</TooltipContent>}
          </Tooltip>
          <button type="button" onClick={() => setModal({ type: "search" })} data-testid="sidebar-search-button"
            className={cn("mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] text-hg-text2 transition-colors hover:bg-hg-sunken hover:text-hg-text", collapsed ? "h-9 w-9 justify-center px-0" : "w-full")}>
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <><span className="flex-1 text-left">Search</span><kbd className="font-mono text-[10px] text-hg-muted">⌘K</kbd></>}
          </button>
        </div>

        <nav className={cn("mt-2 flex flex-col gap-0.5 px-3", collapsed && "items-center")} aria-label="Primary">
          {NAV.map((item) => <NavItem key={item.label} item={item} collapsed={collapsed} onNavigate={close} onAction={newVerification} />)}
        </nav>

        {!collapsed && (
          <div className="mt-3 flex-1 overflow-y-auto px-3 pb-2" data-testid="recent-verifications">
            <div className="mb-1 flex items-center justify-between px-2.5">
              <button type="button" onClick={() => setProjectsOpen((o) => !o)} className="text-[11px] font-medium uppercase tracking-[0.06em] text-hg-muted hover:text-hg-text2" data-testid="projects-toggle">Projects</button>
              <button type="button" onClick={handleNewProject} className="hg-icon-btn h-6 w-6" aria-label="New project" data-testid="new-project-button"><FolderPlus className="h-3.5 w-3.5" strokeWidth={1.75} /></button>
            </div>
            {projectsOpen && (projects || []).map((p) => {
              const isProjActive = activePath === `/projects/${p.id}`;
              return (
                <div key={p.id} className="group flex items-center">
                  <button type="button" onClick={() => { close(); navigate(`/projects/${p.id}`); }} data-testid={`project-${p.id}`}
                    className={cn("flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-[6px] text-left text-[13px] transition-colors hover:bg-hg-sunken", isProjActive ? "bg-hg-sunken text-hg-text" : "text-hg-text2")}>
                    <Folder className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-hg-muted">{(conversations || []).filter((c) => c.project_id === p.id).length}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button type="button" className="hg-icon-btn h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Project options"><MoreHorizontal className="h-3.5 w-3.5" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl border-hg-line bg-hg-surface">
                      <DropdownMenuItem onClick={() => deleteProject(p.id)} className="text-hg-contradicted focus:text-hg-contradicted"><Trash2 className="h-3.5 w-3.5" /> Delete project</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {projectsOpen && projects.length === 0 && <p className="px-2.5 pb-1 text-[12px] text-hg-muted">Group verifications into folders.</p>}

            <div className="mb-1 mt-4 px-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-hg-muted">Recent verifications</div>
            {groups.length === 0 && <p className="px-2.5 text-[12.5px] text-hg-muted">Nothing verified yet.</p>}
            {groups.map(([label, items]) => (
              <div key={label} className="mb-3">
                <div className="px-2.5 pb-1 pt-1 text-[10.5px] font-medium uppercase tracking-[0.05em] text-hg-muted/80">{label}</div>
                <div className="flex flex-col gap-px">
                  {items.map((c) => <SidebarItem key={c.id} conversation={c} active={c.id === activeId} onNavigate={close} />)}
                </div>
              </div>
            ))}
          </div>
        )}
        {collapsed && <div className="flex-1" />}

        <UserMenu collapsed={collapsed} />
      </aside>
    </>
  );
}
