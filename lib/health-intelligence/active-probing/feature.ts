export const BRAIN_ACTIVE_PROBING_FLAG = "vault:m152:brain-active-probing";
/** M153 P1: flag de build, nao consentimento. Sem override via localStorage. */
export function brainActiveProbingEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_BRAIN_ACTIVE_PROBING !== "true") return false;
  return true;
}
