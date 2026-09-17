import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Panel — the base surface of the instrument. A calm, bordered plane rather than
 * a floating, shadowed "card". Panels sit flush in the measurement grid; we use
 * borders and inset backgrounds (not drop shadows) to establish depth.
 */
export function Panel({
  className,
  as: Tag = "div",
  inset,
  raised,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  inset?: boolean;
  raised?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-line",
        inset ? "bg-panel-inset" : raised ? "bg-panel-raised" : "bg-panel",
        className,
      )}
      {...props}
    />
  );
}

/**
 * PanelHeader — a labelled header row for a panel, with the mono eyebrow style
 * used throughout the console. Optional trailing slot for actions/metadata.
 */
export function PanelHeader({
  label,
  children,
  trailing,
  className,
}: {
  label?: string;
  children?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        {label && <div className="hg-eyebrow">{label}</div>}
        {children}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
