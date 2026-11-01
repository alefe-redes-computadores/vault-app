#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
let checks=0;
const ok=(v,name)=>{assert(v,`VAULT M5: ${name}`);console.log(`✓ ${++checks}: ${name}`)};
const paths=[
  'app/saude/documentos/novo/page.tsx',
  'lib/health-documents/new-document-form-presentation.ts',
  'lib/health-documents/new-document-date-presentation.ts',
  'lib/health-profile/avatar-scene-geometry.ts',
  'lib/health-intelligence/avatar-decision-brief.ts',
];
const [page,form,dates,geometry,brain]=paths.map(read);
for(const [i,path] of paths.entries()){
  const tree=ts.createSourceFile(path,[page,form,dates,geometry,brain][i],ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(tree.parseDiagnostics.length===0,'sintaxe '+path);
}
ok(page.includes('from "@/lib/health-documents/new-document-form-presentation"')&&page.includes('from "@/lib/health-documents/new-document-date-presentation"'), 'formulário delega tipos, schema e datas');
ok(!page.includes('function parseDateToISO(')&&!page.includes('const HEALTH_TYPES =')&&form.includes('export const HEALTH_TYPES =')&&dates.includes('export function parseDateToISO('), 'nenhum helper duplicado');
ok(page.includes('async function rollbackUploadedFiles(')&&page.includes('await deleteFile(')&&page.includes('uploadFile('), 'upload e rollback continuam no componente original');
ok(page.includes('activePersonId')&&page.includes('user?.id')&&page.includes('const handleSubmit =')&&page.includes('const validateAll ='), 'isolamento e validação transacional preservados');
ok(page.includes('const clinicalEntityItems =')&&page.includes('const handleFileSelect =')&&page.includes('const removeAttachment ='), 'vínculos clínicos e anexos permanecem acionáveis');
ok(form.includes('export function getCustomFieldConflict(')&&form.includes('officialKeys.has(')&&form.includes('seen.has('), 'campos personalizados não ocultam os oficiais');
ok(form.includes('export function buildMetadataForTypePreservingSharedValues(')&&form.includes('currentMetadata['), 'troca de tipo preserva metadados compartilhados');
ok(form.includes('export function requiresCanonicalEntity(')&&form.includes('export function getPrescriptionExpiryDate('), 'campos e prescrição retêm autoridade original');
ok(!/(?:\bdb\.|\bsupabase\b|uploadFile\(|deleteFile\(|\.insert\(|\.put\(|fetch\(|localStorage)/i.test(form+dates), 'módulos puros não consultam nem gravam dados');

// Exercise actual exported form/date functions independently from React, DOM or a DB.
const mockTypes={DOCUMENT_FIELDS:{receita:[{key:'medicamento_id',type:'select',options:['m1','m2']},{key:'expiry_date',type:'date'}],consulta:[{key:'medico_id',type:'select',options:['dr1']}],laudo:[]}};
const dependency={ 'lucide-react':new Proxy({}, {get:(_o,k)=>k}), '@/lib/types':mockTypes };
function load(source){const module={exports:{}};const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',js)(module,module.exports,id=>{if(!(id in dependency))throw Error('Unexpected dependency: '+id);return dependency[id]});return module.exports;}
const f=load(form),d=load(dates);
ok(f.HEALTH_TYPES.includes('receita')&&f.HEALTH_TYPES.includes('documento_sus')&&f.HEALTH_TYPES.includes('lme'), 'receita, SUS e LME continuam distintos');
ok(f.requiresCanonicalEntity('receita')&&f.requiresCanonicalEntity('consulta')&&!f.requiresCanonicalEntity('laudo'), 'vínculos obrigatórios e opcionais permanecem distintos');
ok(f.buildMetadataForType('receita').medicamento_id==='m1'&&f.buildMetadataForType('receita').expiry_date==='', 'padrões de metadados mantidos');
ok(f.buildMetadataForTypePreservingSharedValues('receita',{medicamento_id:'m9',expiry_date:'2026-12-01'}).medicamento_id==='m9', 'metadados de edição compartilhados preservados');
ok(f.getCustomFieldConflict([{id:'a',label:'CID',value:'x'}],new Set(['cid']))?.includes('oficial'), 'campo oficial não é sobrescrito por personalizado');
ok(f.getCustomFieldConflict([{id:'a',label:'Observação',value:'x'},{id:'b',label:'observação',value:'y'}],new Set())?.includes('dois campos'), 'rótulos personalizados duplicados rejeitados');
ok(f.getCustomFieldConflict([{id:'a',label:'Nome livre',value:'x'}],new Set())===null, 'campo personalizado legítimo preservado');
ok(f.getPrescriptionExpiryDate({expiry_date:'2026-12-05',validade:'2026-11-05'})==='2026-12-05', 'prioridade da validade canônica preservada');
ok(f.isPrescriptionExpiryField(' VALIDADE ')&&!f.isPrescriptionExpiryField('data'), 'validade de receita reconhecida sem alargar para outros campos');
ok(f.getEntitySectionDescription('receita').includes('vínculo')&&f.getEntitySectionDescription('laudo').startsWith('Opcional'), 'mensagens respeitam obrigatoriedade da entidade');
ok(d.handleDateMask('31122026')==='31/12/2026'&&d.handleDateMask('0120')==='01/20', 'máscara incremental original preservada');
ok(d.parseDateToISO('29/02/2028')==='2028-02-29'&&d.parseDateToISO('29/02/2027')==='', 'ano bissexto válido, data impossível recusada');
ok(d.parseDateToISO('31/04/2026')===''&&d.parseDateToISO('12/10/2026')==='2026-10-12', 'calendário validado sem suposição clínica');
ok(d.formatDateDisplay('2026-11-01')==='01/11/2026', 'apresentação local de data preservada');
ok(geometry.includes('new THREE.BoxGeometry(Math.max(backWidth,frontWidth),height,depth)')&&geometry.includes('gradient.addColorStop(0,"rgba(0,0,0,.37)")')&&geometry.includes('shadowCanvas.width=128;shadowCanvas.height=128'), 'Avatar: mesma geometria Android e sombra original 128px suavizada');
ok(!geometry.includes('requestAnimationFrame(')&&!geometry.includes('setInterval('), 'Avatar sem loop GPU extra');
ok(brain.includes('\\u061c\\u2060\\u2066-\\u206f')&&brain.includes('Associação temporal não demonstra causa.')&&brain.includes('Projeção não confirma realização.'), 'Fênix limpa controles invisíveis sem transformar projeção em fato');
const b=load(brain); // no runtime imports
const projected=b.buildAvatarDecisionBrief({reason:'Ação \u061c de amanhã \u206aagendada\u206f',evidenceKind:'projected'});
ok(!/[\u061c\u206a-\u206f]/.test(projected.explanation)&&projected.explanation.includes('Projeção não confirma realização.'), 'Fênix remove bidi spoofing e preserva ressalva');
const association=b.buildAvatarDecisionBrief({reason:'Sintomas no mesmo dia',evidenceKind:'association'});
ok(association.explanation.includes('não demonstra causa')&&association.explanation.length<=370, 'correlação clínica não vira causa');
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m5-document-form-fenix.cjs"'), 'M5 inserida no gate sem substituir contratos anteriores');
console.log(`VAULT M5: ${checks} contratos de documentos, datas, Fênix, Avatar e estrutura aprovados.`);
