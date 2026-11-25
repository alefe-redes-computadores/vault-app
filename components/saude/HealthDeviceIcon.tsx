"use client";
import {
  Watch,
  Circle,
  Gauge,
  Scale,
  Activity,
  Route,
  Wind,
} from "lucide-react";
import type { DeviceKind, HealthMetric } from "@/lib/health-profile/types";
import { METRIC_IDENTITY_B } from "@/lib/ui/front-b-clinical-identity";
export function HealthDeviceIcon({
  kind,
  color,
  size = 20,
}: {
  kind: DeviceKind;
  color: string;
  size?: number;
}) {
  const dark = /^#[0-9a-f]{6}$/i.test(color) && (parseInt(color.slice(1,3),16)*299 + parseInt(color.slice(3,5),16)*587 + parseInt(color.slice(5,7),16)*114)/1000 < 70;
  const Icon = {
    watch: Watch,
    ring: Circle,
    pressure: Gauge,
    scale: Scale,
    oximeter: Wind,
    other: Activity,
  }[kind];
  return <Icon size={size} style={{ color, filter: dark ? "drop-shadow(0 0 1px #cbd5e1) drop-shadow(0 0 1px #cbd5e1)" : undefined }} aria-hidden="true" />;
}
export function HealthMetricIcon({
  type,
  size = 20,
}: {
  type: HealthMetric;
  size?: number;
}) {
  const Icon = type === "caminhada" ? Route : METRIC_IDENTITY_B[type === "hrv_rmssd" ? "hrv" : type]?.icon ?? Activity;
  return <Icon size={size} aria-hidden="true" />;
}
/** Reuse the relational identity palette of the published B; walking duration is distinct from step count. */
export const METRIC_TONES: Record<HealthMetric, string> = {
  sono: METRIC_IDENTITY_B.sono.tone,
  peso: METRIC_IDENTITY_B.peso.tone,
  pressao_arterial: METRIC_IDENTITY_B.pressao_arterial.tone,
  frequencia_cardiaca: METRIC_IDENTITY_B.frequencia_cardiaca.tone,
  oxigenacao: METRIC_IDENTITY_B.oxigenacao.tone,
  caminhada: "text-amber-300",
  passos: METRIC_IDENTITY_B.passos.tone,
  hrv_rmssd: METRIC_IDENTITY_B.hrv.tone,
};
