import { Activity, HeartPulse } from "lucide-react";
/** Canonical original Home identity, reused by related screens. */
export function getVaultTreatmentIcon(name:string) {
 const normalized=(name||'').toLocaleLowerCase('pt-BR');
 return normalized.includes('dor')||normalized.includes('neuropática')||normalized.includes('depress')?HeartPulse:Activity;
}
