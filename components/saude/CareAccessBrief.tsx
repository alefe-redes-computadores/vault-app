"use client";

import { BadgeDollarSign, ChevronRight, FileCheck2, FileClock, Landmark } from "lucide-react";
import type { CareDocumentReadinessPortfolio } from "@/lib/health-intelligence/care-document-readiness";

export function CareAccessBrief({portfolio,onNavigate,compact=false}:{portfolio:CareDocumentReadinessPortfolio;onNavigate:(href:string)=>void;compact?:boolean}){
  if(!portfolio.items.length)return null;
  const prescription=portfolio.laneCounts.regulatory_prescription;
  const sus=portfolio.laneCounts.sus_process;
  const purchase=portfolio.laneCounts.purchase_receipt;
  const publicApplicable=sus.available+sus.missing+sus.not_informed;
  const privateApplicable=purchase.available+purchase.not_informed;
  const focus=portfolio.items.find(item=>item.requirements.some(row=>row.status==="missing"));
  const destination=focus?.href||"/saude/registros/relatorio";
  const explicitMissing=portfolio.items.filter(item=>item.requirements.some(row=>row.status==="missing")).length;
  const needsInformation=portfolio.items.filter(item=>item.requirements.some(row=>row.status==="not_informed")&&!item.requirements.some(row=>row.status==="missing")).length;
  return <button type="button" onClick={()=>onNavigate(destination)} className={`w-full rounded-[22px] border text-left ${portfolio.attentionItems?"border-amber-300/25 bg-amber-300/[.045]":"border-cyan-300/15 bg-cyan-300/[.035]"} ${compact?"p-3":"p-4"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300`} aria-label={`Prontidão de receitas, documentos SUS e compras. ${explicitMissing} medicamento(s) com falta documental explícita`}>
    <span className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${portfolio.attentionItems?"bg-amber-300/10 text-amber-300":"bg-cyan-300/10 text-cyan-300"}`}><FileClock size={18}/></span><span className="min-w-0 flex-1"><strong className="block text-xs text-ink-primary">Receitas, SUS e compras</strong><span className="mt-1 block text-[10px] leading-relaxed text-ink-muted">Cada documento mantém sua finalidade; compra não vira retirada e comprovante não vira receita.</span></span><ChevronRight size={15} className="mt-2 shrink-0 text-ink-faint"/></span>
    <span className="mt-3 grid grid-cols-3 gap-1.5">
      <span className="rounded-xl border border-surface-border/60 bg-surface-raised p-2"><span className="flex items-center gap-1 text-[8px] text-violet-200"><FileCheck2 size={11}/>Receita</span><strong className="mt-1 block text-xs text-ink-primary">{prescription.available}</strong><span className="text-[7px] text-ink-faint">disponível · {prescription.not_informed} não informada</span></span>
      <span className="rounded-xl border border-surface-border/60 bg-surface-raised p-2"><span className="flex items-center gap-1 text-[8px] text-emerald-200"><Landmark size={11}/>SUS</span><strong className={`mt-1 block text-xs ${sus.missing?"text-amber-200":"text-ink-primary"}`}>{sus.missing}</strong><span className="text-[7px] text-ink-faint">falta explícita · {publicApplicable} aplicável</span></span>
      <span className="rounded-xl border border-surface-border/60 bg-surface-raised p-2"><span className="flex items-center gap-1 text-[8px] text-rose-200"><BadgeDollarSign size={11}/>Compra</span><strong className="mt-1 block text-xs text-ink-primary">{privateApplicable}</strong><span className="text-[7px] text-ink-faint">rota particular · comprovante opcional</span></span>
    </span>
    <span className="mt-2 block text-[8px] leading-relaxed text-ink-faint">{explicitMissing ? `${explicitMissing} medicamento(s) com falta documental explícita. ` : ""}{needsInformation ? `${needsInformation} com situação documental a informar. ` : ""}{focus?`${focus.medicationName}: há documento do processo para organizar.`:"Nenhuma falta documental explícita nos processos estruturados."}</span>
  </button>;
}
