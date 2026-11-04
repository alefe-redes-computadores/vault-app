#!/usr/bin/env node
"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
let count=0;
const ok=(condition,message)=>{assert.ok(condition,`M60: ${message}`);count++;};
const files=[
'app/saude/medicamentos/novo/page.tsx',
'app/saude/medicamentos/editar/page.tsx',
'components/saude/TemporaryCourseFields.tsx',
'components/saude/MedicationCatalogNameComparison.tsx',
'components/saude/MedicationCatalogFormatNotice.tsx',
'components/saude/MedicationIdentityColorPicker.tsx',
'components/saude/MedicationPrescriptionCard.tsx',
'components/saude/MedicationJourneySummary.tsx',
'components/saude/MedicationAcquisitionQuantityGuide.tsx',
'components/saude/MedicationPurchaseRhythmBrief.tsx',
'components/saude/MedicationSuspensionSummary.tsx',
'components/saude/TreatmentLinkedMetrics.tsx',
'components/saude/MedicationCatalogQuickOption.tsx',
];
const jsx={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}}),Fragment:'fragment'};
const Icon=()=>null;
const iconModules=new Proxy({},{get:()=>Icon});
const react={memo:f=>f,useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect:()=>{},useRef:()=>({current:null})};
let purchased=[];
const imports={
 'react':react,'react/jsx-runtime':jsx,'lucide-react':iconModules,
 '@/components/DatePicker':{CustomDatePicker:()=>null},
 '@/components/saude/HealthTimePicker':{HealthTimePicker:()=>null},
 '@/components/saude/MedicationFormatIcon':{MedicationFormatIcon:()=>null},
 '@/lib/medications/form-presentation':{MEDICATION_IDENTITY_COLORS:['#F00000','#00FF00','#112233']},
 '@/lib/health-supply/temporary-course':{
 temporaryCourseSlots:course=>{if(!course.start || course.days<1 || course.days>30 || course.times.some(x=>!/^\d{2}:\d{2}$/.test(x)))throw Error('invalid');return [course]},
 temporaryCourseEnd:()=> '2026-11-15',
 temporaryCourseTotals:course=>({plannedDoses:course.times.length*course.days,plannedUnits:course.times.length*course.days*course.quantityPerDose}),
 },
 '@/lib/health-intelligence/medication-journey-signal':{medicationJourneySignal:()=>({label:'Eventos separados',tone:'planning',explanation:'Sem inferir estoque'})},
 '@/lib/health-intelligence/medication-purchase-rhythm':{
 analyzePurchaseRhythms:()=>purchased,
 analyzeMedicationPurchaseRhythm:()=>({typicalIntervalDays:21,suggestedDate:'2026-11-24',nextPlannedDate:'2026-11-20',coveredByPlanning:true,confidence:'baixa'}),
 },
};
const load=file=>{
 const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const m=new Module(file,module);m.require=id=>{if(Object.hasOwn(imports,id))return imports[id];throw Error(`M60 unmocked dependency ${id} from ${file}`)};m._compile(out,file);return m.exports;
};
const tree=v=>Array.isArray(v)?v.flatMap(tree):v==null||typeof v!=='object'?[]:[v,...tree(v.props?.children)];
const nodes=(v,type)=>tree(v).filter(n=>n.type===type);
const text=v=>Array.isArray(v)?v.map(text).join(''):v==null?'':typeof v==='object'?text(v.props?.children):String(v);
for(const f of files){
 const src=fs.readFileSync(f,'utf8');const parsed=ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(parsed.parseDiagnostics.length===0,`TSX parse ${f}`);
}
const create=fs.readFileSync(files[0],'utf8'),edit=fs.readFileSync(files[1],'utf8');
ok(create.includes('Progresso do cadastro do medicamento'),'progresso do cadastro com nome acessível');
ok(create.includes('aria-valuenow={currentStep}')&&create.includes('aria-valuemax={totalSteps}'),'progresso usa etapa real');
ok(create.includes('aria-current={index+1===currentStep?"step":undefined}'),'etapa ativa marcada semanticamente');
ok(create.includes('para {stepLabels[currentStep]}'),'botão Avançar anuncia destino');
ok(create.includes('Voltar à etapa {currentStep - 1}'),'botão de retorno anuncia etapa anterior');
ok(create.includes('Concluir Cadastro')&&create.includes('disabled={\n                  isSubmitting'),'salvar continua protegido');
ok(edit.includes('setShowConfirmExitModal(\n                          true'),'descarte continua exigindo confirmação');
ok(edit.includes('min-h-11 shrink-0 items-center'),'descarte possui alvo móvel adequado');
const {TemporaryCourseFields,readTemporaryCourseDraft}=load(files[2]);
const incomplete={enabled:true,start:'',days:'',times:[],quantityPerDose:''};let fields=TemporaryCourseFields({value:incomplete,onChange:()=>{}});
ok(text(fields).includes('Para visualizar o plano'),'prescrição incompleta orienta, não inventa previsão');
for(const phrase of ['data de início','duração','quantidade por dose','horários'])ok(text(fields).includes(phrase),`incompleto menciona ${phrase}`);
ok(nodes(fields,'input').every(x=>x.props['aria-label']),'quantidades possuem nome acessível');
let course={enabled:true,start:'2026-11-04',days:'5',times:['08:00','20:00'],quantityPerDose:'1'};
fields=TemporaryCourseFields({value:course,onChange:()=>{}});
ok(text(fields).includes('10 dose(s)'),'plano válido preserva dose planejada exata');
ok(text(fields).includes('10 unidade(s) previstas'),'unidades são projeção e não estoque realizado');
ok(!text(fields).includes('Para visualizar o plano'),'sem aviso de pendências quando completo');
const bad={...course,days:'40'};
fields=TemporaryCourseFields({value:bad,onChange:()=>{}});
ok(text(fields).includes('Revise os valores e horários informados'),'inválido completo não é tratado como pronto');
ok(!text(fields).includes('Plano calculado'),'sem resumo para dose inválida');
ok(readTemporaryCourseDraft({...course,enabled:false})===null,'desligado não cria tratamento temporário');
const {MedicationCatalogNameComparison}=load(files[3]);
let comp=MedicationCatalogNameComparison({currentName:'Nome digitado',referenceName:'Nome referência',score:1.5,activeIngredients:'Substância'});
ok(text(comp).includes('100%')&&!text(comp).includes('150%'),'percentual textual limitado no máximo');
ok(text(comp).includes('Correspondência aproximada dos nomes'),'correspondência não é avaliação clínica');
ok(text(comp).includes('Não confirma equivalência'),'comparação não valida medicamento');
comp=MedicationCatalogNameComparison({currentName:'Nome',referenceName:'Nome',score:-5});
ok(text(comp).includes('0%'),'percentual textual limitado no mínimo');
comp=MedicationCatalogNameComparison({currentName:'Nome',referenceName:'Nome',score:NaN});
ok(text(comp).includes('Não calculada'),'pontuação ausente não mostra zero falso');
const {MedicationCatalogFormatNotice}=load(files[4]);
ok(text(MedicationCatalogFormatNotice({canonicalName:'Exemplo',formatCanBeChecked:false,formatMatches:false,mode:'create'})).includes('informação suficiente'),'sem evidência não finge confirmação');
ok(MedicationCatalogFormatNotice({canonicalName:'Exemplo',formatCanBeChecked:true,formatMatches:true,mode:'edit'})===null,'formato correspondente não cria alerta');
comp=MedicationCatalogFormatNotice({canonicalName:'Exemplo',formatCanBeChecked:true,formatMatches:false,mode:'edit'});
ok(text(comp).includes('pode manter esse formato')&&text(comp).includes('não substitui'),'divergência é orientação, não bloqueio');
const {MedicationIdentityColorPicker}=load(files[5]);
let colorPicked=[];let colors=MedicationIdentityColorPicker({colors:['#F00000'],onToggleColor:c=>colorPicked.push(c)});
ok(nodes(colors,'button').find(b=>b.props['aria-pressed']===true)?.props['aria-label'].includes('#F00000'),'cor selecionada anunciada');
ok(text(colors).includes('1 de 2 cores selecionadas')&&text(colors).includes('#F00000'),'cor escolhida visível sem hover');
nodes(colors,'button')[1].props.onClick();ok(colorPicked[0]==='#00FF00','escolha delegada ao formulário sem persistência');
const {MedicationPrescriptionCard}=load(files[6]);
let events=[];let recipe=MedicationPrescriptionCard({typeLabel:'Receita',badge:{label:'Exigida pelo SUS',colorClass:'text-violet-300'},status:'due_today',issuedAt:'01/11/2026',expiresAt:'04/11/2026',nextAt:'07/11/2026',validityLabel:'Vencimento',nextLabel:'Próxima',hasAttachment:false,onPlan:()=>events.push('plan'),onAttachment:()=>events.push('attachment'),onLink:()=>events.push('link'),onReceived:()=>events.push('received')});
ok(text(recipe).includes('Vence hoje')&&text(recipe).includes('Exigida pelo SUS'),'receita exibe estado sem inferir compra');
let recipeButtons=nodes(recipe,'button');ok(recipeButtons.length===3,'ações originais de receita mantidas');
recipeButtons.forEach(x=>x.props.onClick());ok(events.join('|')==='plan|link|received','links mantêm destinos autorizados');
const {MedicationJourneySummary}=load(files[7]);
const snap={overdueWithdrawals:1,pendingWithdrawals:2,plannedAcquisitions:1,completedAcquisitions:3,prescriptions:2,latestPrescriptionDate:'2026-11-01',latestAcquisitionDate:'2026-11-02',nextPlannedAcquisitionDate:'2026-11-10',nextWithdrawalDate:'2026-11-04'};
let opened=[];let journey=MedicationJourneySummary({snapshot:snap,medicationId:'med 1',onNavigate:h=>opened.push(h)});
ok(text(journey).includes('Retiradas: 2 pendente(s)'),'contador não anuncia retirada realizada');
ok(text(journey).includes('Compras')===false || text(journey).includes('Planejadas'),'planejamento continua identificado como tal');
ok(text(journey).includes('Receitas')&&text(journey).includes('Aquisições'),'eventos separados');
ok(nodes(journey,'button').some(b=>String(b.props['aria-label']).includes('retiradas')),'navegação de retiradas comunica escopo');
const {MedicationAcquisitionQuantityGuide}=load(files[8]);
let guide=MedicationAcquisitionQuantityGuide({medicamento:{nome:'Nome excepcionalmente comprido sem cortes',estoque_unidade_medida:'comprimidos'},quantity:'2'});
ok(text(guide).includes('Nome excepcionalmente comprido sem cortes'),'nome completo preservado');
ok(text(guide).includes('Não presuma que 1 caixa'),'não converte embalagens em unidades');
const {MedicationPurchaseRhythmBrief,MedicationPurchaseRhythmCard}=load(files[9]);
purchased=[{medicationId:'m1',nextPlannedDate:'2026-11-12',suggestedDate:'2026-11-15'},{medicationId:'m2',nextPlannedDate:null,suggestedDate:'2026-11-15'}];
const context={hoje:'2026-11-04',medicamentos:[{id:'m1',nome:'Medicamento de nome longo e detalhe extensivo'},{id:'m2',nome:'Outro'}],renovacoes:[]};
let rhythm=MedicationPurchaseRhythmBrief({context,onNavigate:h=>opened.push(h)});
ok(text(rhythm).includes('Ritmo de aquisição'),'projeção de compra apresentada');
ok(text(rhythm).includes('Sugestões não criam compras'),'projeção sem gravação');
ok(nodes(rhythm,'button').length>=2,'múltiplos medicamentos continuam acessíveis');
const oldRx=MedicationPurchaseRhythmCard({events:[],medicationId:'m1',todayISO:'2026-11-04'});
ok(text(oldRx).includes('Intervalo típico observado'),'histórico de compra não soma doses');
const {MedicationSuspensionSummary}=load(files[10]);
let susp=MedicationSuspensionSummary({discontinuedAt:'03/11/2026',reason:'Encerrado',replacement:{name:'Outro',dosage:'10mg'},onOpenReplacement:()=>events.push('susp')});
let suspBtn=nodes(susp,'button')[0];ok(suspBtn.props.disabled===true,'substituto legado sem id não navega');
ok(suspBtn.props['aria-label'].includes('sem vínculo navegável'),'sem destino não anuncia abertura');
ok(text(susp).includes('Sem vínculo'),'ausência de vínculo explícita');
susp=MedicationSuspensionSummary({discontinuedAt:'03/11/2026',replacement:{id:'m2',name:'Outro',dosage:'10mg'},onOpenReplacement:()=>events.push('susp')});
suspBtn=nodes(susp,'button')[0];ok(suspBtn.props.disabled===false,'vínculo existente navegável');
suspBtn.props.onClick();ok(events.at(-1)==='susp','delegação da navegação ao dono do dado');
const {TreatmentLinkedMetrics}=load(files[11]);
let metrics=TreatmentLinkedMetrics({items:[{label:'Receitas',value:3,Icon},{label:'Retiradas',value:0,Icon}]});
ok(nodes(metrics,'strong').length===1,'somente métricas registradas');
ok(nodes(metrics,'strong')[0].props['aria-label']==='3 receitas','contador anunciado com tipo de vínculo');
ok(TreatmentLinkedMetrics({items:[{label:'Receitas',value:0,Icon}]})===null,'nenhum vínculo não cria métrica');
const {MedicationCatalogQuickOption}=load(files[12]);
let picked=0;let result={canonicalName:'Referência de demonstração',referenceType:'substance'};
let option=MedicationCatalogQuickOption({result,selected:false,onSelect:()=>picked++});
ok(nodes(option,'button')[0].props['aria-label'].startsWith('Usar referência'),'referência não escolhida identificável');
nodes(option,'button')[0].props.onClick();ok(picked===1,'clique delega ao formulário');
option=MedicationCatalogQuickOption({result,selected:true,onSelect:()=>picked++});
ok(nodes(option,'button')[0].props['aria-label'].startsWith('Usar referência'),'rótulo histórico de escolha preservado');
const gate=fs.readFileSync('scripts/test-v63-release-gate.mjs','utf8');
ok(gate.includes('scripts/test-vault-m60-medication-form-ux.cjs'),'novo teste integrado ao gate V63');
for(const prev of ['test-vault-m59-medication-journey.cjs','test-vault-m58-premium-daily-ux.cjs','test-vault-m57-android-export.cjs','test-vault-m56-form-selection.cjs'])ok(gate.includes(prev),'gate mantém o contrato '+prev);
console.log(`M60 FLUXO CLINICO PREMIUM: ${count} verificações aprovadas.`);
