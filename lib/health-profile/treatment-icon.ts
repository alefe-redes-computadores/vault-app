import { Activity, HeartHandshake, ClipboardList, ShieldCheck, CalendarDays, Brain, Stethoscope, Target, Leaf, Waypoints, HeartPulse, Pill, CircleHelp } from "lucide-react";
import {resolveTreatmentKeyR03,type TreatmentIdentityRecordR03,type TreatmentVisualChoiceR03} from "./treatment-preferences-r03";
/** Visual identity is explicit metadata, not a clinical classifier. */
const BY_KEY={activity:Activity,heart:HeartHandshake,clipboard:ClipboardList,shield:ShieldCheck,calendar:CalendarDays,brain:Brain,stethoscope:Stethoscope,target:Target,leaf:Leaf,waypoints:Waypoints,heartpulse:HeartPulse,pill:Pill,unassigned:CircleHelp} satisfies Record<TreatmentVisualChoiceR03,typeof Activity>;
export function getVaultTreatmentIcon(entity:string|TreatmentIdentityRecordR03|null|undefined) {
  return BY_KEY[resolveTreatmentKeyR03(entity && typeof entity==='object'?entity:null)];
}
