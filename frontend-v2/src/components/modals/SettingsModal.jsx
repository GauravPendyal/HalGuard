"use client";

import { useEffect, useState } from "react";
import { Settings, Bell, SlidersHorizontal, Palette, Database, Keyboard, User, Monitor, Sun, Moon, Trash2, ArchiveRestore, Download } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/context/ChatContext";
import { api } from "@/lib/api";
import { USER } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { SHORTCUTS } from "./ShortcutsModal";

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "personalization", label: "Personalization", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data controls", icon: Database },
  { id: "keyboard", label: "Keyboard", icon: Keyboard },
  { id: "account", label: "Account", icon: User },
];

function Row({ title, desc, children, testId }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-hg-line py-4 last:border-b-0" data-testid={testId}>
      <div className="min-w-0"><div className="text-[14px] font-medium text-hg-text">{title}</div>{desc && <div className="mt-0.5 text-[12.5px] text-hg-text2">{desc}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented({ value, onChange, options, testId }) {
  return (
    <div className="inline-flex rounded-full border border-hg-line bg-hg-sunken p-0.5" role="radiogroup" data-testid={testId}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} data-testid={`${testId}-${o.value}`}
          className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-150", value === o.value ? "bg-hg-surface text-hg-text shadow-sm" : "text-hg-text2 hover:text-hg-text")}>
          {o.icon && <o.icon className="h-3.5 w-3.5" />}{o.label}
        </button>
      ))}
    </div>
  );
}

function SelectBox({ value, onChange, options, testId }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} className="rounded-lg border border-hg-line bg-hg-surface px-3 py-1.5 text-[13px] text-hg-text outline-none focus:border-hg-accent">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const ACCENTS = [["default", "#6d5ef5"], ["teal", "#2ba49a"], ["coral", "#e0645a"], ["graphite", "#6b7280"]];

export function SettingsModal() {
  const { modal, setModal, settings, updateSettings, refresh, conversations } = useChat();
  const open = modal?.type === "settings";
  const [tab, setTab] = useState("general");
  const [archived, setArchived] = useState([]);
  useEffect(() => { if (open) setTab(modal.tab || "general"); }, [open, modal]);
  useEffect(() => { if (open && tab === "data") api.listConversations(true).then(setArchived).catch(() => {}); }, [open, tab]);

  const set = (k) => (v) => updateSettings({ [k]: v });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setModal(null)}>
      <DialogContent className="max-h-[86vh] w-[min(920px,94vw)] max-w-none overflow-hidden rounded-[20px] border-hg-line bg-hg-surface p-0 text-hg-text shadow-hg-lg" data-testid="settings-modal">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Configure HalluciGuard</DialogDescription>
        <div className="flex h-[min(620px,80vh)] flex-col md:flex-row">
          <aside className="flex shrink-0 gap-1 overflow-x-auto border-b border-hg-line p-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:p-3">
            <div className="hidden px-2.5 pb-2 pt-1 text-[15px] font-semibold md:block">Settings</div>
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} data-testid={`settings-tab-${t.id}`} aria-current={tab === t.id}
                className={cn("flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors", tab === t.id ? "bg-hg-sunken text-hg-text font-medium" : "text-hg-text2 hover:bg-hg-sunken hover:text-hg-text")}>
                <t.icon className="h-4 w-4" strokeWidth={1.75} />{t.label}
              </button>
            ))}
          </aside>
          <section className="flex-1 overflow-y-auto px-6 py-5 md:px-8" data-testid={`settings-panel-${tab}`}>
            <h2 className="mb-1 text-[17px] font-semibold tracking-[-0.01em]">{TABS.find((t) => t.id === tab)?.label}</h2>

            {tab === "general" && (<div>
              <Row title="Language" desc="Interface language for HalluciGuard."><SelectBox value={settings.language} onChange={set("language")} options={["auto", "English", "Deutsch", "Español", "हिन्दी", "日本語"]} testId="setting-language" /></Row>
              <Row title="Send with Enter" desc="Turn off to send with ⌘/Ctrl + Enter and use Enter for new lines."><Switch checked={settings.sendWithEnter} onCheckedChange={set("sendWithEnter")} data-testid="setting-send-enter" /></Row>
              <Row title="Enable dictation" desc="Use voice dictation in the verification composer."><Switch checked={settings.dictation} onCheckedChange={set("dictation")} data-testid="setting-dictation" /></Row>
              <Row title="Deep Verify by default" desc="Run the ReVerifier pass on every new verification."><Switch checked={settings.deepVerifyDefault} onCheckedChange={set("deepVerifyDefault")} data-testid="setting-deep-default" /></Row>
            </div>)}

            {tab === "notifications" && (<div>
              <Row title="Verification completed" desc="Notify when a long-running verification finishes."><Switch checked={settings.notifyCompleted} onCheckedChange={set("notifyCompleted")} data-testid="setting-notify-completed" /></Row>
              <Row title="Weekly evidence digest" desc="A summary of contradicted and corrected claims."><Switch checked={settings.notifyDigest} onCheckedChange={set("notifyDigest")} data-testid="setting-notify-digest" /></Row>
            </div>)}

            {tab === "personalization" && (<div>
              <Row title="Nickname" desc="What should HalluciGuard call you?"><input value={settings.nickname} onChange={(e) => updateSettings({ nickname: e.target.value })} placeholder={USER.name.split(" ")[0]} data-testid="setting-nickname" className="w-44 rounded-lg border border-hg-line bg-hg-surface px-3 py-1.5 text-[13px] outline-none focus:border-hg-accent" /></Row>
              <Row title="Show pipeline details" desc="Expand the agent activity (Detector → Memory) by default."><Switch checked={settings.showPipeline} onCheckedChange={set("showPipeline")} data-testid="setting-show-pipeline" /></Row>
              <div className="py-4">
                <div className="text-[14px] font-medium">Custom instructions</div>
                <div className="mb-2 mt-0.5 text-[12.5px] text-hg-text2">Additional behavior, tone and evidence preferences for verifications.</div>
                <textarea value={settings.customInstructions} onChange={(e) => updateSettings({ customInstructions: e.target.value })} rows={4} data-testid="setting-instructions" placeholder="e.g. Prefer primary sources. Flag claims older than 5 years." className="w-full resize-none rounded-[14px] border border-hg-line bg-hg-surface px-3.5 py-2.5 text-[13.5px] outline-none focus:border-hg-accent" />
              </div>
            </div>)}

            {tab === "appearance" && (<div>
              <Row title="Theme" desc="System follows your OS preference."><Segmented value={settings.theme} onChange={set("theme")} testId="setting-theme" options={[{ value: "system", label: "System", icon: Monitor }, { value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }]} /></Row>
              <Row title="Interface density" desc="Spacing between conversation turns."><Segmented value={settings.density} onChange={set("density")} testId="setting-density" options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} /></Row>
              <Row title="Accent color" desc="Used sparingly for actions and highlights.">
                <div className="flex gap-2" role="radiogroup" data-testid="setting-accent">
                  {ACCENTS.map(([id, hex]) => (
                    <button key={id} type="button" role="radio" aria-checked={settings.accent === id} aria-label={id} onClick={() => updateSettings({ accent: id })} data-testid={`setting-accent-${id}`}
                      className={cn("h-7 w-7 rounded-full border-2 transition-transform hover:scale-105", settings.accent === id ? "border-hg-text" : "border-transparent")} style={{ background: hex }} />
                  ))}
                </div>
              </Row>
            </div>)}

            {tab === "data" && (<div>
              <Row title="Export verifications" desc="Download all conversations as JSON."><button type="button" className="hg-pill" data-testid="export-button" onClick={async () => { const full = await Promise.all((conversations || []).map((c) => api.getConversation(c.id))); const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "halluciguard-export.json"; a.click(); toast.success("Export ready"); }}><Download className="h-3.5 w-3.5" /> Export</button></Row>
              <div className="py-4">
                <div className="text-[14px] font-medium">Archived verifications</div>
                <div className="mt-0.5 text-[12.5px] text-hg-text2">{archived.length ? `${archived.length} archived` : "Nothing archived."}</div>
                <ul className="mt-2 divide-y divide-[var(--border)]" data-testid="archived-list">
                  {archived.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 py-2 text-[13.5px]">
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <button type="button" className="hg-icon-btn h-7 w-7" aria-label="Unarchive" data-testid={`unarchive-${c.id}`} onClick={async () => { await api.updateConversation(c.id, { archived: false }); setArchived((p) => p.filter((x) => x.id !== c.id)); refresh(); toast.success("Restored"); }}><ArchiveRestore className="h-3.5 w-3.5" /></button>
                      <button type="button" className="hg-icon-btn h-7 w-7 hover:text-hg-contradicted" aria-label="Delete" onClick={async () => { await api.deleteConversation(c.id); setArchived((p) => p.filter((x) => x.id !== c.id)); }}><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>)}

            {tab === "keyboard" && (
              <ul className="divide-y divide-[var(--border)]">
                {SHORTCUTS.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between py-3 text-[13.5px]"><span className="text-hg-text2">{label}</span><kbd className="rounded-md border border-hg-line bg-hg-sunken px-2 py-0.5 font-mono text-[11px]">{keys}</kbd></li>
                ))}
              </ul>
            )}

            {tab === "account" && (<div>
              <div className="flex items-center gap-3 py-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[15px] font-semibold text-hg-accent">{USER.initials}</span>
                <div><div className="text-[15px] font-medium">{USER.name}</div><div className="text-[12.5px] text-hg-text2">{USER.email}</div></div>
              </div>
              <Row title="Plan" desc="Unlimited verifications, Deep Verify and evidence export."><span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-medium text-hg-accent">{USER.plan}</span></Row>
              <Row title="Delete account" desc="Permanently remove your account and verification history."><button type="button" className="hg-pill text-hg-contradicted" onClick={() => toast("Account deletion is disabled in this demo")}>Delete</button></Row>
            </div>)}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
