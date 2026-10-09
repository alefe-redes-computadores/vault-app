import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const box={exports:{},Date,Number,Math,Set,Map};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/health-intelligence/lifestyle-insights.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);
const run=box.exports.buildLifestyleInsights;
const c=()=>({personId:'p',hoje:'2026-10-30',medicamentos:[],doseLogs:[],registrosSaude:[]});
function night(n,minutes=480){const end=`2026-10-${String(n).padStart(2,'0')}T06:00:00-03:00`,start=new Date(Date.parse(end)-minutes*60000).toISOString();return {id:`n${n}`,person_id:'p',tipo:'sono',data:end.slice(0,10),inicio_em:start,fim_em:end,duracao_minutos:minutes};}
assert.equal(run(c()).length,0);
let ctx=c();ctx.registrosSaude=[...Array.from({length:7},(_,i)=>night(16+i,480)),...Array.from({length:7},(_,i)=>night(23+i,360))];
let signals=run(ctx);assert.equal(signals.length,1);assert.equal(signals[0].amostra,14);assert.equal(signals[0].comparacao.valorAtual,360);assert.equal(signals[0].comparacao.valorAnterior,480);
ctx.registrosSaude.push({...night(24,360),id:'ring-duplicate'},night(31,1),{...night(25),id:'foreign',person_id:'other'},{...night(26),id:'bad',duracao_minutos:NaN});
assert.equal(run(ctx)[0].amostra,14);
assert.equal(run({...ctx,personId:'other'}).length,0);
ctx=c();ctx.medicamentos=[{id:'m',person_id:'p',nome:'Exemplo'}];
ctx.registrosSaude=Array.from({length:8},(_,i)=>night(20+i,i<4?360:480));
ctx.doseLogs=Array.from({length:4},(_,i)=>({id:`d${i}`,person_id:'p',medicamento_id:'m',data:`2026-10-${19+i}`,horario:'10:00',tomado_em:`2026-10-${19+i}T23:00:00-03:00`,dose_kind:'scheduled'}));
signals=run(ctx);assert.ok(signals.some(x=>x.id==='lifestyle-sono-dose-m'));const association=signals.find(x=>x.id==='lifestyle-sono-dose-m');assert.equal(association.amostra,8);assert.equal(association.confianca,'baixa');assert.ok(association.mensagem.includes('não confirma'));
ctx.doseLogs=ctx.doseLogs.map(x=>({...x,tomado_em:undefined}));assert.ok(!run(ctx).some(x=>x.id==='lifestyle-sono-dose-m'),'planned times must not become actual');
ctx=c();ctx.registrosSaude=Array.from({length:8},(_,i)=>[{id:`w${i}`,person_id:'p',tipo:'agua',unidade_medida:'ml',valor_numerico:i<4?500:1500,data:`2026-10-${20+i}`},{id:`s${i}`,person_id:'p',tipo:'dor',categoria:'sintoma',intensidade:i<4?6:2,data:`2026-10-${20+i}`}]).flat();
assert.equal(run(ctx).find(x=>x.id==='lifestyle-agua-sintomas').amostra,8);ctx.registrosSaude=ctx.registrosSaude.filter(x=>x.id!=='w0');assert.ok(!run(ctx).some(x=>x.id==='lifestyle-agua-sintomas'),'missing water must not become zero');
ctx=c();ctx.registrosSaude=[...Array.from({length:3},(_,i)=>night(16+i)),...Array.from({length:3},(_,i)=>night(24+i,360))];assert.equal(run(ctx)[0].confianca,'baixa');
function audit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${entry.name}`;if(entry.isDirectory())audit(p);else if(p.endsWith('.tsx')){const source=fs.readFileSync(p,'utf8');assert.ok(!/type\s*=\s*["'](?:date|time|datetime-local)["']/.test(source),`${p}: native date/time`);for(const match of source.matchAll(/<select\b[^>]*>/g))assert.ok(match[0].includes('sr-only'),`${p}: visible native select`);}}}
audit('app');audit('components');
console.log('V112: noites, janelas completas, associação com horários reais, dedup relógio/anel, pessoa, água registrada e controles Vault OK');
