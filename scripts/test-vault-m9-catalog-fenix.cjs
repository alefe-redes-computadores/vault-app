#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
function ok(value,label){assert.ok(value,'VAULT M9: '+label);console.log(`✓ ${++checks}: ${label}`)}
const forms=['app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx'];
const fresh=['components/saude/MedicationCatalogQuickOption.tsx','components/saude/MedicationCatalogIdentitySummary.tsx','lib/medications/catalog-unique-formats.ts'];
const avatar='components/saude/HealthAvatar.tsx',scene='components/saude/HealthAvatar3D.tsx';
for(const path of [...forms,...fresh,avatar,scene]){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const diagnostics=source.parseDiagnostics.map(d=>{const pos=source.getLineAndCharacterOfPosition(d.start||0);return `${pos.line+1}:${pos.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`});
 ok(diagnostics.length===0,`${path}: sintaxe TS/TSX ${diagnostics.join('; ')}`);
}
for(const [i,path] of forms.entries()){
 const s=read(path),mode=i===0?'Novo':'Editar';
 ok(s.includes('import { catalogUniquelyInferredFormats }')&&s.includes('const inferredFormats = catalogUniquelyInferredFormats(hydrated.reference)'),`${mode}: inferência delegada`);
 ok(s.includes('inferredFormats.length ===')&&s.includes('setFormato(')&&s.includes('catalog-auto-format-v3'),`${mode}: autofill somente com evidência convergente`);
 ok(s.includes('<MedicationCatalogQuickOption result={result} selected={')&&s.includes('hydrateQuickResult('),`${mode}: botão puro, hidratação no pai`);
 ok(s.includes('<MedicationCatalogIdentitySummary')&&s.includes('authorityLabel={catalogAuthority.label}')&&s.includes('divergent={catalogAuthority.state === "possible_divergence"}'),`${mode}: autoridade oficial permanece explícita`);
 ok(!s.includes('const inferredFormats =\n')&&!s.includes('className={`flex w-full items-start gap-3 border-b'),`${mode}: duplicação removida`);
 ok(s.includes('prefetchQuickResults(')&&s.includes('setSelectedCatalogReferenceId(')&&s.includes('setIsCatalogHydrating(')&&s.includes('setCatalogSearchError('),`${mode}: busca e hidratação original`);
 ok(s.includes('getMedicationCatalogAuthority(')&&s.includes('validateMedication(')&&s.includes('dosageAcknowledgementRef'),`${mode}: autoridade e confirmação manual preservadas`);
 for(const token of ['<MedicationFormatPicker','<MedicationIdentityColorPicker','<MedicationAdditionalFormatsSheet','<MedicationCatalogFormatNotice'])ok(s.includes(token),`${mode}: módulo compartilhado M7/M8 ${token}`);
}
const q=read(fresh[0]),h=read(fresh[1]),lib=read(fresh[2]);
ok(q.includes('aria-pressed={selected}')&&q.includes('aria-label={`Usar referência ${result.canonicalName}`}'), 'resultado acessível e seleção identificável');
ok(q.includes('focus-visible:outline-violet-300')&&q.includes('break-words')&&q.includes('motion-reduce:transition-none'),'resultado legível e toque/foco responsivos');
ok(h.includes('Referência selecionada')&&h.includes('Princípio ativo ·')&&h.includes('authorityLabel')&&h.includes('divergent'), 'resumo clínico mostra autoridade sem omitir evidências');
ok(!/(?:fetch\(|\bsupabase\.|\.insert\(|\.update\(|\.delete\(|db\.|localStorage|setTimeout)/.test(q+'\n'+h+'\n'+lib),'módulos puros não consultam nem gravam dados');
ok(lib.includes('new Set(')&&lib.includes('inferVaultFormatFromOfficialPresentation(')&&lib.includes('pharmaceuticalForms')&&lib.includes('presentations'),'inferência conserva fontes e deduplicação');
// Executa de verdade a função pura, não sua reprodução.
const jsx=(type,props)=>({type,props:props||{}}),icon=()=>null;
const runtime={jsx,jsxs:jsx,Fragment:'Fragment'};
const deps={
  'react':{memo:fn=>fn},
  'react/jsx-runtime':runtime,
  'lucide-react':{Check:icon,FileSearch:icon},
  '@/lib/medications/catalog-presentation':{inferVaultFormatFromOfficialPresentation:value=>value.includes('CAP')?'capsula':value.includes('COM')?'comprimido':null}
};
const load=file=>{const mod=new Module(file,module);mod.require=id=>{if(id in deps)return deps[id];throw Error('M9: dependência inesperada '+id)};mod._compile(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return mod.exports;};
const choose=load(fresh[2]).catalogUniquelyInferredFormats;
ok(choose({pharmaceuticalForms:['COM REV','COM REV'],presentations:[{label:'COM 20 mg'}]}).join(',')==='comprimido','evidência convergente retorna um formato');
ok(choose({pharmaceuticalForms:['COM REV'],presentations:[{label:'CAP DURA'}]}).length===2,'evidências conflitantes nunca viram formato único');
ok(choose({pharmaceuticalForms:[],presentations:[]}).length===0,'sem evidência não inventa apresentação');
ok(choose({presentations:[{label:'outra sem dados'}]}).length===0,'apresentação desconhecida não vira comprimido');
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'&&'props'in node?[node,...walk(node.props.children)]:[];
let selected=0;
const Button=load(fresh[0]).MedicationCatalogQuickOption;
const entry={referenceId:'abc',referenceType:'substance',canonicalName:'Comprimido A'};
const button=Button({result:entry,selected:false,onSelect:()=>{selected++}});
ok(button.type==='button'&&button.props['aria-pressed']===false,'resultado monta botão sem pré-selecionar');
button.props.onClick();ok(selected===1,'clique aciona callback original uma vez');
ok(JSON.stringify(button).includes('Princípio ativo')&&JSON.stringify(button).includes('Comprimido A'),'identidade e referência da busca mantidas');
const Summary=load(fresh[1]).MedicationCatalogIdentitySummary;
const result=Summary({canonicalName:'Teste',activeIngredients:['A','B'],activeIngredient:'Antigo',authorityLabel:'A conferir',divergent:true});
ok(JSON.stringify(result).includes('A + B')&&!JSON.stringify(result).includes('Antigo'),'múltiplos princípios ativos têm prioridade sobre o legado');
ok(JSON.stringify(result).includes('A conferir')&&JSON.stringify(result).includes('amber'),'divergência tem cor de atenção, não uma confirmação falsa');
ok(JSON.stringify(Summary({canonicalName:'Teste',authorityLabel:'Sem fonte',divergent:false})).includes('Teste'),'referência sem princípio ativo não é inventada');
const a=read(avatar),three=read(scene);
ok(a.includes('Consultar contexto do Brain sem mudar de página')&&a.includes('Ver contexto registrado · não é diagnóstico')&&a.includes('onClick={onBrainSelect}'),'Fênix mantém contexto local e não diagnóstico');
ok(a.includes('<span aria-hidden="true">Ver</span></button>:null}')&&a.includes('min-h-12 w-full max-w-[520px]')&&a.includes('motion-reduce:transition-none'),'botão do Brain conserva texto, JSX e área de toque acessível');
ok(three.includes('cheekbone.scale.y=.95')&&three.includes('noseContour.scale.x=.97'),'volumes existentes de bochecha e nariz refinados');
ok(three.includes('renderer.forceContextLoss()')&&three.includes('avatarAdaptiveRatio(')&&!three.includes('requestAnimationFrame(animate)'),'WebGL conserva limite adaptativo e limpeza GPU');
const gate=read('scripts/test-v63-release-gate.mjs');
for(let i=1;i<=9;i++)ok(gate.includes(`test-vault-m${i}-`),`gate cumulativo M${i}`);
console.log(`VAULT M9: ${checks} verificações de formulário, catálogo, inferência, interação e Fênix aprovadas.`);
