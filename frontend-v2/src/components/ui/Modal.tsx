"use client";

import * as React from "react";
import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional supporting line under the title. */
  description?: string;
  children: React.ReactNode;
  /** Max width. Defaults to a comfortable dialog. */
  className?: string;
  /** Hide the header entirely (rare — for fully custom content). */
  hideHeader?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  hideHeader,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKey, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Focus the first focusable node, or the panel itself.
    const raf = window.requestAnimationFrame(() => {
      const node =
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
      node?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      document.body.style.overflow = overflow;
      window.cancelAnimationFrame(raf);
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKey]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      aria-hidden={false}
    >
      <div
        className="absolute inset-0 bg-canvas-sunken/80 backdrop-blur-[2px] [animation:hg-rise_0.15s_ease]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md rounded-lg border border-line-strong bg-panel-raised shadow-[0_24px_60px_rgba(0,0,0,0.6)] outline-none [animation:hg-rise_0.2s_var(--ease-signal)]",
          className,
        )}
      >
        {!hideHeader && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-display font-medium text-ink">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[13px] leading-snug text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 shrink-0 rounded-sm p-1 text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
