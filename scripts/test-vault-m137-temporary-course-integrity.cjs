#!/usr/bin/env node
"use strict";
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=f=>fs.readFileSync(f,'utf8'); let checks=0;
const ok=(v,label)=>{assert.ok(v,'M137: '+label);console.log(`✓ M137 ${++checks}: ${label}`)};
function load(path,imports={}){
 const src=read(path);
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('module','exports','require',js)(module,module.exports,ref=>{if(ref in imports)return imports[ref];throw Error(`unresolved ${ref}`)});return module.exports;
}
const course=load('lib/health-supply/temporary-course.ts');
const authority=load('lib/dose-plan-authority.ts',{'@/lib/health-supply/temporary-course':course});
const cerumin={start:'2026-11-11',days:5,times:[],firstDoseAt:'2026-11-11T00:00',intervalHours:8,quantityPerDose:5};
const slots=course.temporaryCourseSlots(cerumin);
ok(slots.length===15,'CERUMIN cria exatamente 15 horários de 8 em 8 horas');
ok(course.temporaryCourseTotals(cerumin).plannedUnits===75,'total informado de 75 gotas, sem confundir frascos');
ok(slots[0].date==='2026-11-11'&&slots[0].time==='00:00','primeira dose obedece data e hora informadas');
ok(slots.at(-1).date==='2026-11-15'&&slots.at(-1).time==='16:00','última dose do curso de cinco dias não excede limite');
const reason=course.temporaryCourseNote(cerumin);
ok(authority.isTemporaryCoursePlannedDose({dose_kind:'planned',motivo:reason}),'motivo canônico marca período');
ok(authority.classifyPlannedDose({dose_kind:'planned',motivo:reason})==='temporary_course','período não vira avulsa');
ok(authority.classifyPlannedDose({dose_kind:'planned',motivo:'Dose eventual marcada pelo usuário'})==='ad_hoc','avulsa futura permanece distinta');
ok(authority.classifyPlannedDose({dose_kind:'planned'})==='unknown','agendamento sem origem não vira período por inferência');
ok(authority.classifyPlannedDose({dose_kind:'sos'})==='sos','SOS legítimo preservado');
ok(authority.classifyPlannedDose({dose_kind:'extra'})==='extra','dose extra legítima preservada');
ok(authority.contextualDoseQuantity({estoque_unidade_por_dose:1},{quantidade:5})===5,'dose do horário 5 gotas tem prioridade sobre estoque genérico');
ok(authority.contextualDoseQuantity({estoque_unidade_por_dose:5},null)===5,'dose geral conhecida serve como fallback explícito');
ok(authority.contextualDoseQuantity({estoque_unidade_por_dose:undefined},null)===null,'quantidade não informada permanece desconhecida');
ok(authority.plannedDosePresentation({dose_kind:'planned',motivo:reason})==='Por período','classificação visual sem rótulo SOS');
const repository=read('lib/repositories/doseLogs.ts'),today=read('lib/today/build-timeline-items.ts'),quick=read('components/saude/QuickDoseModal.tsx'),details=read('app/saude/medicamentos/detalhes/page.tsx');
ok(repository.includes('const desired = course ? temporaryCourseSlots(course) : [];')&&!repository.includes('temporaryCourseSlots(course).filter('),'reconciliação inclui horários passados para revisão');
ok(repository.includes('!row.tomado_em && !row.ignorado_em')&&repository.includes('settledBySlot'),'não remove desfechos reais ao editar curso');
ok(repository.includes('row.quantidade !== targetQuantity'),'slots futuros atualizam quantidade apenas quando alterada');
ok(repository.includes('if (oldBySlot.size !== oldPending.length)'),'duplicações antigas bloqueadas para conciliação');
// R5: preservar o nome verificado pelo contrato V323, sem alterar o teste legado.
const legacyV323=read('scripts/test-v323-temporary-treatment-360.cjs');
ok(legacyV323.includes("repo.includes('settledBySlot')") && repository.includes('const settledBySlot = new Set(') &&
  repository.includes('person_id: safePersonId') && repository.includes('user_id: user.id'),
  'V323: slots resolvidos e escopo pessoa/usuário preservados sem reintroduzir filtro futuro');

ok(repository.includes('Já existe um registro neste horário')&&repository.includes('Revise'),'conflito de horário não reclassifica SOS/tomadas reais');
ok(repository.includes('existing?.motivo?.startsWith(TEMPORARY_COURSE_PREFIX)'),'tomada confirmada preserva vínculo do curso no DoseLog');
ok(repository.includes('if (row.motivo !== reason || row.quantidade !== targetQuantity)')&&repository.includes('await db.doseLogs.add(log);'),'repetir mesmo plano preserva identidade dos agendamentos');
ok(today.includes('scheduleOrigin?: DosePlanOrigin')&&today.includes('isAvulsa: false')&&today.includes('isAvulsa: true'),'Hoje distingue curso de avulsa');
// R3: regressão real dos carregadores estritos M19/M23/V94.
// Esses contratos executam o projetor em isolamento e rejeitam imports novos em runtime.
const timelineJS=ts.transpileModule(today,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const runtimeImports=[...timelineJS.matchAll(/require\(["']([^"']+)["']\)/g)].map(row=>row[1]);
const historicalImports=new Set([
  '@/lib/dose-slot-authority', '@/lib/today/acquisition-date-index',
  '@/lib/health-utils', '@/lib/health-intelligence/clinical-stock', '@/lib/health-insights',
]);
ok(runtimeImports.every(id=>historicalImports.has(id)) &&
  !runtimeImports.includes('@/lib/dose-plan-authority'),
  `projetor continua compatível com os loaders fechados M19/M23/V94 (${runtimeImports.join(', ')})`);
const projected=load('lib/today/build-timeline-items.ts',{
  '@/lib/dose-slot-authority':{buildDoseSlotIndex:()=>new Map(),resolveDoseSlot:()=>({state:'absent'})},
  '@/lib/today/acquisition-date-index':{earliestAcquisitionByMedication:()=>new Map()},
  '@/lib/health-utils':{getDaysUntil:()=>null},
  '@/lib/health-intelligence/clinical-stock':{getClinicalStockSnapshot:()=>({registeredQuantity:25,info:{quantidadeRestante:25}})},
  '@/lib/health-insights':{
    analisarComportamentoUso:()=>null, isReceitaAtualVencida:()=>false,
    sugerirRenovacao:()=>({deveRenovar:false,urgencia:'nenhuma',mensagem:''}),
  },
}).buildTodayTimelineItems;
const fixtureMed={id:'cerumin',nome:'CERUMIN',tipo_uso:'temporario',status:'ativo',
  estoque_horarios:[],user_id:'usuario',person_id:'pessoa',estoque_quantidade:25,
  formato:'gota',estoque_unidade_medida:'gota(s)'};
const fixtureLogs=[
  {id:'curso',user_id:'usuario',person_id:'pessoa',medicamento_id:'cerumin',data:'2026-11-12',horario:'08:00',dose_kind:'planned',motivo:reason,quantidade:5},
  {id:'avulso',user_id:'usuario',person_id:'pessoa',medicamento_id:'cerumin',data:'2026-11-12',horario:'13:00',dose_kind:'planned',motivo:'Dose avulsa planejada',quantidade:3},
];
const dayRows=projected({medicamentos:[fixtureMed],doseLogs:fixtureLogs,medicos:[],tratamentos:[],farmacias:[],hospitais:[],historicoDoses:[],registros:[],renovacoes:[],dataSelecionada:'2026-11-12',isHoje:true,userId:'usuario',personId:'pessoa'});
ok(dayRows.length===2 && dayRows.find(row=>row.logId==='curso')?.scheduleOrigin==='temporary_course' &&
  dayRows.find(row=>row.logId==='curso')?.isAvulsa===false &&
  dayRows.find(row=>row.logId==='avulso')?.isAvulsa===true,
  'runtime real da timeline separa curso prescrito de avulsa usando stubs históricos');
// R4: regressão V94 e V98 sem alterar os contratos históricos.
const historicalV94=read('scripts/test-v94-sos-after-discontinuation-contract.mjs');
const historicalV98=read('scripts/test-v98-final-medication-intelligence-contract.mjs');
ok(historicalV94.includes("timeline.includes('isAvulsa: true')") && historicalV98.includes("timeline.includes('isAvulsa: true')") &&
  today.includes('isAvulsa: true') && today.includes('log.dose_kind === "sos"'),
  'V94/V98: SOS continua marcado como avulso na projeção, curso finito não');
const sosOnly = projected({medicamentos:[{...fixtureMed,id:'sos-historico',tipo_uso:'sos',status:'descontinuado'}],
  doseLogs:[{id:'sos-evento',user_id:'usuario',person_id:'pessoa',medicamento_id:'sos-historico',
    data:'2026-11-12',horario:'13:00',dose_kind:'sos',tomado_em:'2026-11-12T13:01:00'}],
  medicos:[],tratamentos:[],farmacias:[],hospitais:[],historicoDoses:[],registros:[],renovacoes:[],
  dataSelecionada:'2026-11-12',isHoje:true,userId:'usuario',personId:'pessoa'});
ok(sosOnly.length===1 && sosOnly[0].logId==='sos-evento' && sosOnly[0].isAvulsa===true &&
  sosOnly[0].scheduleOrigin==='sos' && sosOnly[0].tomada===true,
  'V94: SOS histórico encerrado continua visível, tomado e avulso');
const effectStart=quick.indexOf('Sempre que o medicamento selecionado mudar');
const effectEnd=quick.indexOf('// BUSCA',effectStart);
const quantityEffect=quick.slice(effectStart,effectEnd);
ok(effectStart>0&&effectEnd>effectStart&&
  !quantityEffect.includes('setDoseHora(getCurrentTime())')&&
  quantityEffect.includes('existingScheduledLog?.quantidade'),
  'mudar horário/slot não força QuickDose a voltar para a hora atual');

ok(today.includes('tomada: Boolean(log.tomado_em), ignorada: Boolean(log.ignorado_em)'),'Hoje lê explicitamente tomada e ignorada');
ok(quick.includes('isTemporaryCoursePlannedDose(existingScheduledLog)'),'QuickDose reconhece slot do período');
ok(quick.includes('contextualDoseQuantity(medicamento, slot) ?? 0'),'QuickDose não presume dose de 1 gota');
ok(quick.includes('selectedMed.tipo_uso === "temporario" && doseMode === "ad-hoc"'),'fora do período exige confirmação explícita');
ok(quick.includes('selecionada')||quick.includes('Horários do período'),'horários programados possuem seletor');
ok(details.includes('isTemporaryCoursePlannedDose(log)')&&details.includes('scheduleKind={isTemporary ? "temporary" : "continuous"}'),'detalhes respeitam classificação real');
ok(read('components/saude/MedicationDoseHourChips.tsx').includes('scheduleKind === "temporary"'),'texto de ausência de horários não chama período de contínuo');
ok(read('components/saude/MedicationRoutineSummary.tsx').includes('scheduleKind={scheduleKind}'),'resumo propaga identidade do tratamento');
const fields=read('components/saude/TemporaryCourseFields.tsx');
ok(fields.includes('grid-cols-1')&&fields.includes('sm:grid-cols-2')&&fields.includes('mt-1 w-full'),'horário cabe em coluna completa abaixo de 640px');
const drops=read('components/saude/CalculadoraGotas.tsx');
ok(drops.includes('Frascos adquiridos')&&drops.includes('recipientes * ml * gotasMl'),'um ou mais frascos distinguíveis do saldo em gotas');
ok(drops.includes('recipientesValidos')&&drops.includes('possuiConversaoValida'),'conversão ausente não inventa saldo');
const novo=read('app/saude/medicamentos/novo/page.tsx');
ok(novo.includes('fabricanteAquisicao')&&novo.includes('attachManufacturerMetadata("", { manufacturer: fabricanteAquisicao })'),'fabricante associado apenas à aquisição inicial');
ok(read('app/saude/medicamentos/page.tsx').includes('latestManufacturer')&&read('app/saude/medicamentos/page.tsx').includes('ManufacturerBadge'),'badge mostra somente fabricante associado à última aquisição');
ok(read('components/hoje/TodayFilterPanel.tsx').includes('Fechar filtros'),'filtros combinados com fechamento explícito');
const date=read('components/DatePicker.tsx');
ok(date.includes('shouldCloseOnSelect')&&date.includes('setCalendarOpen(false)'),'calendário compartilhado fecha após escolha');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-m137-temporary-course-integrity.cjs')&&gate.includes('scripts/test-vault-m136-visual-navigation.cjs'),'contratos M136 e M137 preservados no gate canônico');
ok(gate.indexOf('scripts/test-vault-m135-sync-integrity.cjs') < gate.indexOf('scripts/test-vault-m136-visual-navigation.cjs') && gate.indexOf('scripts/test-vault-m136-visual-navigation.cjs') < gate.indexOf('scripts/test-vault-m137-temporary-course-integrity.cjs'), 'ordem M135 → M136 → M137 preservada');
const paths=['lib/dose-plan-authority.ts','lib/repositories/doseLogs.ts','lib/today/build-timeline-items.ts','components/saude/QuickDoseModal.tsx','components/saude/MedicationDoseHourChips.tsx','components/saude/MedicationRoutineSummary.tsx','app/saude/medicamentos/detalhes/page.tsx','components/saude/TemporaryCourseFields.tsx','components/hoje/TodayFilterPanel.tsx','components/DatePicker.tsx','components/saude/CalculadoraGotas.tsx','app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx'];
for(const f of paths){const src=ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(src.parseDiagnostics.length===0,`${f}: sintaxe TS/TSX válida`)}
console.log(`VAULT M137: ${checks} garantias locais verificadas; TypeScript global e gate ainda devem ser executados.`);
