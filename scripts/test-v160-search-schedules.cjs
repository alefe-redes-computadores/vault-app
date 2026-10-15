const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
function load(file){const m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);return m.exports;}
const {createLocalSearchIndex,filterLocalSearchIndex,normalizeLocalSearch}=load('lib/local-search.ts');
const docs=[{id:'shared',title:'Receita de avaliação',drug:'Clorpromazina',dose:'25 mg',date:'15/10/2026'},{id:'b',title:'Laudo de óculos',drug:'Outro',dose:'20 mg',date:'14/10/2026'}];let calls=0;const before=JSON.stringify(docs);const index=createLocalSearchIndex(docs,item=>{calls++;return [item.title,item.drug,item.dose,item.date];});
assert.deepEqual(filterLocalSearchIndex(index,'CLORPROMAZINA receita 25mg'),[docs[0]]); // civil unit spacing is equivalent
assert.deepEqual(filterLocalSearchIndex(index,'25 mg receita clorpromazina').map(x=>x.id),['shared']);
assert.deepEqual(filterLocalSearchIndex(index,'oculos LAUDO 20').map(x=>x.id),['b']);
assert.deepEqual(filterLocalSearchIndex(index,'15/10/2026 avaliação').map(x=>x.id),['shared']);
assert.deepEqual(filterLocalSearchIndex(index,'  '),docs);assert.deepEqual(filterLocalSearchIndex(index,'receita receita'),[docs[0]]);assert.deepEqual(filterLocalSearchIndex(index,'inexistente'),[]);assert.equal(calls,2,'typing must reuse field projection');assert.equal(JSON.stringify(docs),before);assert.equal(normalizeLocalSearch('ÓCULOS – 20 mg'),'oculos 20 mg');
// A person switch builds a new index: old matches cannot leak through a global cache.
const other=createLocalSearchIndex([{id:'other',title:'Outro perfil'}],x=>[x.title]);assert.deepEqual(filterLocalSearchIndex(other,'Clorpromazina'),[]);
const {groupScheduleSlots}=load('lib/dose-schedule-groups.ts');
const slots=[{medicamentoId:'a',horario:'08:00',tomada:false,ignorada:false,estoqueRestante:0},{medicamentoId:'b',horario:'08:00',tomada:true,ignorada:false},{medicamentoId:'c',horario:'08:00',tomada:false,ignorada:true},{medicamentoId:'a',horario:'09:00',tomada:false,ignorada:false},{medicamentoId:'x',horario:'08:00',tomada:false,ignorada:false,isAvulsa:true},{horario:'08:00',tomada:false,ignorada:false}];
const original=JSON.stringify(slots),groups=groupScheduleSlots(slots);assert.equal(groups.length,4);assert.deepEqual(groups[0].entries.map(x=>x.index),[0,1,2]);assert.equal(groups[0].resolved,2);assert.equal(groups[0].unavailable,1);assert.deepEqual(groups[0].pending,[slots[0]]);assert.equal(groups[1].slots[0],slots[3]);assert.equal(groups[2].slots[0],slots[4]);assert.equal(groups[3].slots[0],slots[5]);assert.equal(JSON.stringify(slots),original);assert.deepEqual(groupScheduleSlots([]),[]);
const many=Array.from({length:10000},(_,i)=>({...slots[0],medicamentoId:String(i)}));assert.equal(groupScheduleSlots(many)[0].entries.length,10000);
console.log('V160: multi-field/token/accent search, exact dates, no mutation, per-index isolation, reusable projection, schedule order/source indices, resolved/stock/extra separation and 10k slots passed');
