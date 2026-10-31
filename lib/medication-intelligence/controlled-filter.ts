import type { MedicationRegulatoryVisual } from "@/lib/medication-regulatory-visual";

/**
 * P14 R5 — Verified means that the catalogue resolved a prescription model;
 * it does NOT mean that the medicine is controlled. A verified common
 * prescription must never appear under "Controlados".
 * Manually reported classifications remain visible in their regulatory rail,
 * but cannot be automatically upgraded to verified control.
 */
export function hasConfirmedControlledRegime(profile?: MedicationRegulatoryVisual | null): boolean {
  return Boolean(profile?.verified &&
    (profile.tone === "black" || profile.tone === "yellow" || profile.tone === "red"));
}
