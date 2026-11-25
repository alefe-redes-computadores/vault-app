"use client";
import {MedicationFormatIcon} from "@/components/saude/MedicationFormatIcon";
import {getVaultTreatmentIcon} from "@/lib/health-profile/treatment-icon";
import {metricIdentityB} from "@/lib/ui/front-b-clinical-identity";
import type {MedicalRowP3} from "@/lib/m3/medical-dossier-p3";
import type {LucideIcon} from "lucide-react";

/** B16: actual dossier row rendering uses its own ID-resolved identity. */
export function MedicalDossierRowIconB({row,fallbackIcon:Fallback,fallbackTone}:{row:MedicalRowP3;fallbackIcon:LucideIcon;fallbackTone:string}) {
  const metric=metricIdentityB(row.visualB?.metric);
  const MetricIcon=metric?.icon;
  const TreatmentIcon=getVaultTreatmentIcon(row.visualB?.kind==="treatment"?{id:row.visualB.treatmentId}:null);
  const treatmentColor=row.visualB?.color||"";
  const style=/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(treatmentColor)?{color:treatmentColor}:undefined;
  return <span data-vault-front-b-row-icon={row.visualB?.kind||"fallback"}
    className={`grid size-7 shrink-0 place-items-center ${metric?.tone||fallbackTone}`} aria-hidden="true">
    {row.visualB?.kind==="medication"
      ? <MedicationFormatIcon formato={row.visualB.formato} cores={row.visualB.cores} size={24}/>
      : row.visualB?.kind==="measurement" && MetricIcon ? <MetricIcon size={17}/>
      : row.visualB?.kind==="treatment" ? <TreatmentIcon size={17} style={style}/>
      : <Fallback size={16}/>}
  </span>;
}
