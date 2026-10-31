"use client";

import { memo } from "react";
import { CalendarDays, CheckCircle2, Clock3, Pill } from "lucide-react";

type HomeQuickMetricsProps = {
  appointments: number;
  /** Home-owned responsive breakpoint, preserved from the pre-extraction layout (V196). */
  className: string;
  pendingDoses: number;
  medications: number;
  extrasTaken: number;
  onNavigate: (href: string) => void;
  onOpenPending: () => void;
};

/**
 * P10 — Atalhos operacionais da Home: números vêm das autoridades existentes.
 * Não cria dose, não confunde SOS com adesão e não movimenta estoque.
 * Componente isolado para evitar manter quatro cartões dentro da Home pesada.
 */
export const HomeQuickMetrics = memo(function HomeQuickMetrics({
  appointments, className, pendingDoses, medications, extrasTaken, onNavigate, onOpenPending,
}: HomeQuickMetricsProps) {
  const metrics = [
    { key: "agenda", label: "Agenda", value: appointments, Icon: CalendarDays, accent: "text-ice", action: () => onNavigate("/hoje") },
    { key: "pendentes", label: "Pendentes", value: pendingDoses, Icon: Clock3, accent: pendingDoses > 0 ? "text-coral" : "text-emerald-300", action: onOpenPending },
    { key: "medicamentos", label: "Remédios", value: medications, Icon: Pill, accent: "text-emerald-300", action: () => onNavigate("/saude/medicamentos") },
    { key: "extra", label: "SOS / extra", value: extrasTaken, Icon: CheckCircle2, accent: "text-violet-300", action: () => onNavigate("/hoje?focus=doses") },
  ];
  return <nav aria-label="Atalhos de saúde da Home" className={`grid grid-cols-2 border-t border-surface-border/40 ${className}`}>
    {metrics.map(({key,label,value,Icon,accent,action}, index) => (
      <button key={key} type="button" onClick={action}
        aria-label={`${label}: ${value}. ${key === "pendentes" ? "Abrir revisão de doses" : "Abrir seção"}`}
        className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center ${value===0 ? "opacity-70 hover:opacity-100" : ""} transition-colors active:bg-surface-raised/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${index === 0
          ? "border-r border-b border-surface-border/40 min-[380px]:border-b-0"
          : index === 1
            ? "border-b border-surface-border/40 min-[380px]:border-b-0 min-[380px]:border-r"
            : index === 2 ? "border-r border-surface-border/40" : ""}`}>
        <span className="flex min-w-0 items-center justify-center gap-1 text-[10px] leading-tight text-ink-muted"><Icon size={13} aria-hidden="true" className={accent}/><span className="truncate">{label}</span></span>
        <strong className={`font-mono text-base font-bold tabular-nums ${key === "pendentes" && value > 0 ? "text-coral" : "text-ink-primary"}`}>{value}</strong>
      </button>
    ))}
  </nav>;
});
