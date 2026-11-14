export const BRAIN_ACTIVE_PROBING_FLAG = "vault:m152:brain-active-probing";
export function brainActiveProbingEnabled() {
  if (process.env.NEXT_PUBLIC_BRAIN_ACTIVE_PROBING === "true") return true;
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(BRAIN_ACTIVE_PROBING_FLAG) === "enabled"; } catch { return false; }
}
