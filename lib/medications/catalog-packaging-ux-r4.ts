/** VAULT UX360 R4 — projeção somente-leitura das embalagens de catálogo.
 * Não representa aquisição, estoque físico, dose ou apresentação pessoal.
 * Nunca usa um 'X 1 ML' como contagem de unidades sólidas.
 */
export type CatalogPackageUXR4 = { size: number; label: string; original: string };
export type CatalogPackageReviewUXR4 = { options: CatalogPackageUXR4[]; status: 'matched'|'unverified' };

const normalize = (v: string) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/,/g, '.').replace(/\s+/g, ' ').trim();
// Potências sólidas em ordem e explicitamente ligadas por +. A assinatura
// precisa corresponder inteira; nunca inferir qual componente foi declarado.
const STRENGTH_TOKEN = /(?<![\d.])\d+(?:\.\d+)?\s*(?:MCG|UG|MG|G|UI)\b/gi;
const STRENGTH_PREFIX = /^(\d+(?:\.\d+)?)\s*(MCG|UG|MG|G|UI)\b/i;
function strengthOf(input:string, exact=false): string | null {
  const text=normalize(input), parts:string[]=[];
  let rest=text;
  while(true){
    const m=rest.match(STRENGTH_PREFIX);
    if(!m) return null;
    const value=Number(m[1]);
    if(!Number.isFinite(value)||value<=0) return null;
    parts.push(`${value}:${m[2]}:`);
    rest=rest.slice(m[0].length).trimStart();
    if(!rest.startsWith('+')) break;
    rest=rest.slice(1).trimStart();
  }
  if(parts.length!==[...text.matchAll(STRENGTH_TOKEN)].length) return null;
  if(exact ? rest.length!==0 : /^[+/&-]/.test(rest)) return null;
  return parts.join('+');
}
function dosageMatches(text:string, desired:string):boolean {
  const found=strengthOf(text), wanted=strengthOf(desired,true);
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
  const cap=/\bCAP(?:S|SULA|SULAS)?\b/.test(t), com=/\bCOM(?:P|PR|PRIMIDO|PRIMIDOS)?\b|\bCOMP\s*REV\b/.test(t.replace(/\bCOM\s+MICROGRANULOS\b/g,'MICROGRANULOS'));
  if(cap&&com) return 'other';
  if(cap) return 'solid_cap';
  if(com) return 'solid_com';
  return 'other';
}
/** Uma nova potência só inicia outra variante após fim inequívoco de embalagem.
 * Separar toda ocorrência de MG fazia "10 MG + 5 MG" virar "5 MG" isolado.
 */
function variants(raw:string):string[]{
  const primary=String(raw||'').split(/[;•·\n\r]+/).map(s=>s.trim()).filter(Boolean);
  return primary.flatMap(part=>{
    const starts=/(?<![\d.,])\d+(?:[.,]\d+)?\s*(?:MCG|UG|MG|G|UI)\b/gi;
    const out:string[]=[];let start=0;
    for(const match of part.matchAll(starts)){
      const i=match.index!;
      if(i===0||i<=start) continue;
      const previous=part.slice(start,i);
      // Concatenação antiga: "... X 12 150 MG ..."; também "... X 12, 150 MG ...".
      // Uma composição não tem X quantidade de embalagem antes de outro componente.
      if(!/\bX\s*\d{1,4}(?:\s*(?:ML|L|COM|COMP|CAP|CAPS))?(?:,\s*|\s+)$/i.test(previous)) continue;
      out.push(previous.replace(/,\s*$/,'').trim()); start=i;
    }
    out.push(part.slice(start).trim());return out.filter(Boolean);
  });
}
export function catalogPackagesForMedicationUXR4(raw:string|null|undefined, dose:string|null|undefined, form:string|null|undefined):CatalogPackageReviewUXR4{
  if (!raw || !dose || !form) return {options:[],status:'unverified'};
  const want=formKind(form);
  if (want!=='solid_com' && want!=='solid_cap') return {options:[],status:'unverified'};
  const unique=new Map<number,CatalogPackageUXR4>();
  for (const segment of variants(raw)){
    // Metadado de embalagem explícito, não uma segunda quantidade ou potência.
    // A descrição original (inclusive a restrição) permanece disponível.
    const t=normalize(segment).replace(/\s*\(\s*EMBA?\.?\s*(?:HOSP(?:ITALAR)?|FRAC(?:IONAVEL|IONADA)?|MULT(?:I|IPLA)?)\.?\s*\)\s*$/, '').replace(/\s+EMB\.?\s+(?:HOSP(?:ITALAR)?|FRAC(?:IONAVEL|IONADA)?|MULT(?:I|IPLA)?)\.?$/, '').trim();
    if (!dosageMatches(t,dose) || segmentForm(t)!==want) continue;
    // Só quantidade terminal inequívoca. Não adivinhar total de subembalagens,
    // nem tratar volume, massa ou quantidade de ampolas como unidades sólidas.
    // 'CX 35 FR ... X 60' or '25 BL ... X 20' is a subpack count.
    // Never present the number per subpack as the number in the whole package.
    if(/\b\d+\s*(?:BL|ENV|FR|STR|TUB|AMP|SACH|BISN|SER|FLAC|CART)\b/.test(t.slice(0,t.search(/\bX\s*\d/)))) continue;
    const counts=[...t.matchAll(/\bX\s*(\d+)(?![\d.,])\b/g)];
    if(counts.length!==1) continue;
    const match=t.match(/\bX\s*(\d{1,4})(?:\s*(COM|COMP|COMPR|COMPRIMIDOS?|CAP|CAPS|CAPSULAS?))?$/);
    if (!match) continue;
    if(match[2] && segmentForm(match[2])!==want) continue;
    const size=Number(match[1]);
    if (!Number.isInteger(size)||size<1||size>1000) continue;
    unique.set(size,{size,label:`c/ ${size} ${want==='solid_com'?'comprimidos':'cápsulas'}`,original:segment});
  }
  const options=[...unique.values()].sort((a,b)=>a.size-b.size);
  return {options,status:options.length?'matched':'unverified'};
}
