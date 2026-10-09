"use client";
import {
  Watch,
  Circle,
  Gauge,
  Scale,
  HeartPulse,
  Activity,
  Moon,
  Footprints,
  Wind,
} from "lucide-react";
import type { DeviceKind, HealthMetric } from "@/lib/health-profile/types";
export function HealthDeviceIcon({
  kind,
  color,
  size = 20,
}: {
  kind: DeviceKind;
  color: string;
  size?: number;
}) {
  const Icon = {
    watch: Watch,
    ring: Circle,
    pressure: Gauge,
    scale: Scale,
    oximeter: HeartPulse,
    other: Activity,
  }[kind];
  return <Icon size={size} style={{ color }} aria-hidden="true" />;
}
export function HealthMetricIcon({
  type,
  size = 20,
}: {
  type: HealthMetric;
  size?: number;
}) {
  const Icon = {
    sono: Moon,
    peso: Scale,
    pressao_arterial: Gauge,
    frequencia_cardiaca: HeartPulse,
    oxigenacao: Wind,
    caminhada: Footprints,
  }[type];
  return <Icon size={size} aria-hidden="true" />;
}
export const METRIC_TONES: Record<HealthMetric, string> = {
  sono: "text-violet-300",
  peso: "text-emerald-400",
  pressao_arterial: "text-rose-300",
  frequencia_cardiaca: "text-coral",
  oxigenacao: "text-cyan-300",
  caminhada: "text-amber-300",
};
