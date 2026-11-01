import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight, Clock, Moon, Sun, Sunrise, XCircle, Zap } from "lucide-react";
import type { TimelineGroupKey } from "@/lib/today/timeline-summary";
/** R9 R10: immutable visual metadata. The timeline engine still owns which
 * group each dose belongs to, its sequence and its real recorded state.
 */
export const todayTimelineGroupPresentation: Record<TimelineGroupKey, { label: string; sub: string; icon: typeof Clock }> = {
  agora: { label: "Agora", sub: "No horário ou muito próximo dele", icon: Clock },
  atrasadas: { label: "Atrasadas", sub: "Precisam da sua atenção", icon: AlertTriangle },
  depois: { label: "Depois", sub: "Programadas para depois · ainda não estão atrasadas", icon: ChevronRight },
  avulsas: { label: "SOS e extras", sub: "Tomadas fora da rotina programada", icon: Zap },
  revisao: { label: "Revisar dados", sub: "Registros contraditórios não entram nas métricas", icon: AlertOctagon },
  concluidas: { label: "Tomadas", sub: "Doses com tomada registrada hoje", icon: CheckCircle2 },
  ignoradas: { label: "Ignoradas", sub: "Não contam como tomadas", icon: XCircle },
  manha: { label: "Manhã", sub: "Início do dia", icon: Sunrise },
  tarde: { label: "Tarde", sub: "Período da tarde", icon: Sun },
  noite: { label: "Noite", sub: "Final do dia", icon: Moon },
};
