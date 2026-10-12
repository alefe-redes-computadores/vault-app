const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/health-intelligence/medication-longitudinal-risk.ts'), 'utf8');
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}, reportDiagnostics: true});
assert.equal((code.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const compiled = new Module('v120-risk', module);
compiled._compile(code.outputText, 'v120-risk.js');
const build = compiled.exports.buildMedicationLongitudinalRiskInsights;
const now = new Date('2026-10-12T23:59:59');
const day = n => `2026-10-${String(n).padStart(2,'0')}`;
function context(name, schedules=['09:00']) {
 const doses = Array.from({length:9}, (_,i)=>({person_id:'p',medicamento_id:'m',data:day(i+1),horario:'09:00',tomado_em:`${day(i+1)}T09:00:00`,quantidade:1}));
 for(const n of [10,11]) for(const time of schedules) doses.push({person_id:'p',medicamento_id:'m',data:day(n),horario:time,ignorado_em:`${day(n)}T${time}:00`});
 return {personId:'p',medicamentos:[{id:'m',person_id:'p',nome:name,tipo_uso:'continuo',status:'ativo',estoque_horarios:schedules}],doseLogs:doses};
}
for(const name of ['Venvanse','Metadona','Metadon','Zolpidem']) {
 const c=context(name); const result=build(c,now);
 assert.equal(result.length,1, name);
 assert.match(result[0].id,/^longitudinal-interruption-/);
 assert.match(result[0].mensagem,/2 dia\(s\) completos/);
 assert.ok(result[0].fontesExternas[0].url.startsWith('https://'));
 assert.match(result[0].acaoSegura,/Não reinicie/i);
 assert.equal(build({...c,medicamentos:[{...c.medicamentos[0],tipo_uso:'sos'}]},now).length,0);
 assert.equal(build({...c,medicamentos:[{...c.medicamentos[0],status:'descontinuado'}]},now).length,0);
 assert.equal(build({...c,doseLogs:c.doseLogs.map(d=>d.tomado_em?{...d,dose_kind:'sos'}:d)},now).length,0,'histórico exclusivamente SOS não é uso regular');
 assert.equal(build({...c,doseLogs:c.doseLogs.map(d=>d.ignorado_em?{...d,ignorado_em:'2026-11-01T09:00:00'}:d)},now).length,0,'confirmação futura não é evidência atual');
 const missing={...c,doseLogs:c.doseLogs.filter(d=>!d.ignorado_em)};
 assert.equal(build(missing,now).length,0,'falta de registros não prova interrupção');
 missing.doseLogs.push(...[10,11].map(n=>({person_id:'p',medicamento_id:'other',data:day(n),horario:'10:00',tomado_em:`${day(n)}T10:00:00`})));
 const gap=build(missing,now)[0];assert.match(gap.id,/^longitudinal-gap-/);assert.equal(gap.gravidadeSeguranca,undefined);assert.equal(gap.confianca,'baixa');
 assert.equal(build({...c,personId:'foreign'},now).length,0);
 assert.equal(build({...c,doseLogs:c.doseLogs.map(d=>d.ignorado_em?{...d,person_id:'foreign'}:d)},now).length,0);
 assert.equal(build({...c,doseLogs:c.doseLogs.filter(d=>d.data!=='2026-10-11')},now).length,0,'dias ignorados devem ser consecutivos');
 assert.equal(build({...c,doseLogs:c.doseLogs.filter(d=>d.data>='2026-10-08')},now).length,0,'amostra insuficiente');
 assert.equal(build({...c,medicamentos:[{...c.medicamentos[0],estoque_horarios:[]}]},now).length,0);
 c.doseLogs.push({person_id:'p',medicamento_id:'m',data:day(12),horario:'09:00',tomado_em:`${day(12)}T09:00:00`});
 assert.equal(build(c,now).length,0,'tomada recente encerra o sinal de interrupção');
}
const partial=context('Metadona',['09:00','18:00']);partial.doseLogs=partial.doseLogs.filter(d=>!(d.data===day(11)&&d.horario==='18:00'));
assert.equal(build(partial,now).length,0,'ignorar apenas parte da rotina não confirma interrupção completa');
const unknown=context('Nome não reconhecido');assert.equal(build(unknown,now).length,0);
for(const file of ['contexts/PersonContext.tsx','app/page.tsx','app/saude/minha-saude/page.tsx','components/saude/HealthBody.tsx','components/vault-intelligence/ContextualHealthIntelligence.tsx']) {
 const result=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[],file);
}
console.log('V120 OK: continuidade confirmada, lacuna neutra, amostra, pessoa, rotina parcial, retomada e sintaxe TSX.');
