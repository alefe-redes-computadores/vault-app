'use strict';
/** M119: pure behavior + integration invariants. No real health database opened. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let checks=0;
const test=(name,run)=>{try{run();checks++;console.log(`M119 OK ${checks}: ${name}`);}catch(e){console.error(`M119 FALHA: ${name}`);throw e;}};
const read=p=>fs.readFileSync(p,'utf8');
const path='lib/health-intelligence/trust-spine-m119.ts';
const code=read(path);
const trans=ts.transpileModule(code,{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
assert.equal((trans.diagnostics||[]).length,0,'TS pure core transpilation');
const m={exports:{}};
vm.runInNewContext('(function(module,exports){'+trans.outputText+'})',{console})(m,m.exports);
const {auditCareLinksM119,evidenceReceiptM119}=m.exports;
const plain=v=>JSON.parse(JSON.stringify(v));
const owner='owner-1',pid='person-1';
const medication=(x={})=>({id:'m1',user_id:owner,person_id:pid,nome:'Medicamento de teste',tratamento_ids:['t1'],cid_ids:['c1'],status:'ativo',...x});
const treatment=(x={})=>({id:'t1',user_id:owner,person_id:pid,nome:'Tratamento de teste',status:'ativo',cid_ids:['c1'],medicamento_ids:[],...x});
const document=(x={})=>({id:'doc1',user_id:owner,person_id:pid,title:'Documento de teste',...x});
const ctx=(x={})=>({userId:owner,personId:pid,medicamentos:[medication()],tratamentos:[treatment()],documentos:[document()],...x});

test('sem identidade: nenhum dado projetado',()=>{
  const result=auditCareLinksM119(ctx(),'','');
  assert.equal(result.state,'unavailable');assert.equal(result.total,0);
});
test('conta e pessoa divergentes bloqueadas',()=>{
  assert.equal(auditCareLinksM119(ctx(),'owner-2',pid).state,'unavailable');
  assert.equal(auditCareLinksM119(ctx(),owner,'person-2').state,'unavailable');
});
test('vínculo explícito e existente não gera suspeita',()=>{
  const r=auditCareLinksM119(ctx(),owner,pid);
  assert.equal(r.state,'ready');assert.equal(r.total,0);assert.equal(r.observed.medications,1);
});
test('referência ausente sugere revisão, não remoção',()=>{
  const c=ctx({medicamentos:[medication({tratamento_ids:['missing']})]});const before=JSON.stringify(c);
  const r=auditCareLinksM119(c,owner,pid);
  assert.ok(r.findings.some(f=>f.kind==='reference_unavailable'));
  assert.equal(JSON.stringify(c),before);
});
test('referência reversa legada não vira vínculo confirmado',()=>{
  const r=auditCareLinksM119(ctx({medicamentos:[medication({tratamento_ids:[]})],tratamentos:[treatment({medicamento_ids:['m1']})]}),owner,pid);
  assert.ok(r.findings.some(f=>f.kind==='legacy_reverse'));
});
test('CID compatível é candidato, nunca vínculo automático',()=>{
  const r=auditCareLinksM119(ctx({medicamentos:[medication({tratamento_ids:[]})]}),owner,pid);
  assert.ok(r.findings.some(f=>f.kind==='candidate_unconfirmed'&&f.detail.includes('NÃO confirma')));
});
test('tratamento ativo sem medicamento registrado não é diagnóstico',()=>{
  const r=auditCareLinksM119(ctx({medicamentos:[]}),owner,pid);
  assert.ok(r.findings.some(f=>f.kind==='no_recorded_link'&&f.level==='information'));
});
test('vínculo de documento fora do recorte pede verificação',()=>{
  const r=auditCareLinksM119(ctx({medicamentos:[medication({document_id:'missing'})]}),owner,pid);
  assert.ok(r.findings.some(f=>f.kind==='reference_unavailable'&&f.title.includes('documento')));
});
test('documento com vínculo explícito ausente mostra conferência sem mutação',()=>{
  const data=ctx({documentos:[document({entidade_tipo:'tratamento',entidade_id:'inexistente'})]});
  const before=JSON.stringify(data),result=auditCareLinksM119(data,owner,pid);
  assert.ok(result.findings.some(f=>f.title.includes('documento')&&f.route.startsWith('/saude/documentos/detalhes?id=')));
  assert.equal(JSON.stringify(data),before);
});
test('dados de outra pessoa ou conta não vazam nem viram vínculo válido',()=>{
  const mixed=ctx({
    medicamentos:[medication({tratamento_ids:['foreign-t']}),medication({id:'foreign-m',user_id:'owner-other',person_id:pid,nome:'SEGREDO-OUTRO'})],
    tratamentos:[treatment({id:'foreign-t',person_id:'person-2',nome:'SEGREDO-OUTRO'})],
    documentos:[document({id:'foreign-doc',person_id:'person-2',title:'SEGREDO-OUTRO'})],
  });
  const report=auditCareLinksM119(mixed,owner,pid);
  assert.deepEqual(plain(report.observed),{medications:1,treatments:0,documents:0});
  assert.ok(!JSON.stringify(report).includes('SEGREDO-OUTRO'));
});
test('achados limitados e determinísticos, sem efeitos colaterais',()=>{
  const many=Array.from({length:40},(_,i)=>medication({id:`m${i}`,tratamento_ids:['missing']}));
  const data=ctx({medicamentos:many,tratamentos:[treatment({status:'suspenso'})]}); const snapshot=JSON.stringify(data);
  const a=auditCareLinksM119(data,owner,pid),b=auditCareLinksM119(data,owner,pid);
  assert.equal(a.total,40);assert.equal(a.findings.length,18);assert.equal(a.truncated,true);
  assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(data),snapshot);
});
test('reload lógico preserva o resultado de leitura, sem escritas',()=>{
  const x=ctx({medicamentos:[medication({tratamento_ids:['t1','outro']})]});
  const a=auditCareLinksM119(x,owner,pid);
  const b=auditCareLinksM119(JSON.parse(JSON.stringify(x)),owner,pid);
  assert.deepEqual(plain(a),plain(b));
});
const insight=(x={})=>({id:'ins1',kind:'observation',categoria:'dados',titulo:'Insight de teste',mensagem:'Teste',urgencia:'baixa',confianca:'baixa',amostra:3,...x});
test('recibo parcial não inventa tempo, origem ou período',()=>{
  const r=evidenceReceiptM119(insight());
  assert.equal(r.days,null);assert.equal(r.coverage,null);
  assert.equal(r.dateStatus,'not_supplied');assert.equal(r.sourceStatus,'not_individualized');
});
test('recibo respeita cobertura e fontes declaradas',()=>{
  const r=evidenceReceiptM119(insight({amostra:5,periodoDias:28,coberturaDias:{observados:12,total:28},fontesInternas:['Doses','Doses','Tratamentos'],entidadeIds:['m1','m1'],evidencias:['fato']}));
  assert.equal(r.sample,5);assert.equal(r.days,28);
  assert.deepEqual(plain(r.coverage),{observed:12,total:28});
  assert.deepEqual(plain(r.declaredSourceNames),['Doses','Tratamentos']);
  assert.equal(r.referencedEntityCount,1);
});
test('recibo rejeita cobertura impossível',()=>{
  assert.equal(evidenceReceiptM119(insight({coberturaDias:{observados:30,total:7}})).coverage,null);
});
test('sem Dexie, rede, setItem ou enfileiramento nas projeções',()=>{
  assert.ok(!/\b(db\.|fetch\(|localStorage|setItem\(|enfileirarOperacao|\.put\(|\.update\()/.test(code));
});
test('Meu Saúde reaproveita snapshot do Brain por conta e pessoa',()=>{
  const page=read('app/saude/minha-saude/page.tsx');
  assert.ok(page.includes('<CareTrustPanelM119 context={intelligence.context} userId={person?.user_id || ""} personId={personId} onNavigate={goFromHealth} />'));
  assert.ok(page.includes('priorityCount={5}')&&page.includes('id="meu-avatar"'));
});
test('recibo é inserido no painel existente sem novo motor',()=>{
  const sheet=read('components/health-intelligence/HealthInsightExplanationSheet.tsx');
  assert.ok(sheet.includes('<EvidenceReceiptM119 insight={insight} />'));
  assert.ok(sheet.includes('getInternalSources(insight)'));
});
test('Modo Essencial e contrato M118 continuam intactos',()=>{
  const home=read('components/home/HomeCommandCenter.tsx');
  const toggle=read('components/home/HomeEssentialToggleM118.tsx');
  const nav=read('components/saude/ClinicalSectionNav.tsx');
  assert.ok(home.includes('vault:home:essential-changed')&&toggle.includes('window.localStorage.setItem(KEY'));
  assert.ok(nav.includes('compactFive')&&nav.includes('grid-cols-5'));
});
test('gate canônico inclui o contrato M119, sem remover o M118',()=>{
  const gate=read('scripts/test-v63-release-gate.mjs');
  assert.ok(gate.includes('scripts/test-vault-m118-global-ux.cjs')&&gate.includes('scripts/test-vault-m119-trust-spine.cjs'));
});
console.log(`VAULT M119: ${checks} contratos puros/integrados aprovados. Sem banco real, rede ou gravação.`);
