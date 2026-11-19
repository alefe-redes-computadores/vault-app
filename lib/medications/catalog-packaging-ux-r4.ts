/** VAULT UX360 R4 — projeção somente-leitura das embalagens de catálogo.
 * Não representa aquisição, estoque físico, dose ou apresentação pessoal.
 * Nunca usa um 'X 1 ML' como contagem de unidades sólidas.
 */
export type CatalogPackageUXR4 = { size: number; label: string; original: string };
export type CatalogPackageReviewUXR4 = { options: CatalogPackageUXR4[]; status: 'matched'|'unverified' };

const normalize = (v: string) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/,/g, '.').replace(/\s+/g, ' ').trim();
const STRENGTH = /(?:^|\s)(\d+(?:\.\d+)?)\s*(MG|MCG|UG|G|UI)(?:\s*\/\s*(?:\d+(?:\.\d+)?\s*)?(ML|L))?(?=\s|$)/i;
function strengthOf(input:string): string | null {
  const m=normalize(input).match(STRENGTH);
  return m ? `${Number(m[1])}:${m[2]}:${m[3] || ''}` : null;
}
function dosageMatches(text:string, desired:string):boolean {
  const found=strengthOf(text), wanted=strengthOf(desired);
  return Boolean(found && wanted && found===wanted);
}
function formKind(form:string):'solid_com'|'solid_cap'|'liquid'|'other'{
  const t=normalize(form);
  if (/COMPRIM|COMPR\b|^COM\b|OBLONGO|PARTIDO|MASTIGAVEL|SUBLINGUAL/.test(t)) return 'solid_com';
  if (/CAPSULA|CAPS\b|^CAP\b/.test(t)) return 'solid_cap';
  if (/INJE|AMPOLA|SOLUC|GOTA|XAROPE|SUSPEN|ML|SPRAY|COLIRIO/.test(t)) return 'liquid';
  return 'other';
}
function segmentForm(text:string):'solid_com'|'solid_cap'|'liquid'|'other'{
  const t=normalize(text);
  // Líquidos têm precedência: um texto de ampola não vira caixa de comprimidos.
  if (/\bSOL\s*(?:INJ|OR|ORAL)\b|\bAMP(?:OLA|OLAS)?\b|\bML\b|\bINJETAVEL\b|\bGOT(?:A|AS)?\b|\bSUSP\b/.test(t)) return 'liquid';
  if (/\bCAP(?:S|SULA|SULAS)?\b/.test(t)) return 'solid_cap';
  if (/\bCOM(?:P|PR|PRIMIDO|PRIMIDOS)?\b|\bCOMP\s*REV\b/.test(t)) return 'solid_com';
  return 'other';
}
/** A fonte pode concatenar várias apresentações. Segmentação conservadora. */
function variants(raw:string):string[]{
  // Ponto-e-vírgula, bullets e quebras separam referências inteiras.
  const primary=String(raw||'').split(/[;•\n\r]+/).map(s=>s.trim()).filter(Boolean);
  return primary.flatMap(part=>part.split(/(?:,\s*|\s+)(?=\d+(?:[.,]\d+)?\s*(?:MG|MCG|UG|G|UI)\b)/i).map(s=>s.trim()).filter(Boolean));
}
export function catalogPackagesForMedicationUXR4(raw:string|null|undefined, dose:string|null|undefined, form:string|null|undefined):CatalogPackageReviewUXR4{
  if (!raw || !dose || !form) return {options:[],status:'unverified'};
  const want=formKind(form);
  if (want!=='solid_com' && want!=='solid_cap') return {options:[],status:'unverified'};
  const unique=new Map<number,CatalogPackageUXR4>();
  for (const segment of variants(raw)){
    const t=normalize(segment);
    if (!dosageMatches(t,dose) || segmentForm(t)!==want) continue;
    // Exigir que a quantidade seja inteira, seguida de fim ou token de embalagem,
    // mas nunca de unidade de volume/massa. Ex.: 'X 1 ML' é proibido.
    const match=t.match(/\bX\s*(\d{1,4})(?![\d.,])\b(?=\s|$)/);
    if (!match) continue;
    const after=t.slice((match.index||0)+match[0].length).trimStart();
    if (/^(?:ML|L|MG|G|MCG|UI|AMP\b|AMPOLA\b)/.test(after)) continue;
    const size=Number(match[1]);
    if (!Number.isInteger(size)||size<1||size>1000) continue;
    unique.set(size,{size,label:`c/ ${size} ${want==='solid_com'?'comprimidos':'cápsulas'}`,original:segment});
  }
  const options=[...unique.values()].sort((a,b)=>a.size-b.size);
  return {options,status:options.length?'matched':'unverified'};
}
