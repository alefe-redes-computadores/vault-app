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
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ice">
            {icon}
          </span>
        )}

        <h2 className="truncate text-sm font-semibold text-ink-primary">
          {title}
        </h2>
      </div>

      {action}
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
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-surface-border/60 bg-surface p-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            {label}
          </p>

          <div className="min-w-0">{children}</div>
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
    <div className="rounded-[24px] border border-surface-border/60 bg-surface p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-ice">
        {icon}

        <span className="text-[9px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <p className="font-mono text-xl font-bold text-ink-primary">
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