"use client";
import { Bell, BrainCircuit, CalendarDays, ChevronDown, LayoutGrid } from "lucide-react";
import { useDismissibleDetails } from "@/hooks/useDismissibleDetails";

export function HomeSectionNav({hasAttention,hasBrain}:{hasAttention:boolean;hasBrain:boolean}) {
  const detailsRef = useDismissibleDetails();
  const navigateToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    if (detailsRef.current) detailsRef.current.open = false;
    window.requestAnimationFrame(() => target.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
      block: "start",
    }));
  };
  const items=[{id:"home-agora",label:"Agora",icon:CalendarDays},...(hasAttention?[{id:"home-atencao",label:"Atenção",icon:Bell}]:[]),...(hasBrain?[{id:"home-brain",label:"Insight",icon:BrainCircuit}]:[]),{id:"home-organizacao",label:"Organização",icon:LayoutGrid}];
  return <details ref={detailsRef} className="group relative shrink-0">
    <summary aria-label="Explorar áreas da Home" className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1 rounded-xl border border-surface-border/50 bg-surface px-2.5 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice [&::-webkit-details-marker]:hidden">Áreas <ChevronDown size={13} aria-hidden="true" className="transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary>
    <nav aria-label="Áreas da página inicial" className="absolute right-0 top-full z-30 mt-2 grid w-[min(18rem,calc(100vw-2rem))] grid-cols-2 gap-2 rounded-2xl border border-surface-border bg-surface p-2.5 shadow-xl">{items.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={() => navigateToSection(id)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-surface-border/50 bg-surface-raised/30 px-2 text-[10px] font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"><Icon size={14} className="text-ink-muted" aria-hidden="true"/>{label}</button>)}</nav>
  </details>;
}
