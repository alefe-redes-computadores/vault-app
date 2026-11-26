'use strict';
// Offline evidence only. No database client, no clinical inference, no brand rules.
const clean = v => String(v ?? '').trim();
const norm = v => clean(v).normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
const legacyNorm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const same = (a,b) => {if(a.length!==b.length)return false;const x=[...a].sort(),y=[...b].sort();return x.every((v,i)=>v===y[i]);};
function codesOf(raw){const v=clean(raw);if(!v)return [];const parts=v.split(',').map(clean);return parts.every(c=>/^\d+$/.test(c)&&!/^0+$/.test(c))&&new Set(parts).size===parts.length?parts:null;}
function nameParts(raw){return clean(raw).split(/\s*[;+|]\s*/).map(norm);}
function singleName(raw){const s=clean(raw);return s && !/[;,+|/]/.test(s) && !/^(?:n[aã]o (?:informad[oa]|declarad[oa])|nc\s*ni|n\/a|null|\d+)$/i.test(s) ? s : null;}
function pushMap(m,k,v){if(!m.has(k))m.set(k,[]);m.get(k).push(v);}
function reconcileOfficialRows(rows){
  const observed=new Map(), byProduct=new Map(), byName=new Map();
  for(let i=0;i<rows.length;i++){
    const row=rows[i], product=clean(row.CO_SEQ_PRODUTO), codes=codesOf(row.CO_SUBSTANCIA), raw=clean(row.SUBSTANCIAS_MEDICAMENTOS);
    if(!product||!clean(row.NO_PRODUTO))continue;
    const sourceLine=Number.isSafeInteger(row.__pharmalensSourceLine)?row.__pharmalensSourceLine:i+2;
    pushMap(byProduct,product,{codes,raw,row:sourceLine,name:clean(row.NO_PRODUTO),registration:clean(row.NU_REGISTRO_PRODUTO),manufacturer:clean(row.NO_RAZAO_SOCIAL_EMPRESA),active:norm(row.VALIDADE_SITUACAO)});
    if(codes?.length===1 && singleName(raw) && !/^(?:nao declarado|n o declarado|nc ni)$/.test(legacyNorm(row.NO_PRODUTO)))pushMap(observed,codes[0],{name:raw,row:sourceLine,product});
  }
  const dictionary=new Map(), conflicts=new Map();
  for(const [code,allEntries] of observed){
    // A contradictory product cannot serve as a dictionary witness.
    const entries=allEntries.filter(e=>{const rows=byProduct.get(e.product)||[];const first=rows[0];return rows.length>0&&rows.every(r=>r.codes?.length===1&&r.codes[0]===code&&norm(r.raw)===norm(e.name)&&norm(r.name)===norm(first.name)&&r.registration===first.registration&&norm(r.manufacturer)===norm(first.manufacturer)&&r.active===first.active);});
    if(!entries.length){conflicts.set(code,'no_consistent_single_code_witness');continue;}
    const variants=new Set(entries.map(e=>norm(e.name)));
    if(variants.size!==1){conflicts.set(code,'conflicting_names_for_code');continue;}
    const representative=[...entries].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.row-b.row)[0];
    dictionary.set(code,{code,name:representative.name,normalizedName:legacyNorm(representative.name),witnessRows:entries.slice(0,8).map(e=>e.row),witnessCount:entries.length});
    pushMap(byName,legacyNorm(representative.name),code);
  }
  for(const [,values] of byName)if(values.length>1)for(const c of values){dictionary.delete(c);conflicts.set(c,'canonical_name_shared_by_codes');}
  const reports=[], substances=new Map(), relations=new Map();
  for(const [product,entries] of byProduct){
    const valid=entries.filter(e=>e.codes?.length), signatures=new Set(valid.map(e=>[...e.codes].sort().join(',')));
    const result={productExternalId:product,identity:{name:entries[0].name,registration:entries[0].registration,manufacturer:entries[0].manufacturer,active:entries[0].active},status:'inconclusive',reasons:[],codes:[],resolved:[],rows:entries.map(e=>e.row)};
    if(entries.some(e=>e.codes===null||norm(e.name)!==norm(entries[0].name)||e.registration!==entries[0].registration||norm(e.manufacturer)!==norm(entries[0].manufacturer)||e.active!==entries[0].active)||signatures.size>1){result.status='ambiguous';result.reasons.push('invalid_or_conflicting_code_sets');}
    else if(!valid.length){result.reasons.push('no_codes');}
    else {
      result.codes=[...valid[0].codes].sort();
      result.resolved=result.codes.filter(c=>dictionary.has(c)).map(c=>dictionary.get(c));
      if(result.codes.some(c=>conflicts.has(c))){result.status='ambiguous';result.reasons.push('conflicting_code_dictionary');}
      else if(result.resolved.length!==result.codes.length){result.status=result.resolved.length?'partial':'inconclusive';result.reasons.push('unresolved_codes');}
      else {
        const expected=result.resolved.map(s=>norm(s.name));
        // A row with missing codes but contradictory nonempty text must not be silently ignored.
        const proof=entries.filter(e=>e.codes?.length||e.raw).every(e=>{if(!e.raw)return false; if(expected.length===1)return norm(e.raw)===expected[0];const parts=nameParts(e.raw);if(same(parts,expected))return true; // commas accepted only with exact full-name set and no comma within a known name
          return expected.every(n=>!n.includes(','))&&same(e.raw.split(',').map(norm),expected);});
        if(!proof){result.status='ambiguous';result.reasons.push('text_does_not_prove_complete_code_set');}
        else{result.status='complete';for(const s of result.resolved){const key=s.code+'|'+s.normalizedName;substances.set(key,{externalId:s.code,canonicalName:s.name,normalizedName:s.normalizedName});relations.set(product+'|'+key,{productExternalId:product,substanceExternalId:s.code,substanceNormalizedName:s.normalizedName,confidence:'high'});}}
      }
    }
    reports.push(result);
  }
  return {substances,relations,reports,conflicts:[...conflicts.entries()]};
}
// Recognize only unambiguous leading label strengths; never interpret package volume as strength.
function parsePresentationLabel(label){
 const s=clean(label).toUpperCase().replace(/\s+/g,' ');const unit='(?:MG|MCG|G|UI|%)';const token=`([0-9]+(?:[,.][0-9]+)?)\\s*(${unit})(?:\\s*/\\s*(ML|G|DOSE))?`;
 const head=new RegExp('^'+token+'(?:\\s*\\+\\s*'+token+')*','i').exec(s);
 let strengths=[];let rest=s;
 if(head){rest=s.slice(head[0].length).trim();const split=head[0].split(/\s*\+\s*/);strengths=split.map(x=>{const m=new RegExp('^'+token+'$','i').exec(x);return m&&{value:m[1].replace(',','.'),unit:m[2]+(m[3]?'/'+m[3]:'')};});if(!strengths.every(x=>x&&Number(x.value)>0)||/^[+\/\d.,]/.test(rest))strengths=[];}
 const words=rest.split(' ');const forms=[['SOL OTO','solução otológica','otologica'],['SUS OTO','suspensão otológica','otologica'],['SOL OFT','solução oftálmica','oftalmica'],['SUS OFT','suspensão oftálmica','oftalmica'],['SOL OR','solução oral','oral'],['SUS OR','suspensão oral','oral'],['COM REV','comprimido revestido',null],['COM','comprimido',null],['CAP','cápsula',null],['SOL INJ','solução injetável','injetavel']];
 const found=forms.find(([prefix])=>rest===prefix||rest.startsWith(prefix+' '));const routes=[...new Set(words.filter(x=>['OTO','OFT','OR','INJ'].includes(x)))];const controlled=/\bLIB CONT\b/.test(rest), prolonged=/\bLIB PROL\b/.test(rest);const release=controlled===prolonged?null:controlled?'liberacao_controlada':'liberacao_prolongada';
 return {strengths,form:found&&routes.length<=1?found[1]:null,route:found&&routes.length<=1?found[2]:null,release,raw:label,status:strengths.length&&found&&routes.length<=1&&!(controlled&&prolonged)?'parsed_candidate':'inconclusive'};
}
// Global historical-code conflicts must not propagate into a new product relation.
function historicalCodeIndex(snapshot){
 const owners=new Map(),bySub=new Map();
 const claim=(code,id)=>{if(!code)return;if(!owners.has(code))owners.set(code,new Set());owners.get(code).add(id);};
 for(const s of snapshot.substances)claim(s.external_id,s.id);
 for(const l of snapshot.links){claim(l.external_substance_id,l.substance_id);if(l.external_substance_id){if(!bySub.has(l.substance_id))bySub.set(l.substance_id,new Set());bySub.get(l.substance_id).add(l.external_substance_id);}}
 const blocked=new Set();
 for(const s of snapshot.substances){const codes=bySub.get(s.id)||new Set();if(s.external_id&&(Array.from(codes).some(c=>c!==s.external_id)||(owners.get(s.external_id)?.size||0)>1))blocked.add(s.id);}
 return {owners,bySub,blocked};
}
function reconcileSnapshot(snapshot,official){
 const historical=historicalCodeIndex(snapshot);
 const pByExt=new Map(), sByExt=new Map(), sByName=new Map(), links=new Map();
 for(const p of snapshot.products)if(p.external_id)pushMap(pByExt,p.external_id,p);
 for(const s of snapshot.substances){if(s.external_id)pushMap(sByExt,s.external_id,s);if(s.canonical_name_normalized)pushMap(sByName,s.canonical_name_normalized,s);}
 for(const l of snapshot.links)pushMap(links,l.product_id,l);
 const sById=new Map(snapshot.substances.map(s=>[s.id,s]));const reports=[], additions=[];
 const officialByProduct=new Map(official.reports.map(r=>[r.productExternalId,r]));
 for(const p of snapshot.products){
  const report=officialByProduct.get(p.external_id), existing=links.get(p.id)||[];const item={productId:p.id,externalId:p.external_id,active:p.active,status:'inconclusive',reasons:[],existing:existing.map(l=>l.substance_id),additions:[]};
  if(!report||report.status!=='complete'){item.status=report?.status||'inconclusive';item.reasons.push(report?.status||'no_official_record');reports.push(item);continue;}
  if(pByExt.get(p.external_id)?.length!==1||!report.identity.name||norm(p.product_name)!==norm(report.identity.name)||!report.identity.registration||!/^\d+$/.test(report.identity.registration)||report.identity.registration!==p.registration_number||norm(report.identity.manufacturer)!==norm(p.manufacturer)||!['ativo','inativo'].includes(report.identity.active)||(report.identity.active==='ativo')!==p.active){item.status='ambiguous';item.reasons.push('product_identity_missing_conflicting_or_changed');reports.push(item);continue;}
  const wanted=new Map(report.resolved.map(s=>[s.code,s]));
  const incompatible=existing.some(l=>{const s=sById.get(l.substance_id);return !s||!wanted.has(s.external_id)||wanted.get(s.external_id).normalizedName!==s.canonical_name_normalized||norm(wanted.get(s.external_id).name)!==norm(s.canonical_name)||!s.active||historical.blocked.has(s.id)|| (l.external_substance_id && l.external_substance_id!==s.external_id);});
  if(incompatible){item.status='ambiguous';item.reasons.push('existing_link_conflicts_preserve');reports.push(item);continue;}
  for(const expected of report.resolved){const byCode=sByExt.get(expected.code)||[],byName=sByName.get(expected.normalizedName)||[];if(byCode.length!==1||byName.length!==1||byCode[0].id!==byName[0].id||!byCode[0].active||historical.blocked.has(byCode[0].id)||norm(byCode[0].canonical_name)!==norm(expected.name)){item.reasons.push('substance_missing_or_ambiguous:'+expected.code);continue;}const s=byCode[0];if(!existing.some(l=>l.substance_id===s.id))item.additions.push({product_id:p.id,substance_id:s.id,external_substance_id:expected.code,sourceRows:expected.witnessRows,productRows:report.rows});}
  if(item.reasons.length){item.status='partial';item.additions=[];}else{item.status=item.additions.length?'recoverable':'already_complete';additions.push(...item.additions);}
  reports.push(item);
 }
 return {reports,additions,proposedOnly:true};
}
module.exports={codesOf,reconcileOfficialRows,parsePresentationLabel,reconcileSnapshot,historicalCodeIndex};
