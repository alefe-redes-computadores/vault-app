import { Activity, ClipboardList, Droplets, Footprints, Gauge, HeartPulse, Moon, Scale, Thermometer, Wind, type LucideIcon } from "lucide-react";
import {metricKindB,type MetricKindB} from "@/lib/clinical-front-b-pure";
export {metricKindB,formatSleepDurationB,originLabelB,formatDoseQuantityB} from "@/lib/clinical-front-b-pure";
export type {MetricKindB} from "@/lib/clinical-front-b-pure";

/** B16: one icon per distinct metric. Type/record key only, not guessed by value. */
export const METRIC_IDENTITY_B = {
  sono: {icon: Moon, tone: "text-indigo-300", label: "Sono"},
  oxigenacao: {icon: Wind, tone: "text-cyan-300", label: "Oxigenação"},
  frequencia_cardiaca: {icon: HeartPulse, tone: "text-rose-300", label: "Frequência cardíaca"},
  pressao_arterial: {icon: Gauge, tone: "text-sky-300", label: "Pressão arterial"},
  glicemia: {icon: Droplets, tone: "text-amber-300", label: "Glicemia"},
  temperatura: {icon: Thermometer, tone: "text-orange-300", label: "Temperatura"},
  peso: {icon: Scale, tone: "text-emerald-300", label: "Peso"},
  passos: {icon: Footprints, tone: "text-lime-300", label: "Passos"},
  hrv: {icon: Activity, tone: "text-violet-300", label: "Variabilidade cardíaca"},
} satisfies Record<MetricKindB,{icon:LucideIcon;tone:string;label:string}>;

export function metricIdentityB(value:unknown) {const key=metricKindB(value);return key?METRIC_IDENTITY_B[key]:null;}
export function clinicalIdentityFallbackB():{icon:LucideIcon;tone:string;label:string}{
  return {icon:ClipboardList,tone:'text-ink-muted',label:'Tipo não informado'};
}
