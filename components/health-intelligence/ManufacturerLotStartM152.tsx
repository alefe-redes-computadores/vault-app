"use client";
import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import { brainActiveProbingEnabled } from "@/lib/health-intelligence/active-probing/feature";
import { preferenceAllows } from "@/lib/health-intelligence/active-probing/core";
import { loadActiveProbePreferences } from "@/lib/health-intelligence/active-probing/consent-m153";
import { manufacturerProbes } from "@/lib/health-intelligence/active-probing/reconcile";
import { activeProbesRepository } from "@/lib/repositories/activeProbes";
import type { ActiveProbeEvent } from "@/lib/health-intelligence/active-probing/types";

type Props = {userId:string;personId:string;medicationId:string;acquisitionId:string;manufacturer:string};
/** Confirmacao explicita e idempotente do inicio REAL de um lote; nunca inventa aquisicao nem estoque. */
export function ManufacturerLotStartM152({userId,personId,medicationId,acquisitionId,manufacturer}:Props) {
  const [saved,setSaved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [permission,setPermission]=useState<{scope:string;allowed:boolean}|null>(null);
  const scope=JSON.stringify([userId,personId,acquisitionId]);
  useEffect(()=>{
    const refresh=()=>setPermission({scope,allowed:brainActiveProbingEnabled() &&
      preferenceAllows("manufacturer_lot_started",loadActiveProbePreferences(userId,personId))});
    refresh();
    window.addEventListener("storage",refresh);
    return ()=>window.removeEventListener("storage",refresh);
  },[scope,userId,personId]);
  const allowed=permission?.scope===scope && permission.allowed;
  if(!allowed || !userId.trim() || !personId.trim() || !medicationId.trim() ||
     !acquisitionId.trim() || !manufacturer.trim()) return null;
  async function start(){
    if(busy||saved)return;
    setBusy(true);setError("");
    try {
      if(!brainActiveProbingEnabled() || !preferenceAllows("manufacturer_lot_started",loadActiveProbePreferences(userId,personId)))
        throw new Error("consentimento ausente");
      const at=new Date().toISOString();
      const event:ActiveProbeEvent={schema_version:1,event_id:`lot:${acquisitionId}`,
        event_type:"manufacturer_lot_started",user_id:userId,person_id:personId,
        medication_id:medicationId,acquisition_id:acquisitionId,
        source_entity_type:"renovacoes",source_entity_id:acquisitionId,
        event_date:at.slice(0,10),confirmed_at:at,
        evidence_refs:[{type:"renovacoes",id:acquisitionId}],source:"user_confirmed"};
      const expected=manufacturerProbes(event,manufacturer);
      if(!expected.length)throw new Error("evento sem checkpoints");
      await activeProbesRepository.upsert(expected);
      const actual=await activeProbesRepository.list(userId,personId);
      const persisted=expected.some(row=>actual.some(savedRow=>savedRow.idempotency_key===row.idempotency_key));
      if(!persisted)throw new Error("nenhuma sondagem foi persistida");
      setSaved(true);
    }catch{
      setError("Não foi possível registrar o início deste acompanhamento neste aparelho. Confira o consentimento e o limite semanal.");
    }finally{setBusy(false)}
  }
  return <div className="space-y-2">
    <button type="button" disabled={busy||saved} onClick={start}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[.08] px-3 text-xs font-bold text-cyan-200 disabled:opacity-60">
      <PackageCheck size={15}/>{saved?"Início registrado neste aparelho":busy?"Registrando…":"Comecei este lote"}
    </button>
    {error?<p role="alert" className="text-xs text-amber-300">{error}</p>:null}
  </div>;
}
