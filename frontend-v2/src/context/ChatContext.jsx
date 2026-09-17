"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const DEFAULT_SETTINGS = {
  theme: "dark",
  density: "comfortable",
  accent: "default",
  nickname: "",
  customInstructions: "",
  deepVerifyDefault: false,
  showPipeline: false,
  language: "auto",
  dictation: true,
  sendWithEnter: true,
  notifyCompleted: true,
  notifyDigest: false,
};

const ChatContext = createContext(null);

function useStored(key, fallback) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(e);
      }
    }
  }, [key, value]);

  return [value, setValue];
}

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useStored("hg_settings", DEFAULT_SETTINGS);
  const [ui, setUi] = useStored("hg_ui", { collapsed: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [source, setSource] = useState(null);
  const [activePath, setActivePath] = useState("/");

  const navigate = useCallback((path, { replace = false } = {}) => {
    setActivePath(path);
    if (typeof window !== "undefined") {
      if (replace) {
        window.history.replaceState(null, "", path);
      } else {
        window.history.pushState(null, "", path);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActivePath(window.location.pathname);
      const onPopState = () => setActivePath(window.location.pathname);
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [convs, projs] = await Promise.all([api.listConversations(false), api.listProjects()]);
      setConversations(convs || []);
      setProjects(projs || []);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load your verifications");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    root.dataset.density = settings.density;
    root.dataset.accent = settings.accent;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme, settings.density, settings.accent]);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [setSettings]);
  
  const toggleTheme = useCallback(() => {
    if (typeof document === "undefined") return;
    const dark = document.documentElement.classList.contains("dark");
    updateSettings({ theme: dark ? "light" : "dark" });
  }, [updateSettings]);

  const upsertConversation = useCallback((conv) => {
    setConversations((prev) => {
      const { messages, ...rest } = conv;
      const summary = { ...rest, message_count: messages ? messages.length : conv.message_count ?? 0 };
      const exists = prev.some((c) => c.id === conv.id);
      const next = exists ? prev.map((c) => (c.id === conv.id ? { ...c, ...summary } : c)) : [summary, ...prev];
      if (summary.archived) return next.filter((c) => c.id !== conv.id);
      return next.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    });
  }, []);

  const updateConversation = useCallback(async (id, patch) => {
    const conv = await api.updateConversation(id, patch);
    upsertConversation(conv);
    return conv;
  }, [upsertConversation]);

  const deleteConversation = useCallback(async (id, activeId) => {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    toast.success("Verification deleted");
    if (activeId === id) navigate("/");
  }, [navigate]);

  const createProject = useCallback(async (name) => {
    const p = await api.createProject(name);
    setProjects((prev) => [...prev, p]);
    return p;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setConversations((prev) => prev.map((c) => (c.project_id === id ? { ...c, project_id: null } : c)));
  }, []);

  const newVerification = useCallback(() => {
    setMobileOpen(false);
    navigate("/");
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => document.querySelector("[data-testid='composer-textarea']")?.focus());
    }
  }, [navigate]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) { if (e.key === "Escape") setModal(null); return; }
      if (e.key.toLowerCase() === "k") { e.preventDefault(); setModal({ type: "search" }); }
      else if (e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); newVerification(); }
      else if (e.key === "/") { e.preventDefault(); setModal({ type: "shortcuts" }); }
      else if (e.key.toLowerCase() === "b") { e.preventDefault(); setUi((u) => ({ ...u, collapsed: !u.collapsed })); }
      else if (e.key === ",") { e.preventDefault(); setModal({ type: "settings", tab: "general" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newVerification, setUi]);

  const value = useMemo(() => ({
    conversations, projects, settings, updateSettings, toggleTheme,
    collapsed: ui.collapsed, setCollapsed: (v) => setUi((u) => ({ ...u, collapsed: typeof v === "function" ? v(u.collapsed) : v })),
    mobileOpen, setMobileOpen, modal, setModal, source, setSource,
    activePath, navigate,
    refresh, upsertConversation, updateConversation, deleteConversation, createProject, deleteProject, newVerification,
  }), [conversations, projects, settings, updateSettings, toggleTheme, ui.collapsed, setUi, mobileOpen, modal, source, activePath, navigate, refresh, upsertConversation, updateConversation, deleteConversation, createProject, deleteProject, newVerification]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
};
