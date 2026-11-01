#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const read=path=>fs.readFileSync(path,'utf8');
let n=0;
const check=(condition,label)=>{assert.ok(condition,'M8: '+label);console.log(`✓ ${++n}: ${label}`)};
const files=[
 'app/saude/medicamentos/novo/page.tsx',
 'app/saude/medicamentos/editar/page.tsx',
 'components/saude/MedicationAdditionalFormatsSheet.tsx',
 'components/saude/MedicationCatalogFormatNotice.tsx',
 'components/saude/MedicationFormatPicker.tsx',
 'components/saude/MedicationIdentityColorPicker.tsx',
 'components/saude/HealthAvatar.tsx',
 'components/saude/HealthAvatar3D.tsx',
 'scripts/test-v94-3-toast-medication-identity-contract.mjs',
];
for(const file of files){
 const src=read(file),source=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const errors=source.parseDiagnostics.map(d=>{const at=source.getLineAndCharacterOfPosition(d.start||0);return `${at.line+1}:${at.character+1} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`});
 check(errors.length===0,`sintaxe ${file} ${errors.join('; ')}`);
}
const create=read(files[0]),edit=read(files[1]),modal=read(files[2]),notice=read(files[3]),avatar=read(files[6]),scene=read(files[7]);
for(const [label,src,formatHandler,colorHandler] of [['Novo',create,'handleFormatoChange','toggleCor'],['Editar',edit,'toggleFormato','toggleCor']]){
 check(src.includes('<MedicationAdditionalFormatsSheet')&&src.includes(`onSelect={${formatHandler}}`)&&src.includes('onClose={() => setIsFormatoModalOpen(false)}'),`${label}: formato mantém o handler original`);
 check(src.includes('<MedicationCatalogFormatNotice')&&src.includes('canonicalName={catalogReference.canonicalName}')&&src.includes('formatCanBeChecked={formatCanBeChecked}'),`${label}: evidência oficial encaminhada sem adulteração`);
 check(!src.includes('FORMATOS_ADICIONAIS.map')&&!src.includes('Formato não encontrado nas apresentações consultadas'),`${label}: JSX grande duplicado saiu da página`);
 check(src.includes('toggleMedicationIdentityColor(previous, hex)')&&src.includes('<MedicationFormatPicker')&&src.includes('<MedicationIdentityColorPicker'),`${label}: M7 e regra de duas cores intactas`);
 check(src.includes('getMedicationCatalogAuthority(')&&src.includes('validateMedication(')&&src.includes('dosageAcknowledgementRef'),`${label}: validade, catálogo e confirmação manual continuam no formulário`);
}
check(modal.includes('role="dialog"')&&modal.includes('aria-modal="true"')&&modal.includes('aria-pressed={selected}')&&modal.includes('event.key !== "Escape"'),'modal acessível: diálogo, seleção, Escape');
check(modal.includes('closeRef.current?.focus()')&&modal.includes('previous?.isConnected')&&modal.includes('motion-reduce:transform-none'),'modal restaura foco e respeita redução de movimento');
check(notice.includes('O catálogo ainda não possui informação suficiente')&&notice.includes('O catálogo ainda não possui evidência atual suficiente'),'catálogo preserva os dois tipos de incerteza');
check(notice.includes('cadastrar normalmente')&&notice.includes('salvar normalmente'),'divergência não impede cadastro nem edição manual');
check(!/(?:\bdb\.|\bsupabase\b|fetch\(|\.insert\(|\.delete\(|\.put\(|updateMedicamento\()/.test(modal+'\n'+notice),'módulos de apresentação não acessam banco');
check(scene.includes('cheek.scale.z=.94')&&scene.includes('noseTip.scale.x=.96'),'Fênix suaviza volumes existentes do rosto');
check(scene.includes('taperedBox(.055,.068,.074,.034)')&&scene.includes('const noseTip=oval(materials.skin,0,2.727,.231,[.026,.017,.023])'),'Fênix preserva as geometrias originais de bochecha e nariz');
check(scene.includes('avatarAdaptiveRatio(')&&scene.includes('renderer.forceContextLoss()')&&!scene.includes('requestAnimationFrame(animate)'),'Fênix preserva limpeza GPU e limite adaptativo');
check(avatar.includes('Consultar contexto do Brain sem mudar de página')&&avatar.includes('Ver contexto registrado · não é diagnóstico')&&avatar.includes('onClick={onBrainSelect}'),'Brain mantém ação local e limite clínico');
check(avatar.includes('focus-visible:outline-violet-300')&&avatar.includes('motion-reduce:transition-none'),'Brain recebe foco visível sem animação obrigatória');

// Renderiza os componentes reais em uma árvore React JSX simplificada:
// verifica interações sem DOM, sem rede e sem qualquer dado clínico persistido.
const jsx=(type,props)=>({type,props:props??{}}),icon=()=>null;
const runtime={jsx,jsxs:jsx,Fragment:'Fragment'};
const deps={
 'react':{useEffect:()=>{},useRef:()=>({current:null})},
 'react/jsx-runtime':runtime,
 'framer-motion':{AnimatePresence:'AnimatePresence',motion:{button:'motion-button',section:'motion-section'}},
 'lucide-react':{Check:icon,X:icon,AlertTriangle:icon},
 '@/lib/medications/form-presentation':{
   MEDICATION_ADDITIONAL_FORMATS:[{id:'spray',label:'Spray',icon},{id:'gel',label:'Gel',icon}],
 },
};
function load(file){const mod=new Module(file,module);mod.require=name=>{if(name in deps)return deps[name];throw Error('M8: import inesperado '+name)};mod._compile(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return mod.exports;}
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'&&'props' in x?[x,...nodes(x.props.children)]:[];
const Sheet=load(files[2]).MedicationAdditionalFormatsSheet;
const Notice=load(files[3]).MedicationCatalogFormatNotice;
let chosen=[],closed=0;
const sheet=Sheet({open:true,selectedFormat:'gel',onSelect:v=>chosen.push(v),onClose:()=>closed++});
const buttons=nodes(sheet).filter(x=>x.type==='button'&&typeof x.props['aria-pressed']==='boolean');
check(buttons.length===2&&buttons[0].props['aria-pressed']===false&&buttons[1].props['aria-pressed']===true,'modal marca seleção real sem alterar catálogo');
buttons[0].props.onClick();
check(chosen.join('|')==='spray'&&closed===1,'seleção chama handler e fecha uma vez');
const backdrop=nodes(sheet).find(x=>x.type==='motion-button');
check(backdrop&&backdrop.props['aria-label']==='Fechar seleção de formato','fundo fecha explicitamente o diálogo');
check(nodes(Sheet({open:false,selectedFormat:'gel',onSelect:()=>{},onClose:()=>{}})).filter(x=>x.type==='button').length===0,'modal fechado não monta botões de formato');
const unknown=Notice({canonicalName:'Exemplo',formatCanBeChecked:false,formatMatches:false,mode:'create'});
check(nodes(unknown).length===1&&nodes(unknown)[0].props.children.includes('informação suficiente'),'sem evidência não fabrica divergência');
const good=Notice({canonicalName:'Exemplo',formatCanBeChecked:true,formatMatches:true,mode:'edit'});
check(good===null,'catálogo compatível não exibe alerta falso');
const conflict=Notice({canonicalName:'Exemplo',formatCanBeChecked:true,formatMatches:false,mode:'edit'});
check(nodes(conflict).some(x=>x.type==='div'&&x.props.role==='status')&&JSON.stringify(conflict).includes('Exemplo')&&JSON.stringify(conflict).includes('salvar normalmente'),'incompatibilidade é informativa, não bloqueante');
const legacy=read('scripts/test-v94-3-toast-medication-identity-contract.mjs');
check(legacy.includes('MedicationAdditionalFormatsSheet')&&legacy.includes('MedicationCatalogFormatNotice')&&legacy.includes('MEDICATION_ADDITIONAL_FORMATS.map'),'V94 atualizado para verificar implementação extraída');
const gate=read('scripts/test-v63-release-gate.mjs');
for(const v of ['m1','m2','m3','m4','m5','m6','m7','m8'])check(gate.includes(`test-vault-${v}-`),`gate cumulativo ${v.toUpperCase()}`);
console.log(`VAULT M8: ${n} verificações de formulários, Fênix, catálogos e acessibilidade aprovadas.`);
