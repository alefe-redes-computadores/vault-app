const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(file){ const filename=path.resolve(file); if(filename.endsWith('.json.ts')) return {default:JSON.parse(fs.readFileSync(filename.slice(0,-3),'utf8')),__esModule:true}; const m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m.require=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports; }
const {isSupplyMedicationEligible:basic,hasRecordedSupplyWithdrawal:has,canTrackSupplyMedication:track}=load('lib/health-supply/medication-eligibility.ts');
const med={id:'clorpromazina',person_id:'p',user_id:'u',status:'descontinuado',tipo_uso:'continuo',nome:'Clorpromazina'};
const withdrawal={id:'w',person_id:'p',user_id:'u',medicamento_id:'clorpromazina',status:'agendada',data:'2026-10-20'};
assert.equal(basic(med),false);assert.equal(basic({...med,tipo_uso:'sos'}),true);
assert.equal(has(med,[withdrawal],'p','u'),true);
assert.equal(track(med,[withdrawal],'p','u'),true,'retirada explícita habilita vínculo sem reativação');
assert.equal(track(med,[{...withdrawal,status:'cancelada'}],'p','u'),false);
assert.equal(track(med,[{...withdrawal,status:'nao_realizada'}],'p','u'),false);
assert.equal(track(med,[{...withdrawal,person_id:'other'}],'p','u'),false);
assert.equal(track(med,[{...withdrawal,user_id:'other'}],'p','u'),false);
assert.equal(track(med,[{...withdrawal,medicamento_id:'outro'}],'p','u'),false);
assert.equal(track(med,[withdrawal],'other','u'),false);
assert.equal(track({...med,tipo_uso:'sos'},[],'p','u'),true);
const {withdrawalSupplySuggestions:suggest}=load('lib/health-supply/withdrawal-suggestions.ts');
const empty={processos:[],itens:[],ciclos:[],documentos:[]};
const matched=suggest('p',[med],[withdrawal],empty);assert.equal(matched.length,1);assert.equal(matched[0].medication.nome,'Clorpromazina');
assert.equal(suggest('other',[med],[withdrawal],empty).length,0);
assert.equal(suggest('p',[med],[{...withdrawal,status:'cancelada'}],empty).length,0);
const {treatmentSupplyMedicationIds:ids}=load('lib/health-supply/cycle-context.ts');
const treat={id:'t',person_id:'p',user_id:'u',medicamento_ids:['clorpromazina']};
assert.deepEqual(ids(treat,[med],'p','u'),[]);assert.deepEqual(ids(treat,[med],'p','u',[withdrawal]),['clorpromazina']);
for (const file of ['app/saude/documentos/page.tsx','app/saude/documentos/novo/page.tsx','app/saude/documentos/editar/page.tsx','app/saude/fornecimento/page.tsx']) {
  const s=fs.readFileSync(file,'utf8');
  assert(s.includes('medicamentosIncluindoDescontinuados: medicamentos'),file+' still uses only active medications');
  const t=ts.transpileModule(s,{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX}});
  assert.equal((t.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file+' syntax');
}
const supply=fs.readFileSync('app/saude/fornecimento/page.tsx','utf8');
assert(supply.includes('canTrackSupplyMedication(m, retiradas'),'supply options must include recorded pickups');
assert(supply.includes('withdrawals={retiradas}'),'new/edit forms pass real withdrawals');
assert(supply.includes('canTrackSupplyMedication(m,withdrawals,pid,process.user_id)'),'cycles show backed supply');
const repo=fs.readFileSync('lib/repositories/healthSupply.ts','utf8');
assert(repo.includes('canTrackSupplyMedication(med,knownWithdrawals,pid,uid)'),'backend inclusion supports explicit withdrawal');
assert(repo.includes('canTrackSupplyMedication(m,knownWithdrawals,personId,uid)'),'backend creation scoped');
console.log('V155 R2: clorpromazina SOS e retirada existente acessíveis em documentos e fornecimento; isolamento e rotina preservados');
