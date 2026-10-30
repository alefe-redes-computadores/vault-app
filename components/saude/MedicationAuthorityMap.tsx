"use client";
import { CalendarClock, ChevronRight, PackageCheck, ReceiptText, ShoppingBag } from "lucide-react";
import type { MedicationPortfolio } from "@/lib/health-intelligence/medication-portfolio";
import type { AccessPortfolio } from "@/lib/health-intelligence/access-portfolio";

export function MedicationAuthorityMap({ portfolio, access, onNavigate }: { portfolio: MedicationPortfolio | null | undefined; access?:AccessPortfolio|null; onNavigate: (href: string) => void }) {
  if (!portfolio?.active) return null;
  const lanes = [
    { label: "Doses e períodos", value: portfolio.temporaryCoursesOpen ? `${portfolio.temporaryCoursesOpen} período(s) em curso` : "Abrir agenda de doses", detail: "Confirmação real no Hoje", href: "/hoje", icon: CalendarClock, tone: "text-violet-200 bg-violet-300/10" },
    { label: "Receitas", value: access?`${access.prescriptions} registro(s) documental(is)`:"Documentos separados", detail: "Receita não é aquisição", href: "/saude/renovacao", icon: ReceiptText, tone: "text-ice bg-ice/10" },
    { label: "Aquisições", value: access?`${access.acquisitions.realized} realizada(s) · ${access.acquisitions.planned} planejada(s)`: `${portfolio.routes.private} rota(s) comprada(s)`, detail: "Planejado não entra no estoque", href: "/saude/renovacao", icon: ShoppingBag, tone: "text-amber-200 bg-amber-300/10" },
    { label: "Retiradas e SUS", value: access?`${access.withdrawals.scheduled} aberta(s) · ${access.withdrawals.realized} realizada(s)`: `${portfolio.routes.public + portfolio.routes.hybrid} rota(s) pública/híbrida`, detail: "Realização exige confirmação", href: "/saude/retiradas", icon: PackageCheck, tone: "text-emerald-200 bg-emerald-300/10" },
  ];
  return <details className="group rounded-[18px] border border-surface-border/60 bg-surface px-3 py-1">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-xs font-semibold text-ink-primary"><PackageCheck size={16} className="text-emerald-300"/><span className="min-w-0 flex-1">Jornada do medicamento · autoridades independentes</span><ChevronRight size={14} className="shrink-0 text-ink-muted transition group-open:rotate-90"/></summary>
    <div className="vault-deferred grid grid-cols-1 gap-2 border-t border-surface-border/50 py-3 min-[390px]:grid-cols-2">{lanes.map(lane => <button key={lane.label} type="button" onClick={() => onNavigate(lane.href)} className="flex min-h-14 items-center gap-2 rounded-xl border border-surface-border/60 bg-surface-raised p-2.5 text-left"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${lane.tone}`}><lane.icon size={15}/></span><span className="min-w-0 flex-1"><strong className="block text-[10px] text-ink-primary">{lane.label}</strong><span className="mt-0.5 block text-[9px] text-ink-muted">{lane.value}</span><span className="block text-[8px] text-ink-faint">{lane.detail}</span></span><ChevronRight size={12} className="shrink-0 text-ink-faint"/></button>)}</div>
    <details className="mb-2 rounded-lg border border-surface-border/60 px-2.5 py-1"><summary className="min-h-10 cursor-pointer py-2 text-[10px] font-semibold text-ink-primary focus-visible:outline focus-visible:outline-2">Entender as etapas da jornada</summary><p className="pb-2 text-[10px] leading-relaxed text-ink-muted">A agenda mostra doses previstas e confirmadas. Receita é registro documental; aquisição pode ser planejada ou realizada; retirada SUS só é concluída com confirmação. Nenhuma etapa confirma automaticamente outra.</p></details><p className="pb-3 text-[9px] leading-relaxed text-ink-muted">Referências de farmácias inspiram lembrete, recorrência e acompanhamento; o Vault mantém essas funções separadas da prescrição e do registro clínico.</p>
  </details>;
}
