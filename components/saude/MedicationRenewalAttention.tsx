"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

type Props = {
  urgent: boolean;
  kind: string | null | undefined;
  message: string;
  cta: string;
  daysRemaining: number | null | undefined;
  onOpen: () => void;
};

/** Display-only alert; the owner, clinical reason and destination come from the detail page. */
export const MedicationRenewalAttention = memo(function MedicationRenewalAttention({
  urgent, kind, message, cta, daysRemaining, onOpen,
}: Props) {
  const title = kind === "receita" ? "Planejamento da receita" : kind === "sus" ? "Próxima retirada" : "Atenção ao estoque";
  const colors = urgent
    ? { panel: "border-coral/30 bg-coral/10", icon: "bg-coral/10 text-coral", text: "text-coral", detail: "text-coral/80", button: "bg-coral text-void" }
    : { panel: "border-amber-400/30 bg-amber-400/10", icon: "bg-amber-400/10 text-amber-400", text: "text-amber-400", detail: "text-amber-400/80", button: "bg-amber-400 text-void" };
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }} className={`rounded-[20px] border p-3.5 ${colors.panel}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`} aria-hidden="true">
          <AlertTriangle size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-bold ${colors.text}`}>{title}</p>
            {daysRemaining != null && Number.isFinite(daysRemaining) && daysRemaining > 0 && daysRemaining <= 30 && (
              <span className={`rounded-lg px-2 py-1 text-[9px] font-bold uppercase ${colors.icon}`}>
                {daysRemaining} dias
              </span>
            )}
          </div>
          <p className={`mt-1 break-words text-xs leading-relaxed ${colors.detail}`}>{message}</p>
          <button type="button" onClick={onOpen}
            className={`mt-3 min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${colors.button}`}>
            {cta}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
