/* CI360 P6 P3 — testes reais da biblioteca PDF, sem banco remoto, sem dados pessoais. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {randomUUID}=require('node:crypto');
const read=p=>fs.readFileSync(p,'utf8');
const rows=[];
let user='owner-a';
const people=new Map([['person-a',{id:'person-a',user_id:'owner-a'}],['person-b',{id:'person-b',user_id:'owner-b'}]]);
const db={persons:{get:async(id)=>people.get(id)},careflow_reports_m2:{
  add:async(row)=>{rows.push(row);},
  get:async(id)=>rows.find(row=>row.id===id),
  delete:async(id)=>{let i=rows.findIndex(r=>r.id===id);if(i>=0)rows.splice(i,1);},
  where:()=>({equals:()=>({toArray:async()=>rows})}),
}};
const js=ts.transpileModule(read('lib/careflow-m2/pdf-library.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const m={exports:{}};
const aliases={
  '@/lib/db':{db},
  '@/lib/supabase/local-auth':{getLocalFirstAuthUser:async()=>({data:{user:user?{id:user}:null},error:null})},
};
vm.runInNewContext(js,{exports:m.exports,module:m,require:id=>{
  if(Object.hasOwn(aliases,id))return aliases[id];
  throw Error('Dependência inesperada na biblioteca: '+id);
},Blob,Date,JSON,Math,Number,String,Array,Object,Set,Map,RegExp,crypto:{randomUUID},console}, {filename:'pdf-library.ts',timeout:6000});
const lib=m.exports;
const make=(content,mime='application/pdf')=>new Blob([content],{type:mime});
(async()=>{
  assert.equal(await lib.hasPdfSignatureP6(make('%PDF-1.7\nalgum conteudo legivel')),true);
  assert.equal(await lib.hasPdfSignatureP6(make('Prologo conservador\n%PDF-1.4\nconteudo')),true);
  assert.equal(await lib.hasPdfSignatureP6(make('texto que nao e PDF, embora a extensao seja .pdf')),false);
  assert.equal(await lib.hasPdfSignatureP6(make('')),false);
  assert.equal(await lib.hasPdfSignatureP6(make('X'.repeat(12*1024*1024+1))),false);
  const pdf=make('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
  const args={title:'Dossiê da pessoa A',start:'2026-11-10',end:'2026-11-17',origin:'imported',blob:pdf};
  await assert.rejects(lib.pdfLibraryM2.add('person-b',args),/Pessoa divergente/);
  await assert.rejects(lib.pdfLibraryM2.add('person-a',{...args,blob:make('conteúdo falso')}),/assinatura PDF/);
  assert.equal(rows.length,0,'dados invalidos nao inseridos');
  let active=true;
  await assert.rejects(lib.pdfLibraryM2.add('person-a',{...args,scopeGuard:()=>!active}),/Pessoa\/conta alterada/);
  assert.equal(rows.length,0,'troca de titular não insere arquivo');
  const id=await lib.pdfLibraryM2.add('person-a',{...args,scopeGuard:()=>active});
  assert.equal(rows.length,1);
  assert.equal(rows[0].user_id,'owner-a');assert.equal(rows[0].person_id,'person-a');
  assert.equal(rows[0].id,id);
  assert.equal((await lib.pdfLibraryM2.get('person-a',id)).id,id);
  assert.equal(await lib.pdfLibraryM2.get('person-b',id),null);
  user='owner-b';assert.equal(await lib.pdfLibraryM2.get('person-a',id),null);
  await assert.rejects(lib.deleteLocalPdfM2('person-a',id),/não encontrado/);
  user='owner-a';await lib.deleteLocalPdfM2('person-a',id);assert.equal(rows.length,0);
  const ui=read('app/saude/careflow/relatorios/page.tsx');
  assert.ok(ui.includes('ConfirmationModal')&&!ui.includes('window.confirm('),'apagar exige modal premium');
  assert.ok(/scopeGuard\s*:\s*\(\)\s*=>\s*sameScopeP6\(scope\)/.test(ui)&&ui.includes('liveScopeP6.current'),'arquivamento bloqueia troca de pessoa');
  assert.ok(/onClick=\{\(\)\s*=>\s*requestDeleteP6\(file\.id,\s*file\.title\)\}/.test(ui),'exclusão usa gesto específico');
  assert.ok(ui.includes('ref={fileInputP6}')&&ui.includes('className="sr-only"')&&ui.includes('type="file"'),'seletor HTML invisível com entrada premium');
  assert.ok(ui.includes('CustomDatePicker')&&ui.includes('HealthRelationPicker'),'componentes de calendário e filtro preservados');
  assert.ok(ui.includes('sameScopeP6(scope)')&&/const\s+row\s*=\s*await\s+pdfLibraryM2\.get\(scope\.personId,\s*id\)/.test(ui),'download checa titular após await');
  assert.ok(!/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["'][^>]*>/gs.test(ui),'nenhum campo de data/hora HTML nativo');
  assert.ok(!/<select\b[^>]*>/.test(ui),'nenhum select HTML novo');
  const gate=read('scripts/test-v63-release-gate.mjs');
  assert.equal(gate.split('"scripts/test-vault-ci360-p6-p3-premium-pdf.cjs"').length,2,'P6 P3 uma vez no gate');
  for(const preserved of ['test-vault-ci360-m3-p1.cjs','test-vault-ci360-m3-p2.cjs','test-vault-ci360-m3-p3.cjs','test-vault-ui360-r4-final.cjs','test-vault-ui360-r5.cjs'])assert.ok(gate.includes(preserved),'regressao preservada '+preserved);
  const withdrawal=read('lib/withdrawal-agenda.ts');
  assert.ok(withdrawal.includes('isOpenWithdrawal')&&withdrawal.includes('conflictingWithdrawalM2'));
  assert.ok(fs.existsSync('app/saude/careflow/modo-medico/page.tsx'),'Modo Médico P3 preservado');
  console.log('CI360 P6 P3: assinatura real, biblioteca local, 2 titulares, ausência de vazamento, seleção premium, confirmação segura e gate V63 OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
