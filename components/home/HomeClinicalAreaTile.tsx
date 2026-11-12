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
export function HomeClinicalAreaTile({ label, description, path, Icon, tone: areaTone, onNavigate }: Props) {
  const primary = path === "/saude/minha-saude";
  // M132: preservar tambem as cores canonicas discretas de fundo e borda.
  // Os tokens sao declarados literalmente pelas areas; nao inventamos paleta.
  const tone = areaTone.split(/\s+/).filter(token => token.startsWith("text-")).join(" ");
  const surface = areaTone.split(/\s+/).filter(token => token.startsWith("border-") || token.startsWith("bg-")).join(" ");
  return (
    <button type="button" onClick={() => onNavigate(path)}
      aria-label={`${label}: ${description}`}
      className={`group flex h-full min-h-[84px] min-[380px]:min-h-[92px] w-full min-w-0 items-start gap-2.5 rounded-[18px] border px-3 py-2.5 text-left shadow-sm transition-[background-color,border-color,transform] hover:bg-surface-raised/55 hover:border-emerald-300/25 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${surface || "border-surface-border/60 bg-surface"} ${primary ? "ring-1 ring-inset ring-emerald-400/15" : ""}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-surface-raised/60 transition-transform motion-safe:group-active:scale-95 ${tone}`} aria-hidden="true"><Icon size={17}/></span>
      <span className="min-w-0 flex-1">
        <strong className="block break-words text-sm font-bold leading-snug text-ink-primary">{label}</strong>
        <span className="mt-1 block line-clamp-2 break-words text-xs leading-relaxed text-ink-muted">{description}</span>
      </span>
    </button>
  );
}
