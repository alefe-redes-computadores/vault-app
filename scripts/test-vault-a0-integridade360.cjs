#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
function portion(txt,from,to){const a=txt.indexOf(from),b=txt.indexOf(to,a+from.length);assert(a>=0&&b>a,`secao ${from}`);return txt.slice(a,b)}
const sync=read('hooks/useSyncQueue.ts');
const types=read('lib/types.ts');
const pull=read('lib/sync/pull.ts');
const guard=read('lib/sync/a0-preserve-local-parity.ts');
const sql1=read('docs/VAULT-A0-001-STORAGE.sql');
const sql2=read('docs/VAULT-A0-002-PARIDADE.sql');
const cirurgia=portion(sync,'  const syncCirurgia =','  // ============================================================\n  // RENOVAÇÕES');
const tratamento=portion(sync,'  const syncTratamento =','  // ============================================================\n  // MEDICAMENTOS');
const hospital=portion(sync,'  const syncHospital =','  // ============================================================\n  // LOCAIS');
for(const key of ['tratamento_ids','cid_ids']){
 assert.match(cirurgia,new RegExp(key+':\\s*cirurgia\\.'+key+' \\?\\? null'),`A0 cirurgia envia ${key}`);
 assert.match(sql2,new RegExp('ADD COLUMN IF NOT EXISTS '+key+' uuid\\[\\]'),`A0 DDL cirurgia ${key}`);
}
for(const key of ['data_inicio','condicao']){
 assert.match(tratamento,new RegExp(key+':\\s*tratamento\\.'+key+' \\?\\? null'),`A0 tratamento envia ${key}`);
 assert.match(sql2,new RegExp('ADD COLUMN IF NOT EXISTS '+key+' (?:date|text)'),`A0 DDL tratamento ${key}`);
}
assert.match(hospital,/medico_ids:\s*hospital\.medico_ids\s*\|\|/,'A0 hospital push preservado');
assert.match(sql2,/ADD COLUMN IF NOT EXISTS medico_ids uuid\[\]/,'A0 coluna hospital');
assert(types.includes('export interface Cirurgia') && types.includes('export interface Tratamento'),'tipos legados preservados');
for(const t of ['cirurgias','tratamentos','hospitais']){
 const pattern=new RegExp('remoteTable:\\s*["\']'+t+'["\'][\\s\\S]{0,150}queueTable:\\s*["\']'+t+'["\'][\\s\\S]{0,150}localTable:\\s*db\\.'+t);
 assert.match(pull,pattern,`pull ${t} conectado ao Dexie`);
}
for(const [t,f] of [['cirurgias','preserveA0Cirurgia'],['tratamentos','preserveA0Tratamento'],['hospitais','preserveA0Hospital']]){
 assert.match(pull,new RegExp('remoteTable:\\s*["\']'+t+'["\'][\\s\\S]{0,160}mapRemote:\\s*'+f), 'mapRemote local preserve '+t);
}
assert.match(sql2,/NEW\.tratamento_ids := COALESCE\(NEW\.tratamento_ids, OLD\.tratamento_ids/,'upsert legado sem limpar cirurgia');
assert.match(sql2,/NEW\.data_inicio := COALESCE\(NEW\.data_inicio, OLD\.data_inicio/,'upsert legado sem apagar inicio');
assert.match(sql2,/LEFT JOIN public\.medicos m ON m\.id=target\.id AND m\.user_id=NEW\.user_id/,'hospital sem profissional alheio');
assert.match(sql2,/NEW\.medico_ids := OLD\.medico_ids/,'hospital preserva vinculos se cliente antigo enviar []');
assert.match(sql2,/c\.person_id=NEW\.person_id/,'surgery CID escopo pessoa');
assert.match(sql1,/p\.id::text = split_part\(storage\.objects\.name, '\/', 2\)/,'privado usa referencia qualificada de storage.objects.name');
assert(!sql1.includes('split_part(p.name'),'proibido path a partir de persons.name');
assert(!sql1.includes('FOR ALL TO public'),'proibido escrita universal');
assert(!sql1.includes('UPDATE storage.buckets'),'preserva flags de publicacao dos buckets');
for(const name of ['avatars','clinical-private','saude','documents']) assert(sql1.includes(name),'bucket presente '+name);
// Provas executáveis: não reintroduzir dados em outros escopos e não desfazer [] explícito.
const vm=require('node:vm');
const treatmentMeta={exports:{}};
vm.runInNewContext(ts.transpileModule(read("lib/health-profile/treatment-preferences-r03.ts"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:treatmentMeta,exports:treatmentMeta.exports});
const exported={exports:{}};
vm.runInNewContext(ts.transpileModule(guard,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:exported,exports:exported.exports,require:id=>{assert.equal(id,"../health-profile/treatment-preferences-r03");return treatmentMeta.exports;}});
const {preserveA0Cirurgia,preserveA0Tratamento,preserveA0Hospital}=exported.exports;
const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',person='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const local={user_id:account,person_id:person,tratamento_ids:['t'],cid_ids:['c'],data_inicio:'2021-01-02',condicao:'relatada',medico_ids:['m']};
const remote={user_id:account,person_id:person,tratamento_ids:null,cid_ids:null,data_inicio:null,condicao:null,medico_ids:null};
assert.deepEqual([...preserveA0Cirurgia(remote,local).tratamento_ids],['t'],'CID/vínculo local conhecido preservado');
assert.equal(preserveA0Tratamento(remote,local).data_inicio,'2021-01-02');
assert.deepEqual([...preserveA0Hospital(remote,local).medico_ids],['m']);
assert.deepEqual([...preserveA0Cirurgia({...remote,tratamento_ids:[]},local).tratamento_ids],[],'[] remoto explicito permanece []');
assert.equal(preserveA0Tratamento({...remote,user_id:'outra-conta'},local).condicao,null,'não misturar contas');
assert.equal(preserveA0Cirurgia({...remote,person_id:'outra-pessoa'},local).tratamento_ids,null,'não misturar pessoas');
const parsed=ts.transpileModule(sync,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
assert.equal((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'useSyncQueue TS sem erros sintaticos');
console.log('VAULT A0 MACRO1: contratos de seguranca, schema, push/pull, compatibilidade legada e TS OK');
