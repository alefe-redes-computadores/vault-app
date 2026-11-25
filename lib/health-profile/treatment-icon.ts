import { Activity, HeartHandshake, ClipboardList, ShieldCheck, CalendarDays, Brain, Stethoscope, Target, Leaf, Waypoints, HeartPulse, Pill } from "lucide-react";
/** A visual identity, not a medical classifier. No inference from patient-entered names. */
const ICONS=[Activity,HeartHandshake,ClipboardList,ShieldCheck,CalendarDays,Brain,Stethoscope,Target,Leaf,Waypoints,HeartPulse,Pill] as const;
const BY_KEY:Record<string,(typeof ICONS)[number]>={activity:Activity,heart:HeartHandshake,clipboard:ClipboardList,shield:ShieldCheck,calendar:CalendarDays,brain:Brain,stethoscope:Stethoscope,target:Target,leaf:Leaf,waypoints:Waypoints,heartpulse:HeartPulse,pill:Pill};
type TreatmentLike={id?:unknown;icone?:unknown;icon?:unknown;icon_name?:unknown};
export function getVaultTreatmentIcon(entity:string|TreatmentLike|null|undefined) {
  const t=entity && typeof entity==='object' ? entity:null;
  const requested=t ? [t.icone,t.icon_name,t.icon].find(x=>typeof x==='string'&&Boolean(BY_KEY[x.trim().toLowerCase()])):undefined;
  if(typeof requested==='string')return BY_KEY[requested.trim().toLowerCase()];
  const id=t&&typeof t.id==='string'?t.id.trim():'';
  if(!id)return HeartHandshake; // Neutral fallback; name is deliberately not inspected.
  let hash=2166136261;
  for(let i=0;i<id.length;i++){hash^=id.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return ICONS[(hash>>>0)%ICONS.length];
}
