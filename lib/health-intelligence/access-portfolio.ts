import type { HealthInsightContext } from "@/lib/health-insights";
import { isFutureAcquisition, isPrescriptionOnly } from "@/lib/health-supply/renewal-event";
import type { CareDocumentReadinessPortfolio } from "./care-document-readiness";

export type AccessPortfolio = {
  processes: { active: number; archived: number };
  cycles: { preparing: number; protocolled: number; authorized: number; closed: number };
  documents: { available: number; explicitMissing: number; notInformed: number };
  prescriptions: number;
  acquisitions: { realized: number; planned: number };
  withdrawals: { scheduled: number; overdue: number; realized: number; unresolved: number };
  note: string;
};

/** Read-only operational portfolio. It never promotes a plan to a real event. */
export function buildAccessPortfolio(context: HealthInsightContext, documents: CareDocumentReadinessPortfolio): AccessPortfolio {
  const today=context.hoje||"", uid=context.userId||"", pid=context.personId;
  const owned=<T extends {user_id?:string;person_id?:string}>(row:T)=>row.person_id===pid&&(!uid||row.user_id===uid);
  const ownedLegacyEvent=<T extends {user_id?:string;person_id?:string}>(row:T)=>owned(row)||(!row.person_id&&Boolean(uid)&&row.user_id===uid);
  const supply=context.fornecimento??{processos:[],ciclos:[],itens:[],documentos:[]};
  const processes=supply.processos.filter(owned), processIds=new Set(processes.map(row=>row.id));
  const cycles=supply.ciclos.filter(row=>owned(row)&&processIds.has(row.processo_id));
  const events=context.renovacoes.filter(ownedLegacyEvent);
  const prescriptions=events.filter(isPrescriptionOnly).length;
  const acquisitions=events.filter(row=>!isPrescriptionOnly(row));
  const withdrawals=context.retiradas.filter(owned);
  const scheduled=withdrawals.filter(row=>row.status==="agendada");
  return {
    processes:{active:processes.filter(row=>row.status==="ativo").length,archived:processes.filter(row=>row.status==="encerrado").length},
    cycles:{preparing:cycles.filter(row=>row.status==="preparando").length,protocolled:cycles.filter(row=>row.status==="protocolado").length,authorized:cycles.filter(row=>row.status==="autorizado").length,closed:cycles.filter(row=>row.status==="encerrado").length},
    documents:{available:documents.counts.available,explicitMissing:documents.counts.missing,notInformed:documents.counts.not_informed},
    prescriptions,
    acquisitions:{realized:acquisitions.filter(row=>!isFutureAcquisition(row,today)).length,planned:acquisitions.filter(row=>isFutureAcquisition(row,today)).length},
    withdrawals:{scheduled:scheduled.length,overdue:scheduled.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.data)&&row.data<today).length,realized:withdrawals.filter(row=>row.status==="realizada").length,unresolved:withdrawals.filter(row=>row.status==="nao_realizada").length},
    note:"Receita, aquisição, retirada e documento de processo são evidências independentes; planejamento e ausência de informação não representam realização ou pendência clínica.",
  };
}
