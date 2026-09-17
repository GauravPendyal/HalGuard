"use client";

import { Pin, Folder, FolderPlus } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { PageFrame, ConversationRow } from "./HistoryPage";

export default function LibraryPage() {
  const { conversations, projects, createProject, activePath, navigate } = useChat();
  
  const projectId = activePath.startsWith("/projects/") ? activePath.replace("/projects/", "") : null;
  const project = (projects || []).find((p) => p.id === projectId);

  if (projectId) {
    const list = (conversations || []).filter((c) => c.project_id === projectId);
    return (
      <PageFrame eyebrow="Project" title={project?.name || "Project"} testId="project-page">
        <div className="mt-6 divide-y divide-[var(--border)]">
          {list.map((c) => <ConversationRow key={c.id} c={c} onClick={() => navigate(`/c/${c.id}`)} />)}
          {list.length === 0 && <p className="py-10 text-center text-[13.5px] text-hg-muted">Move verifications here from the sidebar menu.</p>}
        </div>
      </PageFrame>
    );
  }

  const pinned = (conversations || []).filter((c) => c.pinned);
  return (
    <PageFrame eyebrow="Library" title="Saved verifications" testId="library-page">
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-hg-muted"><Pin className="h-3 w-3" /> Pinned</h2>
        <div className="divide-y divide-[var(--border)]">
          {pinned.map((c) => <ConversationRow key={c.id} c={c} onClick={() => navigate(`/c/${c.id}`)} />)}
          {pinned.length === 0 && <p className="py-6 text-[13.5px] text-hg-muted">Pin a verification from the sidebar to keep it here.</p>}
        </div>
      </section>
      <section className="mt-10">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-hg-muted"><Folder className="h-3 w-3" /> Projects</h2>
          <button type="button" className="hg-pill" data-testid="library-new-project" onClick={async () => { const n = window.prompt("Project name"); if (n?.trim()) await createProject(n.trim()); }}><FolderPlus className="h-3 w-3" /> New project</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(projects || []).map((p) => (
            <button key={p.id} type="button" onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center gap-3 rounded-[14px] border border-hg-line bg-hg-surface px-4 py-3 text-left transition-[border-color,transform] hover:-translate-y-px hover:border-[rgba(var(--accent-rgb),.5)]" data-testid={`library-project-${p.id}`}>
              <Folder className="h-4 w-4 text-hg-accent" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-hg-text">{p.name}</span>
              <span className="font-mono text-[11px] text-hg-muted">{(conversations || []).filter((c) => c.project_id === p.id).length}</span>
            </button>
          ))}
          {projects.length === 0 && <p className="text-[13.5px] text-hg-muted">No projects yet.</p>}
        </div>
      </section>
    </PageFrame>
  );
}
