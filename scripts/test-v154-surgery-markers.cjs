const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache=new Map();function load(file){const f=path.resolve(file);if(cache.has(f))return cache.get(f).exports;const m=new Module(f,module);cache.set(f,m);m.paths=Module._nodeModulePaths(path.dirname(f));m.require=n=>n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.resolve(path.dirname(f),n)+'.ts'):require(n);m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);return m.exports;}
const {avatarBodyContext:body}=load('lib/health-profile/avatar-body.ts');const {surgeriesForMarker:filter}=load('lib/health-profile/avatar-surgery-markers.ts');
const base={user_id:'u',person_id:'p',status:'agendada',data:'2026-10-20',procedimento:'Nome não determina a região',regiao_corporal:'punho',lateralidade:'esquerda'};
const rows=[{...base,id:'left'},{...base,id:'right',lateralidade:'direita'},{...base,id:'both',lateralidade:'bilateral'},
 {...base,id:'late',data:'2026-10-13'},{...base,id:'done',status:'realizada',data:'2026-10-10'},
 {...base,id:'missing-side',lateralidade:null},{...base,id:'not-applicable',lateralidade:'nao_aplicavel'},
 {...base,id:'cancelled',status:'cancelada'},{...base,id:'foreign',user_id:'v'},
 {...base,id:'other',regiao_corporal:'outro'},{...base,id:'spine',regiao_corporal:'coluna',lateralidade:'bilateral'}];
let c=body([],rows,[],'p','u','2026-10-14');assert.equal(c.surgeryMarkers.length,3);
const left=c.surgeryMarkers.find(m=>m.key==='punho:left'),right=c.surgeryMarkers.find(m=>m.key==='punho:right'),spine=c.surgeryMarkers.find(m=>m.key==='coluna:center');
assert.deepEqual(new Set(left.surgeryIds),new Set(['left','both','late','done']));assert.deepEqual(new Set(right.surgeryIds),new Set(['right','both']));assert.equal(left.tone,'unconfirmed');assert.equal(right.tone,'upcoming');assert(left.position[0]>0);assert(right.position[0]<0);assert(left.illustration[0]>90);assert(right.illustration[0]<90);assert(spine.back);assert.equal(spine.position[0],0);assert(spine.position[2]<0);
const selected=filter(c.surgeryAgenda,left);assert.equal(selected.total,4);assert.equal(selected.unconfirmed[0].id,'late');assert.equal(selected.completed[0].id,'done');assert(!selected.upcoming.some(r=>r.id==='right'));assert.equal(filter(c.surgeryAgenda,undefined).total,0);
assert.equal(body([],rows,[],'q','u','2026-10-14').surgeryMarkers.length,0);assert.equal(body([],rows,[],'p','','2026-10-14').surgeryMarkers.length,0);
assert.equal(body([],[{...base,id:'raw',regiao_corporal:null,procedimento:'Punho esquerdo'}],[],'p','u','2026-10-14').surgeryMarkers.length,0);
assert.equal(body([],[{...base,id:undefined}],[],'p','u','2026-10-14').surgeryMarkers.length,0);
assert.equal(body([],[{...base,id:'old',status:'realizada',data:'2026-01-01'}],[],'p','u','2026-10-14').surgeryMarkers.length,0);
assert.equal(body([],[{...base,id:'done',status:'realizada',data:'2026-10-10'}],[],'p','u','2026-10-14').surgeryMarkers[0].tone,'completed');
const before=JSON.stringify(rows);body([],rows,[],'p','u','2026-10-14');assert.equal(JSON.stringify(rows),before);
const regions=load('lib/surgery-body.ts').SURGERY_REGIONS;for(const region of Object.keys(regions)){const markers=body([],[{...base,id:'r',regiao_corporal:region,lateralidade:'bilateral'}],[],'p','u','2026-10-14').surgeryMarkers;assert.equal(markers.length,region==='outro'?0:region==='coluna'?1:2,region);for(const marker of markers){assert(marker.position.every(Number.isFinite));assert(marker.illustration.every(Number.isFinite));assert(marker.illustration[0]>=0&&marker.illustration[0]<=180);}}
console.log('V154: explicit anatomy only, bilateral/grouped markers, correct person-relative sides, status colors, spine/back, missing-side neutrality, source isolation, exact marker records and immutability passed.');
