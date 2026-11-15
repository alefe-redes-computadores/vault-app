/** Read-only rendering labels, with explicit evidence qualifiers. No stock or supply inference. */
export type ProvenanceChipP5P4 = {label:string; tone:'public'|'private'|'historic'|'dose'};
export function medicationProvenanceChipsP5P4(input:{
  acquisitionType?:string|null;routeMode?:string|null;doseText?:string|null;
}): {origin:ProvenanceChipP5P4|null;dose:ProvenanceChipP5P4|null} {
  const registered=input.acquisitionType==='sus'?'SUS':input.acquisitionType==='comprado'?'Comprado':'';
  const origin:ProvenanceChipP5P4|null=registered?{
    label: input.routeMode==='hybrid'?`${registered} · cadastro`:registered,
    tone:registered==='SUS'?'public':'private',
  }:input.routeMode==='public'?{label:'SUS no histórico',tone:'historic'}:
    input.routeMode==='private'?{label:'Compra no histórico',tone:'historic'}:
    input.routeMode==='hybrid'?{label:'Origens históricas',tone:'historic'}:null;
  const raw=(input.doseText||'').trim();
  return {origin,dose:raw?{label:`Dose ${raw}`,tone:'dose'}:null};
}
