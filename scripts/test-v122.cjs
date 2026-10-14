const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const filename=path.join(root,rel);if(cache.has(filename))return cache.get(filename).exports;const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});const m=new Module(filename,module);cache.set(filename,m);m.require=request=>request.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(filename),request))+'.ts'):request.startsWith('@/')?load(request.slice(2)+'.ts'):require(request);m._compile(code.outputText,filename);return m.exports;}
const core=load('lib/health-intelligence/brain-v5.ts');
const insight={id:'stable',kind:'pattern',categoria:'rotina',titulo:'Sinal registrado',mensagem:'Revisar dados',urgencia:'baixa',confianca:'media',amostra:8,gravidadeSeguranca:'informativa',evidencias:['A','B'],entidadeIds:['m1','m2'],entidadeId:'m1'};
const t1='2026-10-12T10:00:00Z',t2='2026-10-13T10:00:00Z';
const first=core.reconcileBrainV5('p',[insight],[],t1);
const reordered=core.reconcileBrainV5('p',[{...insight,evidencias:['B','A','A'],entidadeIds:['m2','m1']}],first,t2)[0];
assert.equal(reordered.occurrences,1,'ordem/duplicação de evidências não conta nova análise');assert.equal(reordered.last_detected_at,t1);
const legacy={...first[0],material_fingerprint:JSON.stringify([insight.kind,insight.categoria,insight.titulo,insight.mensagem,insight.urgencia,insight.confianca,8,insight.gravidadeSeguranca,['b','a'],['m2','m1'],'m1']).toLowerCase()};
assert.equal(core.reconcileBrainV5('p',[insight],[legacy],t2)[0].occurrences,1,'fingerprint antigo é comparado sem migração');
const changed=core.reconcileBrainV5('p',[{...insight,amostra:9}],first,t2)[0];assert.equal(changed.occurrences,2);assert.equal(changed.episode,1);assert.equal(changed.last_detected_at,t2);
const resolved=core.reconcileBrainV5('p',[],first,t2);const resurfaced=core.reconcileBrainV5('p',[insight],resolved,'2026-10-14T10:00:00Z')[0];assert.equal(resurfaced.episode,2);
const foreign={...first[0],person_id:'other',key:'other:key'};assert.deepEqual(core.reconcileBrainV5('p',[insight],[foreign],t2).find(x=>x.person_id==='other'),foreign);
const dismissed={...first[0],feedback:'dismissed',state:'acknowledged'};const escalated=core.reconcileBrainV5('p',[{...insight,gravidadeSeguranca:'critica'}],[dismissed],t2)[0];assert.equal(escalated.state,'active');assert.equal(escalated.feedback,undefined);
const recent={...first[0],key:'recent',occurrences:1,last_detected_at:t2};const many={...first[0],key:'many',occurrences:1000,last_detected_at:t1};assert.equal(core.rankBrainV5([many,recent])[0].key,'recent','revisões frequentes não aumentam prioridade');
for(const p of ['components/saude/HealthBody.tsx','app/inteligencia/alertas/page.tsx']){const s=fs.readFileSync(path.join(root,p),'utf8');const result=ts.transpileModule(s,{fileName:p,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});assert.equal((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,p+' sintaxe TSX');}
console.log('V122 OK: memória estável, compatibilidade, episódios, isolamento e prioridade.');
