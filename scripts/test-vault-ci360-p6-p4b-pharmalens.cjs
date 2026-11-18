#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;const ok=(label,cond)=>{assert.ok(cond,label);checks++};
const mod='lib/health-intelligence/pharmalens-evidence-p4b.ts';
const comp='components/saude/PharmaLensEvidenceReviewP4B.tsx';
const doc='lib/health-intelligence/pharmalens-document-candidate-ci360.ts';
const studio='components/saude/PharmaLensDocumentStudioCI360.tsx';
const audit='lib/health-intelligence/pharmalens-catalog-audit-ci360.ts';
const v63='scripts/test-v63-release-gate.mjs';
for(const p of [mod,comp,doc,studio,audit]){
 const tree=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 ok('Sintaxe TS/TSX '+p,tree.parseDiagnostics.length===0);
}
function pure(p){const output=ts.transpileModule(read(p),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert.equal(output.diagnostics?.length||0,0,'Transpilação: '+p);
 const x={exports:{}};new Function('exports','module',output.outputText)(x.exports,x);return x.exports;}
const {buildPharmaLensEvidenceP4B,formatPharmaLensEvidenceP4B}=pure(mod);
const {analyzePharmaLensDocumentTextCI360}=pure(doc);
const t='2026-11-18T16:00:00Z';
const sample=analyzePharmaLensDocumentTextCI360('Medicamento: Produto X\nDosagem: 10 mg\nFabricante: Lab A\nLote: ABC12\nValidade: 29/02/2028\nRegistro MS: 1234567890123','manual_transcription',t).candidate;
const knowledge={facts:[{kind:'active_ingredient',label:'Princípio ativo',value:'Substância X',authority:'official_exact',source:{label:'Referência oficial vinculada'},catalogVersion:'reg-v1',verifiedAt:'2026-11-17'},
 {kind:'presentation',label:'Apresentações no catálogo',value:'10 mg · 20 mg',authority:'official_inferred',source:{label:'Fonte catálogo'}}],conflicts:[],coverage:'partial'};
const declared={name:'Produto X',strength:'10mg',manufacturer:'Lab B'};
const before=JSON.stringify({sample,knowledge,declared});
const result=buildPharmaLensEvidenceP4B(sample,declared,knowledge);
ok('nenhuma mutação da fonte',JSON.stringify({sample,knowledge,declared})===before);
ok('nome coincidente',result.fields.find(f=>f.field==='name').comparison==='coincide_textualmente');
ok('concentração espaçada coincidente',result.fields.find(f=>f.field==='strength').comparison==='coincide_textualmente');
ok('fabricante divergente',result.fields.find(f=>f.field==='manufacturer').comparison==='diverge_textualmente');
ok('lote sem cadastro não vira confirmado',result.fields.find(f=>f.field==='batch').comparison==='sem_comparacao');
ok('registro não validado',result.fields.find(f=>f.field==='registration').comparison==='sem_comparacao'&&!result.regulatoryValidated);
ok('catálogo separado da identidade comercial',result.catalogFacts[0].label==='Princípio ativo'&&result.fields.find(f=>f.field==='name').textValue==='Produto X');
ok('metadados fonte versionada',result.catalogFacts[0].version==='reg-v1'&&result.catalogFacts[0].verifiedAt==='2026-11-17');
ok('nenhuma autoridade comercial inventada',!result.mayAlterStock&&!result.mayAlterMedication&&!result.mayAlterPrescription&&!result.mayInferInteraction);
const formatted=formatPharmaLensEvidenceP4B(result);
ok('exportação sem texto bruto nem dados de escopo',!formatted.includes('user_id')&&!formatted.includes('person_id')&&!formatted.includes('rawText')&&!formatted.includes(t));
ok('relatório não é validação regulatória',formatted.includes('não comprova autenticidade'));
ok('sem informações exatas sem fonte',buildPharmaLensEvidenceP4B({...sample,reviewedByPerson:true},{name:'Outro'}, {facts:[],conflicts:[],coverage:'unavailable'}).catalogFacts.length===0);
ok('revisão local não promove oficial',buildPharmaLensEvidenceP4B({...sample,reviewedByPerson:true},declared,knowledge).regulatoryValidated===false);
for(const [date,expected] of [['31/04/2027',''],['29/02/2027',''],['29/02/2028','29/02/2028'],['31/12/2027','31/12/2027'],['02/2028','02/2028']]){
  const value=analyzePharmaLensDocumentTextCI360('Validade: '+date,'manual_transcription',t).candidate.expiry;
  ok('validade calendárica '+date,value===expected);
}
const ui=read(comp),s=read(studio),a=read(audit),g=read(v63);
for(const term of ['noopener noreferrer','Consultar registros na Anvisa','Consultar bulas na Anvisa','Copiar conferência manualmente','navigator.clipboard.writeText','regulatoryValidated:false']){
  if(term==='regulatoryValidated:false')ok('resultado oficial sempre falso',read(mod).includes(term));else ok('UI origem verificável: '+term,ui.includes(term));
}
ok('estúdio renderiza recibo dentro do escopo',s.includes('candidate&&analysis&&currentContextP3')&&s.includes('<PharmaLensEvidenceReviewP4B')&&s.includes('key={ownerKey}'));
ok('OCR continua sem escrita ou transmissão',!s.includes('supabase.from(')&&!s.includes('fetch(')&&!s.includes('localStorage.setItem('));
ok('catálogo não apresenta ingrediente como identidade comercial',!a.includes("['name','Nome',candidate.name,medication.nome,source]"));
ok('gate novo registrado uma vez',g.split('"scripts/test-vault-ci360-p6-p4b-pharmalens.cjs"').length===2);
ok('selo QG1 anterior preservado',g.includes('"scripts/test-vault-quality-gate-qg1.cjs"'));
console.log('CI360 P6 P4-B: '+checks+' verificações locais de fonte, calendário, privacidade e não-mutação OK');
