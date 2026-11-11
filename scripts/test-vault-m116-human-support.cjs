/* M116: synthetic, owner-scoped, no sensitive personal data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const store=new Map();global.window={localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
function transpile(file){return ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;}
function load(file){const m=new Module(file,module);m._compile(transpile(file),file);return m.exports;}
const quick=load('lib/quick-support-m116.ts');
assert.equal(quick.readQuickSupportM116('u1','p1'),null);
assert.equal(quick.normalizedQuickPhoneM116('(34) 99999-1234'),'34999991234');
for(const invalid of ['','abc','tel:12345678','+1 (123) 45','12345678?body=abc'])assert.equal(quick.normalizedQuickPhoneM116(invalid),null);
assert.throws(()=>quick.saveQuickSupportM116('u1','p1',{contactId:'c1',label:'Pessoa teste',phone:'34999991234'},false));
assert.equal(quick.readQuickSupportM116('u1','p1'),null);
const one=quick.saveQuickSupportM116('u1','p1',{contactId:'c1',label:'Pessoa teste',phone:'(34) 99999-1234'},true);
assert.equal(one.phone,'34999991234');assert.equal(quick.readQuickSupportM116('u1','p1').label,'Pessoa teste');
assert.equal(quick.readQuickSupportM116('u2','p1'),null);assert.equal(quick.readQuickSupportM116('u1','p2'),null);
assert(!JSON.stringify(one).includes('warningSigns'));
quick.clearQuickSupportM116('u1','p1');assert.equal(quick.readQuickSupportM116('u1','p1'),null);
const paths=['components/saude/CareAccessWindowM115.tsx','app/saude/plano-seguranca/page.tsx','app/saude/registros/novo/page.tsx','components/saude/QuickSupportM116.tsx'];
for(const path of paths){const sf=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(sf.parseDiagnostics.length,0,`${path}: ${sf.parseDiagnostics.map(x=>x.messageText).join('; ')}`);}
const access=read(paths[0]);assert(access.includes('[cutoff,setCutoff]=useState("")'));assert(access.includes('setCutoff(current?.cutoff??"")'));assert(!access.includes('"14:00"'));
assert(access.includes('disabled={!cutoff||source.trim().length<3}'));
const safety=read(paths[1]);assert(safety.includes('QuickSupportM116'));assert(safety.includes('locked={protectedMode&&!unlocked}'));
const support=read(paths[3]);assert(support.includes('!locked?'));assert(support.includes('disabled={!consent}'));assert(support.includes('href={`tel:${selected.phone}`}'));assert(!support.includes('sms:'));
const form=read(paths[2]);assert(form.includes('offerFollowupM116 = categoria === "humor" && mood === "muito_triste"'));
assert(form.includes('if (offerFollowupM116) setShowMoodFollowupM116(true)'));
assert(form.includes('goBackOnSuccess:\n              !offerFollowupM116'));
assert(form.includes('if (showMoodFollowupM116) return ('));
assert(form.includes('Concluir sem lembrete'));
assert(form.includes('Nada será agendado automaticamente'));
const gate=read('scripts/test-v63-release-gate.mjs');assert(gate.includes('test-vault-m116-human-support.cjs'));
console.log('M116: isolamento, opt-in, telefone, janela SUS, TSX e pós-salvamento validados sinteticamente.');
