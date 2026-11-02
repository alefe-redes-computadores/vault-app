import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import type { TodayTimelineItem } from "@/lib/today/build-timeline-items";

type DoseStatusContext = {
  item: TodayTimelineItem;
  isPrevistoFuturo: boolean;
  isHistoricoSemConfirmacao: boolean;
  isAtrasado: boolean;
  isProximo: boolean;
};
type DoseStatusPresentation = {statusIcon:ReactNode;statusText:string;statusColor:string};

/** Visual label only. Authority remains in the canonical timeline item. */
export function describeTodayDoseStatus({item,isPrevistoFuturo,isHistoricoSemConfirmacao,isAtrasado,isProximo}:DoseStatusContext):DoseStatusPresentation {
  if(item.isDataConflict) return {statusIcon:<AlertOctagon size={12} className="text-amber-300"/>,statusText:"Revisar registros",statusColor:"text-amber-300"};
  if(item.tomada) return {statusIcon:<CheckCircle2 size={12} className="text-emerald-400"/>,statusText:item.isAvulsa?"Tomada · Avulsa":"Tomada",statusColor:"text-emerald-400"};
  if(item.ignorada) return {statusIcon:<XCircle size={12} className="text-ink-muted"/>,statusText:"Ignorada",statusColor:"text-ink-muted"};
  if(isPrevistoFuturo) return {statusIcon:<Clock size={12} className="text-violet-300"/>,statusText:"Prevista",statusColor:"text-violet-300"};
  if(isHistoricoSemConfirmacao) return {statusIcon:<Clock size={12} className="text-ice"/>,statusText:"Sem confirmação",statusColor:"text-ice"};
  if(isAtrasado) return {statusIcon:<AlertTriangle size={12} className="text-coral"/>,statusText:"Atrasado",statusColor:"text-coral"};
  if(isProximo) return {statusIcon:<Clock size={12} className="text-amber-400"/>,statusText:"Próximo",statusColor:"text-amber-400"};
  return {statusIcon:<Circle size={12} className="text-ink-faint"/>,statusText:item.horario,statusColor:"text-ink-faint"};
}
