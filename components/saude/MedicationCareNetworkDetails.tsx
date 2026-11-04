"use client";

import { AlertCircle, Building2, ChevronRight, Gift, MapPin, Phone, Store, Stethoscope } from "lucide-react";
import { DetailInfoRow } from "@/components/detail/DetailComponents";

type NetworkNode = {id?: string | null; name: string; address?: string | null; phone?: string | null; kind?: string | null};
type LatestPublicAcquisition = {nextWithdrawalDate?: string | null; needsPrescription?: boolean | null};
type Props = {
  doctor: {id?: string | null; name: string; otherMedicationCount: number};
  hospital: NetworkNode | null;
  location: NetworkNode | null;
  pharmacy: NetworkNode | null;
  latestPublicAcquisition: LatestPublicAcquisition | null;
  onNavigate: (href: string) => void;
  onMap: (address: string) => void;
  onCall: (phone: string) => void;
  formatDay: (value?: string | null) => string;
};

/** Presentation only. The owning page authorizes every relation before passing it in. */
export function MedicationCareNetworkDetails({doctor,hospital,location,pharmacy,latestPublicAcquisition,onNavigate,onMap,onCall,formatDay}:Props) {
  const navigate = (type: "medicos" | "hospitais" | "locais" | "farmacias", id?: string | null) => {
    if (id?.trim()) onNavigate(`/saude/${type}/detalhes?id=${encodeURIComponent(id)}`);
  };
  const action = (label: string, onClick: () => void, icon: "open" | "map" | "phone") => (
    <button type="button" onClick={onClick} aria-label={label}
      className="grid size-12 shrink-0 place-items-center rounded-xl border border-surface-border/65 bg-surface-raised/55 text-ink-primary shadow-sm transition-colors hover:border-emerald-300/30 hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
      {icon === "open" ? <ChevronRight size={17} aria-hidden="true"/> : icon === "phone" ? <Phone size={16} aria-hidden="true"/> : <MapPin size={16} aria-hidden="true"/>}
    </button>
  );
  const nodeActions = (type: "hospitais" | "locais" | "farmacias", node: NetworkNode) => (
    <span className="flex flex-wrap gap-1.5">
      {node.id ? action(`Abrir detalhes de ${node.name}`,()=>navigate(type,node.id),"open") : null}
      {node.phone ? action(`Ligar para ${node.name}`,()=>onCall(node.phone!),"phone") : null}
      {node.address ? action(`Abrir ${node.name} no mapa`,()=>onMap(node.address!),"map") : null}
    </span>
  );
  const linkedLocations = Number(Boolean(doctor.id)) + Number(Boolean(hospital)) + Number(Boolean(location)) + Number(Boolean(pharmacy));
  return <div className="min-w-0 space-y-3.5" aria-label="Rede de cuidado vinculada ao medicamento">
    <p role="note" className="rounded-xl border border-surface-border/50 bg-surface-raised/30 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
      {linkedLocations>0?`${linkedLocations} referência(s) de cuidado exibida(s) conforme os vínculos registrados.`:"Nenhuma referência de rede confirmada nesta ficha."} Vínculo não confirma atendimento, fornecimento ou retirada.
    </p>
    <DetailInfoRow icon={<Stethoscope size={19}/>} iconClassName="bg-sky-400/10 text-sky-300" label="Médico Prescritor"
      action={doctor.id ? action("Abrir detalhes do médico",()=>navigate("medicos",doctor.id),"open") : undefined}>
      <p className="break-words text-sm font-bold text-ink-primary">{doctor.name}</p>
      {doctor.otherMedicationCount > 0 ? <p className="mt-1 text-[11px] text-sky-300">Também vinculado a {doctor.otherMedicationCount} outro{doctor.otherMedicationCount===1?"":"s"} medicamento{doctor.otherMedicationCount===1?"":"s"} desta pessoa</p> : null}
    </DetailInfoRow>
    {hospital ? <DetailInfoRow icon={<Building2 size={19}/>} iconClassName="bg-violet-400/10 text-violet-400" label="Hospital" action={nodeActions("hospitais",hospital)}>
      <p className="break-words text-sm font-bold text-ink-primary">{hospital.name}</p>
      {hospital.address ? <p className="mt-0.5 break-words text-[11px] text-ink-muted">{hospital.address}</p> : null}
    </DetailInfoRow> : null}
    {location ? <DetailInfoRow icon={<MapPin size={19}/>} iconClassName="bg-emerald-400/10 text-emerald-400" label="Local de Saúde" action={nodeActions("locais",location)}>
      <p className="break-words text-sm font-bold text-ink-primary">{location.name}</p>
      <p className="mt-0.5 text-[11px] text-ink-muted">{location.kind || "Local de saúde"}</p>
      {location.address ? <p className="mt-0.5 break-words text-[11px] text-ink-muted">{location.address}</p> : null}
    </DetailInfoRow> : null}
    {pharmacy ? <DetailInfoRow icon={<Store size={19}/>} iconClassName="bg-emerald-400/10 text-emerald-300" label="Farmácia Vinculada" action={nodeActions("farmacias",pharmacy)}>
      <p className="break-words text-sm font-bold text-ink-primary">{pharmacy.name}</p>
      {pharmacy.address ? <p className="mt-0.5 break-words text-[11px] text-ink-muted">{pharmacy.address}</p> : null}
    </DetailInfoRow> : null}
    {latestPublicAcquisition ? <div className="flex items-start gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/[.045] p-3.5 shadow-sm">
      <Gift size={17} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true"/>
      <div className="min-w-0 text-xs"><p className="font-semibold text-emerald-400">Última aquisição registrada via SUS / sem custo</p>
        {latestPublicAcquisition.nextWithdrawalDate ? <p className="mt-1 text-ink-muted">Próxima retirada informada: {formatDay(latestPublicAcquisition.nextWithdrawalDate)}</p> : null}
        {latestPublicAcquisition.needsPrescription ? <p className="mt-1 flex gap-1 text-amber-400"><AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true"/>Registro indica necessidade de nova receita.</p> : null}
      </div>
    </div> : null}
  </div>;
}
