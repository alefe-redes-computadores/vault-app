const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');const root=path.resolve(__dirname,'..');
const f=path.join(root,'lib/health-supply/withdrawal-suggestions.ts');
function loadTs(filename,parent=module){
 const m=new Module(filename,parent);
 m.filename=filename;
 m.paths=Module._nodeModulePaths(path.dirname(filename));
 m.require=specifier=>{
  if(specifier.startsWith('.')){
   const source=path.resolve(path.dirname(filename),specifier);
   const next=source.endsWith('.ts')?source:source+'.ts';
   return loadTs(next,m);
  }
  if(specifier.startsWith('@/'))return loadTs(path.resolve(root,specifier.slice(2)+'.ts'),m);
  return require(specifier);
 };
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
 return m.exports;
}
const suggest=loadTs(f).withdrawalSupplySuggestions;
const meds=[{id:'m',nome:'Metadona',person_id:'p',user_id:'u',status:'ativo'},{id:'foreign',nome:'Outro',person_id:'other',user_id:'u'}];const r={id:'r',medicamento_id:'m',person_id:'p',user_id:'u',status:'agendada',data:'2026-10-20',farmacia_id:'state',local_id:'unit',medico_id:'doctor',exige_nova_receita:true};const data={processos:[],itens:[],ciclos:[],documentos:[]};const before=JSON.stringify({meds,r,data});
let rows=suggest('p',meds,[r,{...r,id:'old',data:'2026-09-20'},{...r,id:'wrong',user_id:'other',data:'2027-01-01'},{...r,id:'cancel',status:'cancelada',data:'2028-01-01'}],data);assert.equal(rows.length,1);assert.equal(rows[0].withdrawal.id,'r');assert.equal(rows[0].withdrawal.farmacia_id,'state');assert.equal(rows[0].existing,undefined);assert.equal(JSON.stringify({meds,r,data}),before);
const p={id:'process',person_id:'p',user_id:'u',status:'ativo'};rows=suggest('p',meds,[r],{...data,processos:[p],itens:[{processo_id:'process',medicamento_id:'m',person_id:'p',user_id:'u'}]});assert.equal(rows[0].existing.id,'process');assert.equal(suggest('other',meds,[r],data).length,0);assert.equal(suggest('p',[{...meds[0],status:'descontinuado'}],[r],data).length,1,'retirada real mantém vínculo logístico mesmo com rotina descontinuada');
assert.equal(suggest('p',[{...meds[0],status:'descontinuado',tipo_uso:'sos'}],[r],data).length,1,'SOS deve permanecer elegível mesmo com rotina descontinuada');
assert.equal(suggest('p',[{...meds[0],status:'descontinuado'}],[{...r,status:'cancelada'}],data).length,0,'retirada cancelada não pode habilitar vínculo');
assert.equal(suggest('p',[{...meds[0],status:'descontinuado'}],[{...r,user_id:'outro'}],data).length,0,'não aceitar retirada de outra conta');
const page=fs.readFileSync(path.join(root,'app/saude/fornecimento/page.tsx'),'utf8');const parsed=ts.transpileModule(page,{fileName:'page.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX}});assert.equal((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);assert.ok(page.includes('setCreating(true)'));assert.ok(page.includes('scrollIntoView'));assert.ok(page.includes('Dados reaproveitados'));assert.ok(page.includes('seed?.farmacia_id'));console.log('V124 OK: sugestões preservadas, isolamento, processos existentes e formulário acessível.');
