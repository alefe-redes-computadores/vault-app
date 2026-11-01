"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

type Props = {
  alert: boolean;
  title: string;
  message: string;
  suggestedAction: string;
  confidence?: string | null;
  sample?: number | null;
};

/** Only displays a previously computed observation. It never measures adherence or changes doses. */
export const MedicationBehaviorEvidence = memo(function MedicationBehaviorEvidence({
  alert, title, message, suggestedAction, confidence, sample,
}: Props) {
  const tone = alert ? "text-amber-400" : "text-violet-400";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-[20px] border p-3.5 ${alert ? "border-amber-400/30 bg-amber-400/10" : "border-violet-400/30 bg-violet-400/10"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert ? "bg-amber-400/10" : "bg-violet-400/10"} ${tone}`} aria-hidden="true">
          <Activity size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`break-words text-sm font-bold ${tone}`}>{title}</p>
          <p className="mt-1 break-words text-xs leading-relaxed text-ink-muted">{message}</p>
          <p className="mt-1 break-words text-[10px] text-ink-faint">Sugestão: {suggestedAction}</p>
          {confidence && sample !== undefined && sample !== null && Number.isFinite(sample) && (
            <p className="mt-2 text-[9px] font-medium uppercase tracking-wide text-ink-faint">
              Confiança {confidence} · {sample} registro(s)
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
});
