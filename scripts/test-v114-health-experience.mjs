import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
const nodeRequire=createRequire(import.meta.url);
function load(name){
 const file=path.resolve(name),m=new Module(file);m.paths=Module._nodeModulePaths(path.dirname(file));
 m.require=n=>n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.resolve(path.dirname(file),n)+'.ts'):nodeRequire(n);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
 return m.exports;
}
const select=load('lib/health-profile/history.ts').selectMetricHistory;
const r=(id,data,horario='10:00',tipo='sono')=>({id,data,horario,tipo});
const rows=[r('today','2026-10-09'),r('earlier','2026-10-09','06:00'),r('week','2026-10-03'),r('old','2026-09-10'),r('too-old','2026-09-09'),r('future','2026-10-10'),r('weight','2026-10-09','10:00','peso')];
assert.deepEqual(Array.from(select(rows,'sono','2026-10-09','today'),r=>r.id),['today','earlier']);
assert.equal(select(rows,'sono','2026-10-09','7').length,3);
assert.equal(select(rows,'sono','2026-10-09','30').length,4);
assert.equal(select(rows,'sono','2026-10-09','all').length,5);
assert.equal(select([], 'peso','2026-10-09','all').length,0);
assert.equal(rows[0].id,'today');
console.log('V114: recortes civis hoje/7/30/todos, limite futuro, separação de métricas e ordem cronológica OK');
