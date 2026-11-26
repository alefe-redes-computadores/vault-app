'use strict';
// Offline only. No database client, credentials, network or production approval path.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {stable,TABLES}=require('./catalog-integrity-snapshot-r01.cjs');
const {digest,replayReviewPlan,rollbackReviewPlan}=require('./catalog-integrity-review-r02.cjs');
const {historicalCodeIndex}=require('./catalog-integrity-r01.cjs');
const contract=require('./catalog-source-contract-r03.json');
const HEX=/^[a-f0-9]{64}$/;
const fileHash=name=>crypto.createHash('sha256').update(fs.readFileSync(require.resolve(name))).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid=s=>typeof s==='string'&&UUID.test(s);
function verifyReviewInput(report,exported){
 assert.equal(report.mode,'DRY_RUN_UNAPPROVED_OVERLAY_REVIEW_ONLY');assert.equal(report.publication,'LOCKED');assert.equal(report.productionWrites,0);assert.equal(report.readyForPublication,false);
 const p=report.reviewPlan,b=report.sourceOverlayBinding,s=exported.snapshot,m=exported.manifest;
 assert.equal(p.mode,'OFFLINE_REVIEW_ONLY');assert.equal(p.productionWrites,0);assert.equal(p.sourceVersionBinding,'UNBOUND_UNTIL_OFFICIAL_MANIFEST_AND_GUARDIAN');
 assert.equal(b.mode,'UNAPPROVED_LEXICAL_INTERPRETATION');assert.equal(b.publication,'LOCKED');assert.equal(digest(b),report.sourceOverlayBindingSHA256,'binding seal mismatch');
 assert.deepEqual(b.snapshotManifest,m);assert.equal(m.project,'gqxqbfkcgfhsqtwjlhvz');assert.equal(m.status,'DOUBLE_READ_MATCH');assert.equal(m.transactional,false);assert.equal(digest(s),m.sha256);assert.equal(p.beforeSHA256,m.sha256);
 for(const k of Object.keys(TABLES))assert(Array.isArray(s[k])&&s[k].length===m.counts[k],`snapshot incomplete: ${k}`);
 assert.equal(b.schemaVersion,contract.schemaVersion);for(const k of ['manifestSHA256','ledgerSHA256','contractSHA256','parserSHA256'])assert(HEX.test(b[k]),`missing ${k}`);
 assert.equal(b.contractSHA256,fileHash('./catalog-source-contract-r03.json'),'source contract drift');assert.equal(b.parserSHA256,fileHash('./build-anvisa-canonical-package.js'),'canonical parser drift');
 const sources=b.originalManifest.sources;assert.equal(b.originalManifest.status,'COMPLETE');assert.equal(b.originalManifest.supplementalStatus,'COMPLETE');assert.deepEqual(sources.map(x=>x.name).sort(),Object.keys(contract.sources).sort());
 for(const src of sources){assert.equal(src.url,contract.sources[src.name].url);const u=new URL(src.effectiveUrl);assert(u.protocol==='https:'&&u.hostname==='dados.anvisa.gov.br'&&!u.username&&!u.password);assert(src.status==='DOWNLOADED'&&HEX.test(src.sha256)&&HEX.test(src.headersSHA256)&&Number.isSafeInteger(src.bytes)&&src.bytes>0);}
 assert.equal(b.sources.length,3);assert.equal(new Set(b.sources.map(x=>x.name)).size,3);for(const src of b.sources){assert.equal(src.rawSHA256,sources.find(x=>x.name===src.name)?.sha256);assert.equal(src.reversedSHA256,src.rawSHA256);for(const k of ['overlaySHA256','fieldDigest','editsSHA256'])assert(HEX.test(src[k]));}
 const {blocked}=historicalCodeIndex(s),pairs=new Set(),groups=new Set(),products=new Map(s.products.map(x=>[x.id,x])),subs=new Map(s.substances.map(x=>[x.id,x])),preLinks=new Map();for(const l of s.links){if(!preLinks.has(l.product_id))preLinks.set(l.product_id,[]);preLinks.get(l.product_id).push(l);}
 for(const g of p.groups){assert(uuid(g.productId)&&!groups.has(g.productId),'duplicate/invalid group');groups.add(g.productId);assert.deepEqual(g.preProduct,products.get(g.productId));assert.deepEqual(g.preLinks,preLinks.get(g.productId)||[]);assert(g.operations.length>0);assert.deepEqual(g.writeContract,{source_version_id:'REQUIRES_VERIFIED_NEW_SOURCE_VERSION',position:null,is_primary:false});const seenSubs=new Set(g.preSubstances.map(x=>x.id));assert.equal(seenSubs.size,g.preSubstances.length);for(const pre of g.preSubstances)assert.deepEqual(pre,subs.get(pre.id));for(const op of g.operations){const row=op.row,k=JSON.stringify([row.product_id,row.substance_id]);assert.equal(row.product_id,g.productId);assert(uuid(row.substance_id)&&seenSubs.has(row.substance_id)&&!blocked.has(row.substance_id)&&!pairs.has(k));assert(typeof row.external_substance_id==='string'&&/^\d+$/.test(row.external_substance_id)&&row.external_substance_id!=='25489','blocked/invalid external code');assert(Array.isArray(op.sourceRows)&&op.sourceRows.length&&op.sourceRows.every(x=>Number.isSafeInteger(x)&&x>0));assert(Array.isArray(op.productRows)&&op.productRows.length&&op.productRows.every(x=>Number.isSafeInteger(x)&&x>0));pairs.add(k);}}
 assert.equal(groups.size,p.counts.products);assert.equal(pairs.size,p.counts.links);const after=replayReviewPlan(s,p);assert.equal(digest(rollbackReviewPlan(after,p)),p.beforeSHA256);assert.equal(digest(replayReviewPlan(after,p)),p.afterSHA256);
 const rawSource=sources.find(x=>x.name==='TA_CONSULTA_MEDICAMENTOS.CSV');
 const payload={format:'VAULT_PHARMALENS_INCREMENTAL_ENVELOPE_R03',mode:'REVIEW_ONLY',publication:'LOCKED',productionWrites:0,planSeal:p.integritySHA256,sourceOverlayBindingSHA256:report.sourceOverlayBindingSHA256,snapshotSHA256:p.beforeSHA256,simulatedSHA256:p.afterSHA256,counts:p.counts,rawSourceSHA256:rawSource.sha256,sourceManifestSHA256:b.manifestSHA256,ledgerSHA256:b.ledgerSHA256,parserSHA256:b.parserSHA256,officialVersionAuthorization:null,officialFieldDocumentation:'CONSULTA_45_COLUMNS_PENDING',licenseReview:'PENDING_FINAL_GUARDIAN',sourceVersionBinding:'UNBOUND',requiredAuthorization:['independent lexical interpretation','official field/identity evidence','version authorization','final code certification','isolated PostgreSQL QA','specific production authorization']};
 return {...payload,envelopeSHA256:digest(payload)};
}
function quoteJson(x){return "'"+JSON.stringify(x).replace(/'/g,"''")+"'::jsonb";}
function createLabFixture(report,exported,envelope){
 // New UUIDs are exclusively laboratory identifiers; never medicine/product IDs.
 assert.equal(envelope.mode,'REVIEW_ONLY');assert.equal(envelope.officialVersionAuthorization,null);const {envelopeSHA256,...body}=envelope;assert.equal(digest(body),envelopeSHA256);
 assert.equal(report.reviewPlan.integritySHA256,envelope.planSeal);assert.equal(exported.manifest.sha256,envelope.snapshotSHA256);
 const versionId=crypto.randomUUID(),authorizationId=crypto.randomUUID(),now=new Date().toISOString();
 return {mode:'ISOLATED_LAB_ONLY',authorizationId,version:{id:versionId,source_key:'lab_only',source_name:'LAB FIXTURE — NOT OFFICIAL',source_url:null,version:'lab:'+envelope.rawSourceSHA256,published_at:null,imported_at:now,active:false,notes:'TEST ONLY',created_at:now,source_updated_at:null,content_hash:envelope.rawSourceSHA256,superseded_at:null},envelope,plan:report.reviewPlan,snapshot:exported.snapshot};
}
function fixtureSQL(f){
 assert.equal(f.mode,'ISOLATED_LAB_ONLY');assert(uuid(f.authorizationId)&&uuid(f.version.id));assert.equal(f.version.source_key,'lab_only');
 return `SET standard_conforming_strings=on;\nSELECT vault_catalog_lab_r03.load_fixture(${quoteJson(f)});\n`;
}
module.exports={verifyReviewInput,createLabFixture,fixtureSQL,quoteJson};
if(require.main===module){try{const [mode,r,s,out]=process.argv.slice(2);assert(['--envelope','--lab-fixture'].includes(mode)&&r&&s&&out,'usage: --envelope|--lab-fixture <real report> <frozen snapshot> <new output>');const report=JSON.parse(fs.readFileSync(r,'utf8')),exported=JSON.parse(fs.readFileSync(s,'utf8'));const envelope=verifyReviewInput(report,exported);const output=mode==='--envelope'?JSON.stringify(envelope,null,2)+'\n':fixtureSQL(createLabFixture(report,exported,envelope));fs.writeFileSync(out,output,{flag:'wx',mode:0o600});console.log('REVIEW_ENVELOPE_PASS',JSON.stringify({seal:envelope.envelopeSHA256,counts:envelope.counts,productionWrites:0,publication:'LOCKED',mode}));}catch(e){console.error('REVIEW_ENVELOPE_FAIL',e.stack||e.message);process.exitCode=1;}}
