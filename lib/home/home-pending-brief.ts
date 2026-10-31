import { summarizePendingTimeGroups } from "@/lib/health-intelligence/pending-dose-brief";

type PendingItem = {
  medicamentoId: string;
  nome: string;
  data: string;
  horario: string;
  diaLabel: "Hoje" | "Ontem" | "Anterior";
  stockUnavailable?: boolean;
};

/** Read-only clinical communication; does not invent a missed dose or automate intake. */
export function buildHomePendingBrief(items: readonly PendingItem[]) {
  const groups = summarizePendingTimeGroups(items);
  const simultaneous = groups.find(group => group.medications > 1);
  const description = simultaneous
    ? `${simultaneous.medications} medicamentos às ${simultaneous.time} ${simultaneous.dayLabel === "Hoje" ? "hoje" : simultaneous.dayLabel === "Ontem" ? "ontem" : "em dia anterior"}. Revise cada registro separadamente.`
    : "Resolva as pendências da rotina sem sair da Home.";
  return {
    description,
    simultaneousTimes: groups.filter(group => group.medications > 1).length,
    pendingMedicationSlots: items.length,
  };
}
