"use client";

import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  description: string;
  path: string;
  Icon: LucideIcon;
  tone: string;
  onNavigate: (path: string) => void;
};

/** R9 R4: presentational tile; navigation/haptics remain owned by Home. */
export function HomeClinicalAreaTile({ label, description, path, Icon, tone, onNavigate }: Props) {
  const primary = path === "/saude/minha-saude";
  return (
    <button type="button" onClick={() => onNavigate(path)}
      aria-label={`${label}: ${description}`}
      className={`flex min-h-[72px] w-full min-w-0 items-center gap-2.5 rounded-2xl border px-2.5 py-2.5 text-left transition-[background-color,transform] active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${tone} ${primary ? "ring-1 ring-inset ring-emerald-400/10" : ""}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/10" aria-hidden="true"><Icon size={17}/></span>
      <span className="min-w-0 flex-1">
        <strong className="block break-words text-[11px] font-semibold leading-tight text-ink-primary">{label}</strong>
        <span className="mt-0.5 block line-clamp-2 break-words text-[9px] leading-snug text-ink-muted">{description}</span>
      </span>
    </button>
  );
}
