/** CI360 P4: interpretação conservadora de texto TRANSCRITO ou OCR local.
 * Não atesta produto, lote, registro ANVISA ou validade de uma receita.
 * Não grava dados de saúde, documentos ou estoque.
 */
export type PharmaLensTextOriginCI360 = 'local_ocr' | 'manual_transcription';
export type PharmaLensDocumentFieldCI360 = 'name' | 'strength' | 'batch' | 'expiry' | 'registration' | 'manufacturer';
export type PharmaLensCandidateCI360 = {
  origin: PharmaLensTextOriginCI360;
  name: string;
  strength: string;
  batch: string;
  expiry: string;
  registration: string;
  manufacturer: string;
  reviewedByPerson: boolean;
  capturedAt: string;
  rawText: string;
};
export type PharmaLensTextAnalysisCI360 = { candidate: PharmaLensCandidateCI360; evidence: Partial<Record<PharmaLensDocumentFieldCI360,string>>; limitations: string[] };
const compact=(value:string,n=160)=>value.replace(/\s+/g,' ').trim().slice(0,n);
export const PHARMALENS_DOCUMENT_LIMIT_CI360 = 12000;
function normalizedLines(text:string):string[] {
  return text.replace(/\r/g,'\n').split(/\n+/).map(x=>compact(x,180)).filter(Boolean).slice(0,150);
}
function capture(lines:string[],patterns:RegExp[],max=95):{value:string;line:string}|null {
  for(const line of lines){for(const pattern of patterns){const found=pattern.exec(line);if(found?.[1])return{value:compact(found[1],max),line};}}
  return null;
}
function cleanDate(value:string):string {
  const trimmed=value.trim();
  const monthYear=/^(0[1-9]|1[0-2])[\/-](20\d{2})$/.exec(trimmed);
  if(monthYear)return`${monthYear[1]}/${monthYear[2]}`;
  const full=/^([0-2]\d|3[01])[\/-](0[1-9]|1[0-2])[\/-](20\d{2})$/.exec(trimmed);
  if(full)return `${full[1]}/${full[2]}/${full[3]}`;
  return '';
}
export function analyzePharmaLensDocumentTextCI360(text:string,origin:PharmaLensTextOriginCI360,at:string):PharmaLensTextAnalysisCI360 {
  const safe=typeof text==='string'?text.slice(0,PHARMALENS_DOCUMENT_LIMIT_CI360):'';
  const lines=normalizedLines(safe);
  const evidence:Partial<Record<PharmaLensDocumentFieldCI360,string>>={};
  const manufacturer=capture(lines,[/(?:^|\b)(?:fabricante|fabricado por|laborat[oó]rio|ind[uú]stria)\s*[:\-]\s*(.{3,85})/i]);
  const batch=capture(lines,[/(?:^|\b)(?:lote|lot|batch|n[º°o.]\s*lote)\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9\-/]{2,32})/i]);
  const expiry=capture(lines,[/(?:validade|vencimento|venc|val\.)\s*[:\-]?\s*((?:[0-3]\d[\/-])?(?:0[1-9]|1[0-2])[\/-]20\d{2})/i]);
  const registration=capture(lines,[/(?:reg(?:istro)?\s*(?:m\.?s\.?|anvisa)?|m\.?s\.?)\s*[:#\-]?\s*(\d[.\d\s-]{8,22}\d)/i]);
  const strength=capture(lines,[/\b(\d+(?:[,.]\d+)?\s*(?:mg\/mL|mg\/ml|mcg|µg|mg|g|mL|ml|UI|%)\b(?:\s*\/\s*\d+(?:[,.]\d+)?\s*(?:mL|ml|g))?)/i]);
  const named=capture(lines,[/(?:nome(?: comercial)?|medicamento|produto)\s*[:\-]\s*(.{3,85})/i]);
  for(const [key,match] of [['name',named],['strength',strength],['batch',batch],['expiry',expiry],['registration',registration],['manufacturer',manufacturer]] as const)if(match)evidence[key]=match.line;
  const candidate:PharmaLensCandidateCI360={
    origin, name:named?.value||'',strength:strength?.value||'',batch:batch?.value||'',
    expiry:expiry?cleanDate(expiry.value):'',registration:registration?.value.replace(/\D/g,'').slice(0,20)||'',
    manufacturer:manufacturer?.value||'',reviewedByPerson:false,capturedAt:at,rawText:safe,
  };
  const limitations=['O texto extraído pode conter erros de leitura; cada campo requer conferência visual.',
    'Número com aparência de registro não comprova registro sanitário ativo nem correspondência com uma apresentação.',
    'Foto, bula, lote, fabricante, compra e início de uso são evidências distintas; nenhum dado é gravado automaticamente.'];
  if(!candidate.registration)limitations.push('Registro sanitário não identificado no texto; não será inferido.');
  if(!candidate.expiry)limitations.push('Validade não identificada de forma confiável; conferir na embalagem.');
  return {candidate,evidence,limitations};
}
export function updatePharmaLensCandidateFieldCI360(candidate:PharmaLensCandidateCI360,field:PharmaLensDocumentFieldCI360,value:string):PharmaLensCandidateCI360 {
  const cleaned=compact(String(value||''),field==='name'||field==='manufacturer'?100:60);
  return {...candidate,[field]:cleaned,reviewedByPerson:false};
}
export function candidateFieldsCI360(candidate:PharmaLensCandidateCI360):number {
  return (['name','strength','batch','expiry','registration','manufacturer'] as const).filter(key=>Boolean(candidate[key]?.trim())).length;
}
export function validateLocalPhotoCI360(file:{type:string;size:number}):string|null {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Selecione JPEG, PNG ou WebP. PDF não executa OCR nesta superfície.';
  if(!Number.isFinite(file.size)||file.size<=0||file.size>10*1024*1024)return 'A imagem precisa ter até 10 MB.';
  return null;
}
