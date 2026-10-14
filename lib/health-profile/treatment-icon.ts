import { Activity, Brain, HeartPulse, ShieldAlert } from "lucide-react";
/** Icon identity shared with the original Health home treatment cards. */
export function getVaultTreatmentIcon(name: string) {
  const normalized = (name || "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("tdah")) return Brain;
  if (normalized.includes("ansied")) return ShieldAlert;
  if (normalized.includes("dor") || normalized.includes("neuropática") || normalized.includes("depress")) return HeartPulse;
  return Activity;
}
