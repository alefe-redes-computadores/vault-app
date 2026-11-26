'use strict';
// Review-only preparation of a frozen official source. The existing canonical parser
// remains the only Node CSV reader. A ledger hash is integrity, NEVER authorization.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const fields=Object.freeze({
 'TA_CONSULTA_MEDICAMENTOS.CSV':['DS_REFERENCIA','QUOTED_FIELD_INTERNAL_LITERAL'],
 'TA_PRECOS_MEDICAMENTOS.csv':['DS_APRESENTACAO','LEADING_LITERAL_F_TOKEN'],
 'TA_RESTRICAO_MEDICAMENTO.csv':['DS_CONCENTRACAO','HTML_ENTITY_SEMICOLON']});
function bytes(b64){assert(typeof b64==='string','missing base64');const b=Buffer.from(b64,'base64');assert.equal(b.toString('base64'),b64,'noncanonical base64');return b;}
function derive(raw,s){
 assert(Object.hasOwn(fields,s.name),'unknown source');assert(hex(s.rawSHA256)&&hex(s.overlaySHA256)&&hex(s.fieldDigest),'invalid hash');assert.equal(sha(raw),s.rawSHA256,'raw drift');assert.equal(s.reversedSHA256,s.rawSHA256,'reversal commitment');assert.deepEqual(s.unresolved,[],'unresolved records');assert(Array.isArray(s.edits));assert.equal(s.counts.proposedRepairs,s.edits.length);assert.equal(sha(Buffer.from(JSON.stringify(s.edits))),s.editsSHA256,'ledger edit digest');
 let cursor=0,outLen=0,prevLine=0;const chunks=[],reversal=[];
 for(const e of s.edits){
  assert.equal(e.field,fields[s.name][0]);assert.equal(e.rule,fields[s.name][1]);assert.equal(e.candidateCount,1);assert(Number.isSafeInteger(e.byteOffset)&&e.byteOffset>=cursor&&e.byteOffset<raw.length,'bad offset');assert(Number.isSafeInteger(e.startLine)&&e.startLine>prevLine&&e.startLine===e.endLine,'bad physical record');assert(Number.isSafeInteger(e.fieldIndex)&&e.fieldIndex>=0);assert(typeof e.interpretedField==='string'&&typeof e.rawField==='string');
  const pre=bytes(e.rawBase64),post=bytes(e.postBase64);assert(pre.length&&post.length);assert.equal(sha(pre),e.rawSHA256);assert.equal(sha(post),e.postSHA256);assert(raw.subarray(e.byteOffset,e.byteOffset+pre.length).equals(pre),'preimage drift');
  const prefix=raw.subarray(cursor,e.byteOffset);chunks.push(prefix,post);outLen+=prefix.length;assert.equal(outLen,e.overlayOffset,'overlay offset drift');reversal.push({offset:outLen,pre,post});outLen+=post.length;cursor=e.byteOffset+pre.length;prevLine=e.endLine;
 }
 chunks.push(raw.subarray(cursor));const derived=Buffer.concat(chunks);assert.equal(sha(derived),s.overlaySHA256,'derived hash drift');
 let last=0;const back=[];for(const e of reversal){assert(derived.subarray(e.offset,e.offset+e.post.length).equals(e.post));back.push(derived.subarray(last,e.offset),e.pre);last=e.offset+e.post.length;}back.push(derived.subarray(last));assert(Buffer.concat(back).equals(raw),'reversal differs');
 return derived;
}
function verifyFields(derived,s,gen){
 const d=gen.decodeBuffer(derived);assert.equal(d.encoding,s.node.encoding,'encoding drift');const text=d.text.replace(/^\uFEFF/,'');const inspected=gen.inspectCsv(text,';');assert(inspected.valid,'strict CSV failed');assert.equal(inspected.digest,s.fieldDigest,'canonical field digest differs');assert.deepEqual(inspected.header,s.python.header);assert.deepEqual({...inspected.widths},s.python.widths);assert.equal(inspected.stats.records,s.counts.parsedRecords);assert.equal(inspected.blank,s.python.blank);
 const edits=new Map(s.edits.map(e=>[e.startLine,e]));const seen=new Set();gen.scanCsv(text,';',(row,loc)=>{const e=edits.get(loc.startLine);if(e){assert.equal(loc.endLine,e.endLine);assert.equal(inspected.header[e.fieldIndex],e.field);assert.equal(row[e.fieldIndex],e.interpretedField);seen.add(e.startLine);}});assert.equal(seen.size,edits.size,'missing repair physical location');return inspected;
}
function loadFrozenReview(rawDir,ledgerFile,expectedHash,tempDir,gen){
 assert(hex(expectedHash),'explicit ledger SHA-256 required');const lb=fs.readFileSync(ledgerFile);assert.equal(sha(lb),expectedHash,'ledger drift');const ledger=JSON.parse(lb);assert.equal(ledger.mode,'FROZEN_LEXICAL_LEDGER_REVIEW_ONLY');assert.equal(ledger.publication,'LOCKED');const contractBytes=fs.readFileSync(path.join(__dirname,'catalog-source-contract-r03.json'));const contract=JSON.parse(contractBytes);assert.equal(ledger.schemaVersion,contract.schemaVersion,'source schema drift');assert.equal(ledger.contractSHA256,sha(contractBytes),'source contract drift');assert(Array.isArray(ledger.sources)&&ledger.sources.length===3);assert.equal(new Set(ledger.sources.map(s=>s.name)).size,3);
 const mb=fs.readFileSync(path.join(rawDir,'SOURCE-MANIFEST.json'));assert.equal(sha(mb),ledger.manifestSHA256,'manifest drift');const manifest=JSON.parse(mb);assert.equal(manifest.status,'COMPLETE');assert.equal(manifest.supplementalStatus,'COMPLETE');assert.equal(manifest.sources.length,Object.keys(contract.sources).length);assert.deepEqual(manifest.sources.map(s=>s.name).sort(),Object.keys(contract.sources).sort());
 for(const s of manifest.sources){assert.equal(path.basename(s.name),s.name);assert.equal(s.url,contract.sources[s.name].url);assert(s.status==='DOWNLOADED'&&hex(s.sha256)&&hex(s.headersSHA256));const u=new URL(s.effectiveUrl);assert(u.protocol==='https:'&&u.hostname==='dados.anvisa.gov.br'&&!u.username&&!u.password);const b=fs.readFileSync(path.join(rawDir,s.name));assert.equal(b.length,s.bytes);assert.equal(sha(b),s.sha256,'official raw drift');assert.equal(sha(fs.readFileSync(path.join(rawDir,s.name+'.headers'))),s.headersSHA256,'header drift');}
 const loaded=[];const previous=process.env.PHARMALENS_SOURCE_DIR;try{process.env.PHARMALENS_SOURCE_DIR=tempDir;for(const src of Object.values(gen.SOURCES)){
  const s=ledger.sources.find(x=>x.name===src.label),m=manifest.sources.find(x=>x.name===src.label);assert(s&&m);assert.equal(s.dualPass,true,'independent parser approval missing');assert.deepEqual(s.python.header,contract.sources[s.name].header);assert.equal(m.url,src.url);assert.equal(m.sha256,s.rawSHA256);const raw=fs.readFileSync(path.join(rawDir,s.name));const derived=derive(raw,s);verifyFields(derived,s,gen);const file=path.join(tempDir,s.name);fs.writeFileSync(file,derived,{flag:'wx',mode:0o600});const dataset=gen.loadCsv(src,tempDir);assert.equal(dataset.hash,s.overlaySHA256);assert.equal(dataset.rows.length,s.node.good);loaded.push(dataset.rows);
 }}finally{if(previous===undefined)delete process.env.PHARMALENS_SOURCE_DIR;else process.env.PHARMALENS_SOURCE_DIR=previous;}
 return {rows:loaded,binding:{mode:'UNAPPROVED_LEXICAL_INTERPRETATION',publication:'LOCKED',originalManifest:manifest,manifestSHA256:ledger.manifestSHA256,ledgerSHA256:expectedHash,contractSHA256:ledger.contractSHA256,schemaVersion:ledger.schemaVersion,parserSHA256:sha(fs.readFileSync(require.resolve('./build-anvisa-canonical-package.js'))),sources:ledger.sources.map(s=>Object.fromEntries(['name','rawSHA256','overlaySHA256','reversedSHA256','fieldDigest','editsSHA256','counts'].map(k=>[k,s[k]])))}};
}
module.exports={derive,verifyFields,loadFrozenReview,sha};
