export const VERDICTS = {
  supported: { label: "Supported", color: "var(--supported)", tint: "var(--supported-tint)" },
  contradicted: { label: "Contradicted", color: "var(--contradicted)", tint: "var(--contradicted-tint)" },
  insufficient: { label: "Insufficient evidence", color: "var(--insufficient)", tint: "var(--insufficient-tint)" },
  uncertain: { label: "Uncertain", color: "var(--uncertain)", tint: "var(--uncertain-tint)" },
};

export const CONV_STATUS = {
  verified: { label: "Verified", verdict: "supported" },
  reviewing: { label: "Reviewing", verdict: "insufficient" },
  needs_correction: { label: "Needs correction", verdict: "contradicted" },
};

export const RELATIONSHIPS = {
  supports: { label: "Supports", verdict: "supported" },
  contradicts: { label: "Contradicts", verdict: "contradicted" },
  context: { label: "Context", verdict: "uncertain" },
};

export const USER = {
  name: "Manjunath Reddy",
  email: "manjunath@halluciguard.ai",
  plan: "HalluciGuard Pro",
  initials: "MR",
};

const DAY = 86_400_000;

export function relativeTime(iso) {
  if (!iso) return "Just now";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function groupConversations(conversations = []) {
  const groups = { Pinned: [], Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  const now = Date.now();
  for (const c of conversations) {
    if (c.pinned) { groups.Pinned.push(c); continue; }
    const diff = now - new Date(c.updated_at || Date.now()).getTime();
    if (diff < DAY) groups.Today.push(c);
    else if (diff < 2 * DAY) groups.Yesterday.push(c);
    else if (diff < 7 * DAY) groups["Previous 7 days"].push(c);
    else groups.Older.push(c);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
