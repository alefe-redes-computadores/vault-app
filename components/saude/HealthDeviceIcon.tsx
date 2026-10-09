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
  const dark = /^#[0-9a-f]{6}$/i.test(color) && (parseInt(color.slice(1,3),16)*299 + parseInt(color.slice(3,5),16)*587 + parseInt(color.slice(5,7),16)*114)/1000 < 70;
  const Icon = {
    watch: Watch,
    ring: Circle,
    pressure: Gauge,
    scale: Scale,
    oximeter: HeartPulse,
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
