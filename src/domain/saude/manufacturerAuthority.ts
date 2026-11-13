/** Fabricante declarado prevalece; aquisição é evidência rotulada, nunca alteração silenciosa. */
export type ManufacturerEvidenceM144={laboratorio_etiqueta?:string|null;userDeclared?:string|null;latestAcquisition?:{laboratorio?:string|null;manufacturer?:string|null;completed?:boolean}|null};
export function manufacturerDisplayM144(input:ManufacturerEvidenceM144){
 const declared=(input.laboratorio_etiqueta||input.userDeclared||'').trim();
 const observed=input.latestAcquisition?.completed?(input.latestAcquisition.laboratorio||input.latestAcquisition.manufacturer||'').trim():'';
 return {label:declared||observed||'',source:declared?'etiqueta_declarada':observed?'ultima_aquisicao':'sem_evidencia',suggestion:declared&&observed&&declared!==observed?observed:null,mutatesHistory:false};
}
