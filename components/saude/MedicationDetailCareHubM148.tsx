"use client";

import { Activity, CalendarClock, ChevronDown, ChevronRight, ClipboardList, FileText, Factory, Package, ShieldCheck } from "lucide-react";
import { ManufacturerBadge } from "@/components/saude/ManufacturerBadge";
import type { MedicationDetailHubViewM148 } from "@/lib/health-intelligence/medication-detail-hub-m148";

/** M148 P2: a compact relational entrance. The original clinical sections stay authoritative. */
export function MedicationDetailCareHubM148({ view, hasRoutine, hasPharmaLens, onOpenSection, onOpenOccurrences }: {
  view: MedicationDetailHubViewM148;
  hasRoutine: boolean;
  hasPharmaLens: boolean;
  onOpenSection: (sectionId: string) => void;
  onOpenOccurrences: () => void;
}) {
  const links = [
    { id: hasRoutine ? "medicamento-rotina" : "medicamento-agora", icon: Activity, ...view.treatment, tone: "text-sky-300" },
    { id: "medicamento-fornecimento", icon: Package, ...view.supply, tone: "text-emerald-300" },
    { id: "medicamento-receita", icon: FileText, ...view.documents, tone: "text-violet-300" },
  ] as const;
  const manufacturerDay = view.manufacturer.latestAcquisitionDate;
  const manufacturerDate = manufacturerDay && /^\d{4}-\d{2}-\d{2}$/.test(manufacturerDay)
    ? manufacturerDay.split("-").reverse().join("/") : null;
  return <section aria-label="Mapa de relações do medicamento" className="rounded-[22px] border border-emerald-300/15 bg-gradient-to-br from-surface-raised/75 via-surface to-violet-400/[.025] p-3 shadow-sm">
    <div className="flex items-start gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] text-emerald-300"><ShieldCheck size={17}/></span>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-ink-primary">Relações deste medicamento</h2><p className="mt-0.5 text-xs leading-relaxed text-ink-muted">Tratamento, fornecimento e receitas com origens separadas. Toque para abrir a seção real.</p></div>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {links.map(({ id, icon: Icon, title, summary, detail, tone }) => <button
        type="button" key={id} onClick={() => onOpenSection(id)}
        className="group flex min-h-16 w-full items-start gap-2.5 rounded-2xl border border-surface-border/65 bg-void/25 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 active:bg-surface-raised/70"
        aria-label={`Abrir ${title}: ${summary}`}>
        <Icon size={17} aria-hidden="true" className={`mt-0.5 shrink-0 ${tone}`}/>
        <span className="min-w-0 flex-1"><strong className="block text-xs font-bold text-ink-primary">{title}</strong><span className="mt-0.5 block text-[11px] font-medium leading-snug text-ink-secondary">{summary}</span><span className="mt-1 block text-[11px] leading-relaxed text-ink-muted">{detail}</span></span>
        <ChevronRight size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-faint"/>
      </button>)}
    </div>
    <details className="group mt-2.5 rounded-xl border border-surface-border/50 bg-void/15 px-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="flex items-center gap-2"><Factory size={15} className="text-violet-300"/> Fabricantes e origem das informações</span><ChevronDown size={15} className="shrink-0 transition-transform group-open:rotate-180"/></summary>
      <div className="space-y-3 border-t border-surface-border/40 pb-3 pt-3 text-xs leading-relaxed text-ink-muted">
        <div><p className="mb-1 font-semibold text-ink-secondary">Etiqueta declarada no cadastro</p>{view.manufacturer.label ? <ManufacturerBadge manufacturer={view.manufacturer.label}/> : <p>Não informada</p>}</div>
        <div><p className="mb-1 font-semibold text-ink-secondary">Fabricante da última aquisição realizada</p>{view.manufacturer.latestAcquisition ? <ManufacturerBadge manufacturer={view.manufacturer.latestAcquisition}/> : <p>{view.manufacturer.hasCompletedAcquisition ? "Não informado no registro da última aquisição" : "Nenhuma aquisição realizada registrada"}</p>}{manufacturerDate ? <p className="mt-1 flex items-center gap-1.5"><CalendarClock size={13}/> Aquisição registrada em {manufacturerDate}</p> : null}</div>
        <p className="rounded-lg border border-amber-300/15 bg-amber-300/[.04] p-2.5">O fabricante da última aquisição não comprova qual embalagem está em uso. A etiqueta é uma informação declarada, não um laudo ou identificação física verificada.</p>
        {hasPharmaLens ? <button type="button" onClick={() => onOpenSection("pharmalens-v7")} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[.045] px-3 text-xs font-semibold text-violet-200">Explorar relatos e trocas de fabricante <ChevronRight size={15}/></button> : null}
      </div>
    </details>
    <p className="mt-2.5 text-[11px] leading-relaxed text-ink-muted">{view.note}</p>
    <button type="button" onClick={onOpenOccurrences} className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-surface-border/55 bg-surface/40 px-3 text-left text-xs font-semibold text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"><span className="flex items-center gap-2"><ClipboardList size={15} className="text-emerald-300"/> Ocorrências, ciclos e vacinas</span><ChevronRight size={15}/></button>
  </section>;
}
