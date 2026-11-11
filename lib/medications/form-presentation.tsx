import type { ElementType } from "react";
import { Activity, Droplet, Eraser, Package, StickyNote, Syringe } from "lucide-react";

export type CatalogPresentationSuggestion = {
  key: string;
  dosage: string;
  format: string | null;
  formatLabel: string | null;
  officialLabel: string;
  packageDescription: string | null;
};

type MedicationFormatIconProps = {
  size: string | number;
  fill?: string;
  stroke?: string;
  className?: string;
};

export type MedicationFormatOption = {
  id: string;
  label: string;
  icon: ElementType;
};

export function CirclePillIcon({ size, fill = "currentColor", stroke = "none" }: MedicationFormatIconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /></svg>;
}

export function SplitPillIcon({ size, fill = "currentColor", stroke = "none" }: MedicationFormatIconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" /></svg>;
}

/** Comprimido sob a língua: identidade visual; não orienta administração. */
export function SublingualPillIcon({ size, fill = "currentColor", stroke = "none", className }: MedicationFormatIconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke === "none" ? "currentColor" : stroke} className={className} aria-hidden="true"><circle cx="12" cy="8.5" r="5.5" fill={fill} stroke="none"/><path d="M5 17.5c2.2 2.3 4.5 3.3 7 3.3s4.8-1 7-3.3" strokeWidth="1.8" strokeLinecap="round"/><path d="M8.5 16.7c1.1-1 2.3-1.5 3.5-1.5s2.4.5 3.5 1.5" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

/** M92: oblongo inteiro ou com sulco apenas como identidade visual.
 * O sulco NÃO constitui orientação para dividir o medicamento. */
export function OblongPillIcon({ size, fill = "currentColor", stroke = "none", className }: MedicationFormatIconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} className={className} aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="6" /></svg>;
}
export function ScoredOblongPillIcon({ size, fill = "currentColor", stroke = "none", className }: MedicationFormatIconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} className={className} aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="6" /><line x1="12" y1="7" x2="12" y2="17" stroke="rgba(0,0,0,0.55)" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export function CapsuleIcon({ size, fill = "currentColor", stroke = "none" }: MedicationFormatIconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" aria-hidden="true"><rect x="4" y="7" width="16" height="10" rx="5" ry="5" /><line x1="12" y1="7" x2="12" y2="17" stroke="rgba(0,0,0,0.35)" strokeWidth="2" /></svg>;
}

export const MEDICATION_PRIMARY_FORMATS: readonly MedicationFormatOption[] = [
  { id: "comprimido", label: "Comprimido", icon: CirclePillIcon },
  { id: "partido", label: "Partido", icon: SplitPillIcon },
  { id: "capsula", label: "Cápsula", icon: CapsuleIcon },
  { id: "gota", label: "Gotas", icon: Droplet },
  { id: "injecao", label: "Injeção", icon: Syringe },
  { id: "adesivo", label: "Adesivo", icon: StickyNote },
];

export const MEDICATION_ADDITIONAL_FORMATS: readonly MedicationFormatOption[] = [
  { id: "oblongo", label: "Oblongo inteiro", icon: OblongPillIcon },
  { id: "oblongo_sulcado", label: "Oblongo com sulco", icon: ScoredOblongPillIcon },
  { id: "solucao", label: "Solução", icon: Droplet },
  { id: "suspensao", label: "Suspensão", icon: Droplet },
  { id: "xarope", label: "Xarope", icon: Droplet },
  { id: "spray", label: "Spray", icon: Activity },
  { id: "inalador", label: "Inalador", icon: Activity },
  { id: "creme", label: "Creme", icon: Eraser },
  { id: "pomada", label: "Pomada", icon: Eraser },
  { id: "gel", label: "Gel", icon: Droplet },
  { id: "colirio", label: "Colírio", icon: Droplet },
  { id: "supositorio", label: "Supositório", icon: CapsuleIcon },
  { id: "ovulo", label: "Óvulo", icon: CapsuleIcon },
  { id: "po", label: "Pó", icon: Package },
  { id: "granulado", label: "Granulado", icon: Package },
  { id: "sache", label: "Sachê", icon: Package },
  { id: "sublingual", label: "Sublingual", icon: SublingualPillIcon },
  { id: "bucal", label: "Bucal", icon: CirclePillIcon },
  { id: "mastigavel", label: "Mastigável", icon: CirclePillIcon },
  { id: "efervescente", label: "Efervescente", icon: Activity },
  { id: "dispersivel", label: "Dispersível", icon: Activity },
  { id: "implante", label: "Implante", icon: Package },
];

export const MEDICATION_FORMATS: readonly MedicationFormatOption[] = [
  ...MEDICATION_PRIMARY_FORMATS,
  ...MEDICATION_ADDITIONAL_FORMATS,
];

export const MEDICATION_IDENTITY_COLORS = [
  "#FFFFFF", "#FCA5A5", "#F87171", "#EF4444", "#FB923C", "#F97316",
  "#FBBF24", "#FACC15", "#A3E635", "#34D399", "#22C55E", "#2DD4BF",
  "#22D3EE", "#60A5FA", "#3B82F6", "#818CF8", "#A78BFA", "#8B5CF6",
  "#F472B6", "#EC4899", "#9CA3AF", "#64748B",
] as const;
