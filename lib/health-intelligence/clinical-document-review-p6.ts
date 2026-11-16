/** CI360 P6: document evidence never mutates prescriptions, stock or official catalog. */
export type DocumentReviewInputP6 = {
  kind:'receita'|'laudo'|'relatorio'|'outro';
  extraction:'manual'|'verified_ocr'|'none';
  confirmed:boolean;personId:string|null;userId:string|null;
  sourceId?:string|null;
};
export function documentReviewStateP6(x:DocumentReviewInputP6) {
  const scoped=Boolean(x.userId&&x.personId);
  const label=x.extraction==='verified_ocr'?'Texto extraído por OCR, revisar antes de utilizar':
    x.extraction==='manual'?'Pré-conferência manual, não é leitura automática':'Conteúdo não extraído';
  return {label,scoped,mayLink:scoped&&x.confirmed&&Boolean(x.sourceId),
    mayRegisterStock:false,mayCreatePrescription:false,mayChangeMedication:false,
    warning:'Confirme titular, documento original e campos; sem presunção de validade ou quantidade.'};
}
export function verifiedEvidenceReferenceP6(x:{userId:string;personId:string;sourceUserId?:string|null;sourcePersonId?:string|null;sourceId?:string|null}) {
  return Boolean(x.userId&&x.personId&&x.sourceId&&x.sourceUserId===x.userId&&x.sourcePersonId===x.personId);
}
