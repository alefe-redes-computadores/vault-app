#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=file=>fs.readFileSync(file,'utf8');
let count=0;
const ok=(condition,label)=>{assert.ok(condition,'CI360 P4: '+label);console.log(`✓ ${++count}: ${label}`)};
function load(path,imports={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const box={exports:{}};new Function('module','exports','require',js)(box,box.exports,name=>{if(Object.hasOwn(imports,name))return imports[name];throw Error('P4 mock inesperado: '+name)});return box.exports;
}
const core='lib/health-intelligence/pharmalens-document-candidate-ci360.ts';
const audit='lib/health-intelligence/pharmalens-catalog-audit-ci360.ts';
const studio='components/saude/PharmaLensDocumentStudioCI360.tsx';
const timeline='components/saude/PharmaLensLotEvidenceCI360.tsx';
const workspace='components/saude/PharmaLensWorkspaceV7.tsx';
const gate='scripts/test-v63-release-gate.mjs';
for(const file of [core,audit,studio,timeline,workspace]){
 const src=read(file);const tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok(tree.parseDiagnostics.length===0,'TS/TSX parser '+file);
}
const parsed=load(core),timestamp='2026-11-16T10:00:00.000Z';
const examples=[
 ['Medicamento: Zolpidem\nDosagem: 10 mg\nLote: AB12-345\nValidade: 08/2028\nRegistro MS: 1234.5678.90123\nFabricado por: Laboratório Exemplo',
  ['name','Zolpidem','strength','10 mg','batch','AB12-345','expiry','08/2028','registration','1234567890123']],
 ['PRODUTO: Outro Nome\nLOTE: 9921-2\nVAL. 11/2027\nReg ANVISA: 9876543210123',
  ['name','Outro Nome','batch','9921-2','expiry','11/2027','registration','9876543210123']],
];
for(const [i,pattern] of examples.entries()){
 const result=parsed.analyzePharmaLensDocumentTextCI360(pattern[0],'local_ocr',timestamp);
 const expected=pattern[1];for(let k=0;k<expected.length;k+=2)ok(result.candidate[expected[k]]===expected[k+1],`extração ${i} ${expected[k]}`);
 ok(result.candidate.origin==='local_ocr'&&!result.candidate.reviewedByPerson,'OCR nunca se autoconfirma');
 ok(result.candidate.rawText===pattern[0],'texto original preservado apenas em memória');
}
const missing=parsed.analyzePharmaLensDocumentTextCI360('sem campos válidos','manual_transcription',timestamp);
for(const f of ['batch','registration','expiry','strength'])ok(!missing.candidate[f],'campo não inferido: '+f);
ok(missing.limitations.some(x=>x.includes('não será inferido')),'registro faltante explicitado');
ok(missing.limitations.some(x=>x.includes('Validade não identificada')),'validade faltante explicitada');
ok(parsed.analyzePharmaLensDocumentTextCI360('Medicamento: Teste\nDosagem: 10 mg/mL','manual_transcription',timestamp).candidate.strength==='10 mg/mL','concentração mg/mL preservada sem conversão para dose');
let bad=parsed.analyzePharmaLensDocumentTextCI360('Validade: 19/2027\nLote: C012\nRegistro MS: 1234567890123','manual_transcription',timestamp);
ok(!bad.candidate.expiry,'mês impossível não é validade');
ok(bad.candidate.batch==='C012','lote não requer compra');
const changed=parsed.updatePharmaLensCandidateFieldCI360({...bad.candidate,reviewedByPerson:true},'batch','NOVO-1');
ok(!changed.reviewedByPerson&&changed.batch==='NOVO-1','edição anula conferência anterior');
ok(bad.candidate.batch==='C012','edição não altera objeto original');
ok(parsed.candidateFieldsCI360(changed)===2,'contagem dos campos presentes não fabrica campos');
const oversized='Medicamento: A\n'+('x'.repeat(16000));
ok(parsed.analyzePharmaLensDocumentTextCI360(oversized,'local_ocr',timestamp).candidate.rawText.length===12000,'texto limita 12 mil caracteres');
for(const mime of ['image/jpeg','image/png','image/webp'])ok(parsed.validateLocalPhotoCI360({type:mime,size:100000})===null,'formato de imagem seguro '+mime);
for(const mime of ['application/pdf','image/svg+xml','text/plain','image/heic'])ok(parsed.validateLocalPhotoCI360({type:mime,size:100000})!==null,'formato não suportado '+mime);
ok(parsed.validateLocalPhotoCI360({type:'image/png',size:11*1024*1024})!==null,'limite de 10 MB');
ok(parsed.validateLocalPhotoCI360({type:'image/png',size:0})!==null,'arquivo vazio bloqueado');
const fakeKnowledge={coverage:'partial',conflicts:[],facts:[
 {kind:'active_ingredient',authority:'official_inferred',value:'Zolpidem',source:{label:'Catálogo já vinculado'},catalogVersion:'v9',verifiedAt:'2026-11-12'},
 {kind:'presentation',authority:'official_inferred',value:'10 mg',source:{label:'Catálogo já vinculado'},catalogVersion:'v9'},
]};
const fakeResolver={resolveMedicationKnowledgeM153P4:()=>fakeKnowledge};
const compare=load(audit,{'@/lib/medication-intelligence/knowledge-resolver-m153p4':fakeResolver});
const candidate=parsed.analyzePharmaLensDocumentTextCI360(examples[0][0],'local_ocr',timestamp).candidate;
const medication={nome:'Zolpidem',dosagem:'10 mg',laboratorio_etiqueta:'Laboratório Exemplo',tipo_receita:'azul',formato:'comprimido'};
const rows=compare.auditPharmaLensDocumentCI360(candidate,medication);
ok(rows.rows.length===6,'seis campos auditáveis');
ok(rows.coverage==='partial'&&!rows.hasOfficialExact,'referência inferida não vira exata');
ok(rows.rows.find(x=>x.field==='name').status==='concorda_com_cadastro','nome idêntico coincide apenas localmente');
ok(rows.rows.find(x=>x.field==='strength').status==='concorda_com_cadastro','dosagem idêntica coincide localmente');
ok(rows.rows.find(x=>x.field==='batch').status==='conferir_catalogo','lote nunca vira histórico automático');
ok(rows.rows.find(x=>x.field==='registration').note.includes('Anvisa'),'registro aparente não é registro validado');
ok(rows.provenance.includes('Catálogo já vinculado'),'fonte e versão retidas');
const inconsistent={...candidate,name:'Outro produto',manufacturer:'Outro laboratório'};
const conflict=compare.auditPharmaLensDocumentCI360(inconsistent,medication);
ok(conflict.conflicts>=2,'divergência de cadastro preservada');
ok(conflict.rows.find(x=>x.field==='name').status==='diverge_do_cadastro','não sobrescrever nome');
ok(conflict.rows.find(x=>x.field==='manufacturer').status==='diverge_do_cadastro','não sobrescrever fabricante');
const official={...fakeKnowledge,coverage:'verified',facts:[{kind:'active_ingredient',authority:'official_exact',value:'Zolpidem',source:{label:'Referência vinculada'}}]};
ok(compare.auditPharmaLensDocumentCI360(candidate,medication,official).hasOfficialExact,'apenas fato já rotulado official_exact sustenta selo');
const empty={coverage:'unavailable',facts:[],conflicts:[]};
ok(!compare.auditPharmaLensDocumentCI360(candidate,medication,empty).hasOfficialExact,'sem catálogo não inventa selo oficial');
const s=read(studio),w=read(workspace),t=read(timeline),g=read(gate);
for(const literal of ['TextDetector','createImageBitmap','bitmap?.close()','URL.revokeObjectURL','validateLocalPhotoCI360','local_ocr','manual_transcription','role="status"','aria-pressed={candidate.reviewedByPerson}','Descartar imagem, texto e candidato desta sessão'])ok(s.includes(literal),'interface OCR/privacidade '+literal);
for(const forbidden of ['supabase.from(','.upsert(', 'db.medicamentos.put(', 'db.renovacoes.add(', 'localStorage.setItem(', 'navigator.sendBeacon(', 'fetch(', 'XMLHttpRequest'])ok(!s.includes(forbidden),'estúdio não transmite nem grava: '+forbidden);
ok(w.includes('<PharmaLensGuidedReviewP6')&&w.includes('PharmaLensDocumentStudioCI360'),'conferência antiga preservada e estúdio opcional incluído');
ok(w.includes('PharmaLensLotEvidenceCI360')&&w.includes('report={report} observations={observations}'),'aquisições existentes mantidas como fatos separados');
ok(w.includes('scopeKey')&&w.includes('selected.id')&&w.includes('snapshot'),'estúdio na pessoa e medicação selecionadas');
ok(t.includes('cycle.acquiredAt')&&t.includes('cycle.startedAt')&&t.includes('cycle.checkIns'),'aquisição, início e relato separados');
ok(t.includes('não se vincula automaticamente')&&t.includes('não demonstra causalidade'),'nunca atribui fabricante ou causalidade por OCR');
ok(g.includes('"scripts/test-vault-ci360-p3-longitudinal.cjs",\n  "scripts/test-vault-ci360-p4-pharmalens.cjs",'),'P4 integrada após P3, sem remover contratos');
console.log(`CI360 P4 — ${count} verificações comportamentais, fonte e privacidade aprovadas`);
