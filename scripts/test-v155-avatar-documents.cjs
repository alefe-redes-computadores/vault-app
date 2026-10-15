const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), Module=require('node:module'), ts=require('typescript');
const cache=new Map();
function load(file){
  const f=path.resolve(file);
  if(cache.has(f))return cache.get(f).exports;
  const mod=new Module(f,module); mod.filename=f;mod.paths=Module._nodeModulePaths(path.dirname(f));cache.set(f,mod);
  mod.require=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(f),name)+'.ts'):require(name);
  const code=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  mod._compile(code,f);return mod.exports;
}
const {DEFAULT_AVATAR_STYLE,normalizeAvatarStyle,avatarStyleLabel}=load('lib/health-profile/avatar-style.ts');
const {avatarPreferenceKey,parseAvatarMode,parseAvatarSize,parseAvatarStyle,avatarPreferencePayload}=load('lib/health-profile/avatar-preference.ts');
const original={...DEFAULT_AVATAR_STYLE,hat:'flat',hatBrand:'new-era',hatColor:'#AABBCC',glasses:'rectangular',glassesColor:'#334455',sneakers:'runner',sneakersColor:'#cc5511'};
const normalized=normalizeAvatarStyle(original);
assert.equal(normalized.hatColor,'#aabbcc');assert.equal(normalized.glassesColor,'#334455');assert.equal(normalized.hatBrand,'new-era');
assert.equal(normalizeAvatarStyle({hat:'unknown',hatColor:'red; background:evil',sneakers:'bad'}).hat,'none');
assert.equal(normalizeAvatarStyle({hatColor:'red; background:evil'}).hatColor,'#111827');
assert.equal(normalizeAvatarStyle(null).glasses,'none');
const pref=avatarPreferencePayload('3d','expanded',normalized);
assert.deepEqual(parseAvatarStyle(pref),normalized);assert.equal(parseAvatarMode(pref),'3d');assert.equal(parseAvatarSize(pref),'expanded');
assert.deepEqual(parseAvatarStyle('garbage'),DEFAULT_AVATAR_STYLE);assert.deepEqual(parseAvatarStyle('{"version":1,"mode":"3d"}'),DEFAULT_AVATAR_STYLE);
assert.notEqual(avatarPreferenceKey('u1','p1'),avatarPreferenceKey('u2','p1'));
assert.notEqual(avatarPreferenceKey('u1','p1'),avatarPreferenceKey('u1','p2'));
assert.equal(avatarPreferenceKey('','p1'),undefined);
assert(avatarStyleLabel(normalized).includes('New Era'));
console.log('V155 avatar preferences: isolated, backward-compatible, sanitized; cosmetic state survives mode/size changes');
const {buildDocumentMedicationIndex,documentMedicationLinks}=load('lib/health-documents/relations.ts');
const base={person_id:'p1',user_id:'u1',category_id:'saude'};
const docs=[{...base,id:'d1',title:'Receita comum',entidade_tipo:'medicamento',entidade_id:'m1',metadata:{}},
{...base,id:'d2',title:'Receita multi',metadata:{medicamento_ids:JSON.stringify(['m1','m2','m2'])}},
{...base,id:'d3',title:'Receita legado',metadata:{medicamento_id:'m2'}},
{...base,id:'d4',title:'Prescrição compartilhada',metadata:{}},
{...base,id:'d5',title:'Relação renovação',entidade_tipo:'renovacao',entidade_id:'r1',metadata:{}},
{...base,id:'d6',title:'Apenas um medicamento',metadata:{}},
{...base,id:'d7',title:'Dados falsos',metadata:{medicamento_ids:'["m1","foreign"]'}},
{...base,id:'d8',title:'Sem associação',metadata:{}}];
const meds=[
{id:'m1',nome:'Clonazepam',...base,document_id:'d1'},
{id:'m2',nome:'Fenergan',...base,document_id:'d1'},
{id:'m3',nome:'Venvanse',...base,document_id:'d4'},
{id:'m4',nome:'Outra referência',...base,document_id:'d4'},
{id:'foreign',nome:'Outra pessoa',user_id:'u2',person_id:'p2',document_id:'d1'}];
const renewals=[{...base,id:'r1',document_id:'d5',medicamento_id:'m2'}, {...base,id:'r2',document_id:'d6',medicamento_id:'m1'}, {...base,id:'rf',person_id:'p2',document_id:'d2',medicamento_id:'foreign'}];
const before=JSON.stringify({docs,meds,renewals});
const index=buildDocumentMedicationIndex(docs,meds,renewals,'p1','u1');
const ids=id=>(index.get(id)||[]).map(m=>m.id);
assert.deepEqual(ids('d1'),['m1','m2'],'two actual medication.document_id relations must be preserved');
assert.deepEqual(ids('d2'),['m1','m2'],'canonical multi-id metadata must not duplicate');
assert.deepEqual(ids('d3'),['m2']);assert.deepEqual(ids('d4'),['m4','m3'].sort((a,b)=>meds.find(m=>m.id===a).nome.localeCompare(meds.find(m=>m.id===b).nome,'pt-BR')));
assert.deepEqual(ids('d5'),['m2']);assert.deepEqual(ids('d6'),['m1']);assert.deepEqual(ids('d7'),['m1']);assert.deepEqual(ids('d8'),[]);
assert.equal(buildDocumentMedicationIndex(docs,meds,renewals,'p2','u2').size,0);
assert.deepEqual(documentMedicationLinks(docs[0],[meds[1]],renewals,'p1','u1').map(m=>m.id),['m2']);
assert.equal(JSON.stringify({docs,meds,renewals}),before,'no document or medication may be mutated');
console.log('V155 documents: all reverse links, shared physical documents, canonical/renewal IDs, metadata, deduplication, person isolation and immutability');
for(const file of ['components/saude/HealthAvatar.tsx','components/saude/HealthAvatar3D.tsx','components/saude/HealthBody.tsx','components/saude/AvatarStyleEditor.tsx','app/saude/documentos/page.tsx','components/galeria/DocumentManager.tsx']){
 const src=fs.readFileSync(file,'utf8');const diag=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(diag.length,0,file+': '+diag.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(' '));
}
const page=fs.readFileSync('app/saude/documentos/page.tsx','utf8');
assert(page.includes('buildDocumentMedicationIndex('));assert(page.includes('const expanded = resolvedViewModels.flatMap('));assert(page.includes('sharedMedicationCount'));assert(page.includes('uniqueDocumentViewModels'));assert(page.includes('new Set(parents.flatMap'));
const manager=fs.readFileSync('components/galeria/DocumentManager.tsx','utf8');
assert(manager.includes('buildDocumentMedicationIndex(docs, [med]'));
assert(manager.includes('doc.user_id === user.id'));
assert(manager.includes('doc.person_id === activePersonId')) || assert(manager.includes('doc.person_id'));
const avatar=fs.readFileSync('components/saude/HealthAvatar.tsx','utf8');assert(avatar.includes('AvatarStyleEditor'));assert(avatar.includes('appearance={appearance}'));assert(avatar.includes('body?.surgeryMarkers'));
console.log('V155 TSX syntax & integration: UI, Brain, surgery/weight, per-person style, expanded document tree and medication details OK');
