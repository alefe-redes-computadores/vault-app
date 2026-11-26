'use strict';
// Evidence-bound OFFLINE review. Never connects to a database, creates IDs or issues SQL.
const assert=require('node:assert/strict');
const {stable,hash,TABLES}=require('./catalog-integrity-snapshot-r01.cjs');
const {reconcileSnapshot,historicalCodeIndex}=require('./catalog-integrity-r01.cjs');
const digest=x=>hash(JSON.stringify(stable(x)));
const norm=x=>String(x??'').trim().normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
const key=l=>JSON.stringify([l.product_id,l.substance_id]);
const push=(m,k,v)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(v);};
function indexes(s){
 for(const name of Object.keys(TABLES))assert(Array.isArray(s[name]),'missing snapshot table '+name);
 const p=new Map(),sub=new Map(),byProduct=new Map(),bySub=new Map(),keys=new Set();
 for(const [rows,m,label] of [[s.products,p,'product'],[s.substances,sub,'substance']])for(const r of rows){assert(typeof r.id==='string'&&r.id&&!m.has(r.id),'invalid/duplicate '+label);m.set(r.id,r);}
 for(const l of s.links){assert(p.has(l.product_id)&&sub.has(l.substance_id),'orphan link');assert(!keys.has(key(l)),'duplicate link');keys.add(key(l));push(byProduct,l.product_id,l);push(bySub,l.substance_id,l);}
 return {p,sub,byProduct,bySub,keys};
}
function historicalCodeAudit(snapshot,official){
 const {bySub}=indexes(snapshot);const {owners,blocked}=historicalCodeIndex(snapshot);const proof=new Map();
 for(const r of official.reports)if(r.status==='complete')for(const s of r.resolved){if(!proof.has(s.code))proof.set(s.code,new Set());proof.get(s.code).add(norm(s.name));}
 const reviews=[];
 for(const s of snapshot.substances){const links=bySub.get(s.id)||[],codes=[...new Set(links.map(l=>l.external_substance_id).filter(Boolean))].sort();let status='consistent';let reasons=[];
  if(!s.external_id){if(codes.length>1){status='ambiguous';reasons.push('multiple_historical_codes_for_one_stable_id');}else if(codes.length===0){status='inconclusive';reasons.push('no_historical_code');}else {const c=codes[0],names=proof.get(c);if(new Set(owners.get(c)||[]).size!==1){status='ambiguous';reasons.push('code_claimed_by_multiple_substances');}else if(names?.size===1&&names.has(norm(s.canonical_name))){status='review_candidate';reasons.push('single_historical_code_corroborated_by_official_rows');}else{status='inconclusive';reasons.push('no_unique_exact_official_corroboration');}}}
  else if(blocked.has(s.id)){status='ambiguous';reasons.push('historical_or_duplicate_code_conflict');}
  if(status!=='consistent')reviews.push({substanceId:s.id,canonicalName:s.canonical_name,externalId:s.external_id??null,historicalCodes:codes,linkCount:links.length,status,reasons});
 }
 return {reviewOnly:true,automaticUpdates:0,substancesScanned:snapshot.substances.length,linksScanned:snapshot.links.length,reviews,counts:reviews.reduce((o,r)=>(o[r.status]=(o[r.status]||0)+1,o),{})};
}
function seal(payload){const detached=JSON.parse(JSON.stringify(payload));return {...detached,integritySHA256:digest(detached)};}
function unseal(plan){const {integritySHA256,...payload}=plan;assert.equal(digest(payload),integritySHA256,'review plan integrity mismatch');assert.equal(payload.mode,'OFFLINE_REVIEW_ONLY');assert.equal(payload.productionWrites,0);return payload;}
function buildReviewPlan(snapshot,official){
 const idx=indexes(snapshot);const ids=new Set();for(const r of official.reports){assert(!ids.has(r.productExternalId),'duplicate official product report');ids.add(r.productExternalId);}
 const result=reconcileSnapshot(snapshot,official), grouped=new Map(), additions=[];
 for(const l of result.additions){const row={product_id:l.product_id,substance_id:l.substance_id,external_substance_id:l.external_substance_id};assert(!idx.keys.has(key(row)),'unexpected existing relation');idx.keys.add(key(row));additions.push(row);push(grouped,row.product_id,{row,sourceRows:l.sourceRows,productRows:l.productRows});}
 const groups=[...grouped].map(([productId,operations])=>({productId,preProduct:idx.p.get(productId),preLinks:idx.byProduct.get(productId)||[],preSubstances:[...new Set([...operations.map(x=>x.row.substance_id),...(idx.byProduct.get(productId)||[]).map(x=>x.substance_id)])].map(id=>idx.sub.get(id)),operations,writeContract:{source_version_id:'REQUIRES_VERIFIED_NEW_SOURCE_VERSION',position:null,is_primary:false}}));
 const simulated={...snapshot,links:[...snapshot.links,...additions]};
 assert.equal(reconcileSnapshot(simulated,official).additions.length,0,'second reconciliation must be idempotent');
 const payload={mode:'OFFLINE_REVIEW_ONLY',productionWrites:0,sourceVersionBinding:'UNBOUND_UNTIL_OFFICIAL_MANIFEST_AND_GUARDIAN',beforeSHA256:digest(snapshot),afterSHA256:digest(simulated),groups,counts:{products:groups.length,links:additions.length},historicalCodes:historicalCodeAudit(snapshot,official)};
 return seal(payload);
}
function bindSources(plan,sourceManifest,snapshotManifest){
 const payload=unseal(plan);assert.equal(snapshotManifest?.status,'DOUBLE_READ_MATCH');assert.equal(snapshotManifest.sha256,payload.beforeSHA256,'snapshot manifest does not match plan');assert.equal(sourceManifest?.status,'COMPLETE');
 const required=['TA_CONSULTA_MEDICAMENTOS.CSV','TA_PRECOS_MEDICAMENTOS.csv','TA_RESTRICAO_MEDICAMENTO.csv'];const sources=required.map(name=>{const rows=sourceManifest.sources.filter(s=>s.name===name);assert.equal(rows.length,1,'source missing or duplicate '+name);const x=rows[0];assert(x.status==='DOWNLOADED'&&/^[a-f0-9]{64}$/.test(x.sha256)&&Number.isSafeInteger(x.bytes)&&x.bytes>0,'invalid source evidence');const u=new URL(x.effectiveUrl);assert(u.protocol==='https:'&&u.hostname==='dados.anvisa.gov.br'&&!u.username&&!u.password,'invalid official origin');return {name,url:x.url,effectiveUrl:x.effectiveUrl,sha256:x.sha256,bytes:x.bytes};});
 return seal({...payload,sourceVersionBinding:'BY_HASH_REVIEW_ONLY',sources,sourceManifestSHA256:digest(sourceManifest),snapshotManifestSHA256:digest(snapshotManifest)});
}
function simulatedOperations(p){return p.groups.flatMap(g=>g.operations.map(o=>o.row));}
function replayReviewPlan(snapshot,plan){const p=unseal(plan),d=digest(snapshot);if(d===p.afterSHA256)return snapshot;assert.equal(d,p.beforeSHA256,'snapshot drift before simulation');indexes(snapshot);const out={...snapshot,links:[...snapshot.links,...simulatedOperations(p).map(l=>({...l}))]};indexes(out);assert.equal(digest(out),p.afterSHA256,'unexpected simulation result');return out;}
function rollbackReviewPlan(snapshot,plan){const p=unseal(plan),d=digest(snapshot);if(d===p.beforeSHA256)return snapshot;assert.equal(d,p.afterSHA256,'snapshot drift before rollback');const remove=new Set(simulatedOperations(p).map(key));const out={...snapshot,links:snapshot.links.filter(l=>!remove.has(key(l)))};assert.equal(digest(out),p.beforeSHA256,'unexpected rollback result');return out;}
module.exports={historicalCodeAudit,buildReviewPlan,bindSources,replayReviewPlan,rollbackReviewPlan,digest};
// Independent snapshot-only stage: still useful if official download fails.
function auditVerifiedExport(exported){
 assert.equal(exported.manifest?.status,'DOUBLE_READ_MATCH','snapshot capture is not verified');
 assert.equal(exported.manifest.project,'gqxqbfkcgfhsqtwjlhvz','unexpected project');
 const s=exported.snapshot;indexes(s);assert.equal(digest(s),exported.manifest.sha256,'snapshot hash mismatch');
 for(const k of Object.keys(TABLES))assert.equal(s[k].length,exported.manifest.counts[k],'snapshot count mismatch '+k);
 const {audit}=require('./catalog-integrity-dry-run-r01.cjs');
 return {mode:'SNAPSHOT_AUDIT_ONLY',sourceRecovery:'NOT_REQUIRED_FOR_THIS_STAGE',officialComposition:'UNVERIFIED',productionWrites:0,snapshotManifest:exported.manifest,audit:audit(s),historicalCodes:historicalCodeAudit(s,{reports:[]})};
}
module.exports.auditVerifiedExport=auditVerifiedExport;
if(require.main===module){try{const fs=require('node:fs');const [mode,input,output]=process.argv.slice(2);assert(mode==='--audit-snapshot'&&input&&output,'Usage: --audit-snapshot <verified snapshot> <new report>');const result=auditVerifiedExport(JSON.parse(fs.readFileSync(input,'utf8')));fs.writeFileSync(output,JSON.stringify(result),{flag:'wx',mode:0o600});console.log('SNAPSHOT_AUDIT_ONLY',JSON.stringify({products:result.audit.tableCounts.products,links:result.audit.tableCounts.links,historicalCodeStatus:result.historicalCodes.counts,productionWrites:0}));}catch(e){console.error('SNAPSHOT_AUDIT_FAIL',e.message);process.exitCode=1;}}
