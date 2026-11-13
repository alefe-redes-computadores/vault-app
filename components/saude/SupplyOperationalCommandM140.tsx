"use client";

import { CalendarCheck2, ChevronRight, ClipboardCheck, FileText, FolderClock, Link2Off, PackageCheck } from "lucide-react";
import type { SupplyOperationalSnapshotM140 } from "@/lib/health-supply/operational-snapshot-m140";

const fmt = (date: string) => date.split("-").reverse().join("/");
const stage: Record<string, string> = {
  preparando: "Documentação em preparação",
  protocolado: "Protocolado · aguardando análise",
  autorizado: "Autorização registrada no ciclo",
  encerrado: "Ciclo encerrado no histórico",
};

/** M140: contexto e ações explícitas. Nenhum botão cria retirada, documento ou autorização. */
export function SupplyOperationalCommandM140({
  snapshot, onReviewWithdrawal, onOpenDocuments, onOpenCycle,
}: {
  snapshot: SupplyOperationalSnapshotM140;
  onReviewWithdrawal: (id: string) => void;
  onOpenDocuments: () => void;
  onOpenCycle: () => void;
}) {
  const last = snapshot.lastRealized;
  const unlinked = snapshot.unlinkedWithdrawals;
  const cycle = snapshot.selectedCycle;
  return <section aria-label="Situação operacional confirmada do fornecimento" className="box-border w-full min-w-0 max-w-full space-y-2.5 rounded-[20px] border border-emerald-400/20 bg-emerald-400/[.035] p-3 [overflow-wrap:anywhere]">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <PackageCheck size={19} className="shrink-0 text-emerald-300" aria-hidden="true"/>
      <h2 className="text-sm font-bold text-ink-primary">Situação do fornecimento</h2>
      <span className="ml-auto shrink-0 text-[11px] font-medium text-ink-muted">{snapshot.processStatus === "ativo" ? "Em andamento" : "Arquivado"}</span>
    </div>
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface/60 p-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-bold text-ink-secondary"><CalendarCheck2 size={15} aria-hidden="true"/>Retirada realizada</div>
        <p className="mt-1 text-sm font-semibold text-ink-primary">{last ? fmt(last.data) : "Nenhuma vinculada"}</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-muted">{last ? "Confirmada no registro da retirada; não comprova autorização do ciclo." : "Uma retirada já cadastrada pode estar sem vínculo. Confira abaixo."}</p>
      </div>
      <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface/60 p-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-bold text-ink-secondary"><FolderClock size={15} aria-hidden="true"/>Ciclo selecionado</div>
        <p className="mt-1 text-sm font-semibold text-ink-primary">{cycle ? stage[cycle.status] : "Nenhum ciclo registrado"}</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-muted">{cycle?.inicio && cycle?.fim ? `${fmt(cycle.inicio)} a ${fmt(cycle.fim)} · período cadastrado` : "Período não confirmado no cadastro"}</p>
      </div>
    </div>
    {snapshot.nextScheduled && <p className="flex items-center gap-2 text-[11px] leading-snug text-ink-muted"><CalendarCheck2 size={14} className="shrink-0"/>Próxima retirada agendada e vinculada: <strong className="text-ink-primary">{fmt(snapshot.nextScheduled.data)}</strong> · não é realização</p>}
    {unlinked.length > 0 && <div role="status" className="min-w-0 rounded-xl border border-amber-300/30 bg-amber-300/[.065] p-2.5">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-200"><Link2Off size={16} aria-hidden="true"/>{unlinked.length} retirada(s) SUS já cadastrada(s), sem vínculo com processo/ciclo</div>
      <p className="mt-1 text-xs font-semibold text-ink-primary">Registro existente: {unlinked[0].status === "realizada" ? "retirada realizada" : "retirada agendada"} em {fmt(unlinked[0].data)} · vínculo pendente de conferência.</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">Pode haver retirada realizada no histórico mesmo quando a situação acima mostra “Nenhuma vinculada”. Verifique o registro antes de cadastrar outra. Selecionar não modifica dados.</p>
      {snapshot.hasAmbiguousMedicationProcess && <p className="mt-1 text-[11px] font-semibold text-amber-200">Há possível associação com mais de um processo: confirme qual vínculo é correto.</p>}
      <button type="button" onClick={() => onReviewWithdrawal(unlinked[0].id!)} className="mt-2 flex min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 break-words rounded-xl border border-amber-300/20 bg-surface px-3 py-2 text-left text-xs font-semibold text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Conferir retirada existente · {fmt(unlinked[0].data)} <ChevronRight size={16}/></button>
    </div>}
    {snapshot.processStatus === "ativo" && snapshot.origin !== "comprado" && <div className="min-w-0 rounded-xl border border-surface-border/50 bg-surface/50 p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-ink-primary"><ClipboardCheck size={16} className="text-emerald-300" aria-hidden="true"/>Próxima providência</div>
      {snapshot.pendingCycle ? <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">Já existe ciclo em {snapshot.pendingCycle.status === "preparando" ? "preparação" : "análise"}. Continue esse ciclo; não crie outro.</p> : <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">Você pode preparar outro ciclo quando for necessário. A decisão não é inferida pela data de uma retirada.</p>}
      <button type="button" onClick={onOpenCycle} className="mt-2 flex min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 break-words rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-left text-xs font-bold text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">{snapshot.pendingCycle ? "Revisar planejamento de ciclos" : "Preparar outro ciclo / renovação"}<ChevronRight size={16}/></button>
      <p className="mt-1 text-[10px] leading-snug text-ink-muted">Abrir o planejamento não agenda retirada, concede autorização nem altera tratamento.</p>
    </div>}
    <div className="min-w-0 rounded-xl border border-violet-300/20 bg-violet-300/[.035] p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-ink-primary"><FileText size={16} className="text-violet-300" aria-hidden="true"/>Documentos que você já cadastrou</div>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{snapshot.availableDocuments} arquivo(s) no acervo de Saúde · {snapshot.relatedDocumentCount} com referência a medicamento deste processo · {snapshot.cycleDocuments} vínculo(s) neste ciclo.</p>
      <p className="mt-1 text-[11px] leading-snug text-ink-muted">Arquivo existente não confirma exigência cumprida, validade, entrega ou elegibilidade.</p>
      {cycle && <button type="button" onClick={onOpenDocuments} className="mt-2 flex min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 break-words rounded-xl border border-violet-300/25 bg-surface px-3 py-2 text-left text-xs font-semibold text-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"><span>{snapshot.hasUnlinkedDocuments ? "Conferir e reutilizar documentos existentes" : "Consultar documentos do ciclo"}</span><ChevronRight size={16}/></button>}
    </div>
  </section>;
}
