"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import { Activity, FlaskConical, Stethoscope } from "lucide-react";
import { MedicationFormatIcon } from "@/components/saude/MedicationFormatIcon";
import { WithdrawalPreparationView } from "@/components/saude/WithdrawalPreparationSummary";
import type { useSupplyOverview } from "@/hooks/useSupplyOverview";
import { presentTodayAppointment, type TodayAppointmentCardItem } from "@/lib/today/appointment-card-presentation";

type MedicationAppearance = { formato?: string | null; cores?: string[] | null } | undefined;
/** Never reads/writes Dexie; caller owns account, person and navigation. */
export const TodayAppointmentCard = memo(function TodayAppointmentCard({item, medication, today, dayLabel, overview, onOpen}: {
  item: TodayAppointmentCardItem;
  medication: MedicationAppearance;
  today: string;
  dayLabel: string;
  overview: ReturnType<typeof useSupplyOverview>;
  onOpen: () => void;
}) {
  const view = presentTodayAppointment(item,today,dayLabel);
  const icon = view.isConsultation ? <Stethoscope size={18} className="text-ice"/> :
    view.isSurgery ? <Activity size={18} className="text-coral"/> :
    view.isWithdrawal ? <MedicationFormatIcon formato={medication?.formato ?? undefined} cores={medication?.cores ?? undefined} size={26}/> :
    <FlaskConical size={18} className="text-emerald-400"/>;
  return <motion.button
    type="button" onClick={onOpen} whileTap={{scale:0.985}}
    aria-label={`${view.label}. ${view.description}. ${view.badge}. Abrir detalhes`}
    className={`w-full rounded-[20px] border p-3.5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice motion-reduce:transform-none ${view.cardClass}`}>
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-sm font-semibold text-ink-primary">{view.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${view.badgeClass}`}>{view.badge}</span>
        </div>
        <span className="mt-1 block break-words text-xs text-ink-muted">{view.description}</span>
        {view.isWithdrawal && item.id ? <WithdrawalPreparationView withdrawalId={item.id} compact overview={overview}/> : null}
      </div>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        {item.horario ? <span className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${view.completed ? "bg-emerald-400/10 text-emerald-400" : "bg-coral/10 text-coral"}`}>{item.horario}</span> : null}
        <span className="rounded-full bg-ice/10 px-2.5 py-1 text-[9px] font-medium text-ice">Ver</span>
      </span>
    </div>
  </motion.button>;
});
