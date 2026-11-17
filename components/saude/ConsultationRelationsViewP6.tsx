"use client";
import type { Consulta,Medicamento } from "@/lib/types";
import { ConsultationComparisonP6P2 } from "@/components/saude/ConsultationComparisonP6P2";
import { ConsultationPreparationP6P2 } from "@/components/saude/ConsultationPreparationP6P2";
import { ConsultationLinkReviewP6P2R2 } from "@/components/saude/ConsultationLinkReviewP6P2R2";
import { ConsultationDocumentsP6P2R2 } from "@/components/saude/ConsultationDocumentsP6P2R2";
import { consultationMedicationEvidenceP6,consultationThreeVoicesP6 } from "@/lib/consultations/consultation-medication-evidence-p6";
import { useRouter } from "next/navigation";
type Props={consultation:Consulta;medications:readonly Medicamento[]};
export function ConsultationRelationsViewP6({consultation,medications}:Props){
 const router=useRouter();const links=consultationMedicationEvidenceP6(consultation,medications);const voices=consultationThreeVoicesP6(consultation);
 return <section aria-label="Relações clínicas comprovadas da consulta" className="space-y-3 rounded-[24px] border border-sky-400/20 bg-sky-400/[.035] p-4">
  <header><h3 className="text-sm font-bold text-sky-200">Vínculos e acompanhamento</h3><p className="mt-1 text-xs leading-relaxed text-ink-muted">Somente medicamentos vinculados expressamente nesta consulta. Compartilhar uma data, médico ou tratamento não comprova vínculo.</p></header>
  <ConsultationPreparationP6P2 consultation={consultation} linkedCount={links.length} onEdit={()=>router.push(`/saude/consultas/editar?id=${encodeURIComponent(consultation.id||"")}`)} />
  <ConsultationComparisonP6P2 consultation={consultation} medications={medications} />
  <ConsultationLinkReviewP6P2R2 consultation={consultation} medications={medications} />
  <ConsultationDocumentsP6P2R2 consultation={consultation} />
  {links.length?<div className="space-y-2">{links.map(link=><button key={link.id} type="button" onClick={()=>router.push(`/saude/medicamentos/detalhes?id=${encodeURIComponent(link.id)}&return_to=${encodeURIComponent(`/saude/consultas/detalhes?id=${consultation.id||""}`)}`)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-surface-border/40 bg-surface px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><span className="min-w-0"><strong className="block text-xs text-ink-primary">{link.nome}</strong><span className="text-[11px] text-ink-muted">{link.dosagem} · vínculo confirmado pelo usuário</span></span><span aria-hidden="true" className="text-sky-200">›</span></button>)}</div>:
    <p className="text-xs text-ink-muted">Nenhum medicamento diretamente vinculado a esta consulta. A ausência de vínculo não significa ausência de tratamento.</p>}
  {([['Relato pessoal',voices.personal],['Orientação relatada do profissional',voices.professional],['Providências / retorno',voices.followUp]] as const).filter(([,v])=>v).map(([label,value])=><div key={label} className="rounded-xl border border-surface-border/35 bg-surface p-3"><p className="text-[11px] font-semibold text-sky-200">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-primary">{value}</p></div>)}
  <p className="text-[11px] leading-relaxed text-ink-muted">Histórico observacional. Anotações não substituem avaliação, receita ou confirmação de um profissional.</p>
  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>router.push('/saude/registros/relatorio')} className="min-h-11 rounded-xl border border-sky-300/25 px-2 text-xs font-semibold text-sky-200">Resumo 30 dias</button><button type="button" onClick={()=>router.push('/saude/minha-saude#meu-avatar')} className="min-h-11 rounded-xl border border-surface-border/50 px-2 text-xs font-semibold text-ink-secondary">Explorar na Fênix</button></div>
 </section>;
}
