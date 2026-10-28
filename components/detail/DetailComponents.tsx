// components/detail/DetailComponents.tsx
"use client";

import type { ReactNode } from "react";

/* ============================================================
   TIPOS
   ============================================================ */

export interface SectionTitleProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}

export interface DetailInfoRowProps {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  children: ReactNode;
  action?: ReactNode;
}

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  description?: string;
}

/* ============================================================
   SECTION TITLE
   ============================================================ */

export function SectionTitle({
  icon,
  title,
  action,
}: SectionTitleProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2.5 px-1 sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ice">
            {icon}
          </span>
        )}

        <h2 className="min-w-0 break-words text-sm font-semibold leading-snug text-ink-primary">
          {title}
        </h2>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ============================================================
   DETAIL INFO ROW
   ============================================================ */

export function DetailInfoRow({
  icon,
  iconClassName = "bg-ice/10 text-ice",
  label,
  children,
  action,
}: DetailInfoRowProps) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2.5 rounded-[20px] border border-surface-border/60 bg-surface p-3 sm:gap-4 sm:p-4">
      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center sm:gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            {label}
          </p>

          <div className="min-w-0 break-words [overflow-wrap:anywhere]">{children}</div>
        </div>
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

export function StatCard({
  icon,
  label,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="min-w-0 rounded-[20px] border border-surface-border/60 bg-surface p-3.5 shadow-sm sm:p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-ice">
        {icon}

        <span className="text-[9px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <p className="break-words font-mono text-lg font-bold leading-snug text-ink-primary [overflow-wrap:anywhere] sm:text-xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
    </div>
  );
}