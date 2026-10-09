export type DeviceKind =
  | "watch"
  | "ring"
  | "pressure"
  | "scale"
  | "oximeter"
  | "other";
export type HealthMetric =
  | "sono"
  | "peso"
  | "pressao_arterial"
  | "frequencia_cardiaca"
  | "oxigenacao"
  | "caminhada";
export interface HealthProfile {
  id: string;
  user_id: string;
  person_id: string;
  birth_date: string | null;
  height_cm: number | null;
  skin_tone: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}
export interface HealthDevice {
  id: string;
  user_id: string;
  person_id: string;
  kind: DeviceKind;
  name: string;
  color: string;
  side: "left" | "right" | "none";
  capabilities: HealthMetric[];
  active: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
}
export const DEVICE_KINDS: Record<DeviceKind, string> = {
  watch: "Relógio",
  ring: "Anel",
  pressure: "Medidor de pressão",
  scale: "Balança",
  oximeter: "Oxímetro",
  other: "Outro aparelho",
};
export const METRICS: Record<
  HealthMetric,
  { label: string; unit: string; category: "medicao" | "habito" }
> = {
  sono: { label: "Sono", unit: "min", category: "habito" },
  peso: { label: "Peso", unit: "kg", category: "medicao" },
  pressao_arterial: {
    label: "Pressão arterial",
    unit: "mmHg",
    category: "medicao",
  },
  frequencia_cardiaca: {
    label: "Batimentos",
    unit: "bpm",
    category: "medicao",
  },
  oxigenacao: { label: "Oxigenação", unit: "%", category: "medicao" },
  caminhada: { label: "Caminhada", unit: "min", category: "habito" },
};
export const DEVICE_COLORS = [
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
  "#e2e8f0",
];
export const SKIN_TONES = [
  "#f1c9a5",
  "#dba57a",
  "#bb8159",
  "#905b3a",
  "#613d29",
  "#3d291f",
];
