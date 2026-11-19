#!/usr/bin/env node
'use strict';
/** D4 P5 — autoridade de corte + prévia da edição + compatibilidade de contratos. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,'D4 P5: '+message);checks++};
const read=path=>fs.readFileSync(path,'utf8');
function load(path,imports={}){
  const js=ts.transpileModule(read(path),{fileName:path,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const box={exports:{}};
  new Function('module','exports','require',js)(box,box.exports,id=>{if(Object.hasOwn(imports,id))return imports[id];throw new Error('Módulo inesperado '+id+' em '+path)});
  return box.exports;
}
const course=load('lib/health-supply/temporary-course.ts');
const revision=load('lib/clinical/temporary-course-revision-p5.ts',{'@/lib/health-supply/temporary-course':course});
const old={start:'2026-11-18',days:7,times:['08:00','20:00'],quantityPerDose:1};
const oldSlots=course.temporaryCourseSlots(old);
ok(oldSlots.length===14,'legado: 14 horários, não regredir');
ok(oldSlots[0].date==='2026-11-18'&&oldSlots[0].time==='08:00','legado: primeiro horário original');
ok(course.temporaryCourseNote(old)==='Tratamento temporário · 2026-11-18 · 7 dia(s)','legado: nota canônica idêntica');
ok(course.parseTemporaryCourseNote(course.temporaryCourseNote(old)).firstPlannedAt===undefined,'legado: sem âncora inventada');
const retro={...old,firstPlannedAt:'2026-11-18T20:00'};
const slots=course.temporaryCourseSlots(retro);
ok(slots.length===13,'corte retroativo remove somente 1 horário do primeiro dia');
ok(course.temporaryCourseSlots({...retro,times:['20:00','08:00']})[1].time==='08:00','horários fixos fora de ordem geram sequência cronológica');
ok(slots[0].date==='2026-11-18'&&slots[0].time==='20:00','corte começa no horário escolhido');
ok(slots[1].date==='2026-11-19'&&slots[1].time==='08:00','segundo dia permanece íntegro');
ok(slots.at(-1).date==='2026-11-24'&&slots.at(-1).time==='20:00','não acrescenta dose compensatória');
ok(course.temporaryCourseEnd(retro)==='2026-11-24','não prolonga 7 dias prescritos');
ok(course.temporaryCourseTotals(retro).plannedUnits===13,'somatório respeita dose cortada; sem descontar estoque');
const note=course.temporaryCourseNote(retro);
const parsed=course.parseTemporaryCourseNote(note);
ok(parsed?.firstPlannedAt==='2026-11-18T20:00','âncora persistida na nota estruturada');
ok(course.temporaryCourseSlots({...parsed,times:['08:00','20:00']}).length===13,'nota restituível no motor');
ok(course.temporaryCourseNote({...parsed,times:['08:00','20:00']})===note,'round-trip não altera chave canônica');
for(const patch of [
  {firstPlannedAt:'2026-11-18T07:30'},
  {firstPlannedAt:'2026-11-19T20:00'},
  {firstPlannedAt:'2026-11-18T25:00'},
]){assert.throws(()=>course.temporaryCourseSlots({...retro,...patch}));ok(true,'âncora não prescrita ou inválida bloqueada')}
ok(course.parseTemporaryCourseNote('Tratamento temporário · 2026-02-30 · 7 dia(s) · primeiro previsto 2026-02-30T20:00')===null,'dia de calendário inválido exige revisão');
const interval={start:'2026-11-18',days:7,times:[],firstDoseAt:'2026-11-18T23:30',intervalHours:12,quantityPerDose:5};
const intervalSlots=course.temporaryCourseSlots(interval);
ok(intervalSlots[0].time==='23:30'&&intervalSlots[1].date==='2026-11-19'&&intervalSlots[1].time==='11:30','12/12h retroativo cruza meia-noite');
ok(intervalSlots.length===14,'7 dias por 12/12h: contagem original preservada');
ok(course.parseTemporaryCourseNote(course.temporaryCourseNote(interval)).firstDoseAt===interval.firstDoseAt,'intervalo legado preservado');
assert.throws(()=>course.temporaryCourseSlots({...interval,firstPlannedAt:'2026-11-18T23:30'}));ok(true,'não mistura intervalos e horários fixos');
const log=(date,time,extra={})=>({user_id:'u',person_id:'p',medicamento_id:'m',data:date,horario:time,dose_kind:'planned',motivo:course.temporaryCourseNote(old),...extra});
const logs=[log('2026-11-18','08:00'),log('2026-11-18','20:00'),log('2026-11-19','08:00',{tomado_em:'2026-11-19T08:05:00'}),log('2026-11-19','20:00'),log('2026-11-18','11:00',{person_id:'outra'})];
const view=revision.previewTemporaryCourseRevisionD4P5({userId:'u',personId:'p',medicationId:'m',course:retro,logs});
ok(view.cancelled===1,'prévia detecta 1 agendamento em aberto que será retirado');
ok(view.settledPreserved===1,'dose tomada permanece no histórico protegido');
ok(view.kept===2,'agendamentos compatíveis preservados');
ok(view.created===10,'agendamentos faltantes contabilizados sem duplicar tomada real');
ok(view.conflicts.length===0,'dados canônicos coerentes não geram conflito falso');
ok(view.removedSlots[0]==='2026-11-18T08:00','prévia informa precisamente o horário que deixa de ser agendado');
ok(view.protectedSlots.includes('2026-11-19T08:00'),'prévia mostra história resolvida sem a reescrever');
ok(view.addedSlots.length===10,'prévia informa os novos horários sem criar dados');
ok(logs.length===5&&!logs[0].tomado_em,'prévia não altera os dados de origem');
const collision=revision.previewTemporaryCourseRevisionD4P5({userId:'u',personId:'p',medicationId:'m',course:retro,
  logs:[...logs,log('2026-11-20','20:00',{dose_kind:'sos',motivo:'SOS confirmado'})]});
ok(collision.conflicts.length===1,'SOS concorrente em horário novo é bloqueado, não convertido');
const duplicate=revision.previewTemporaryCourseRevisionD4P5({userId:'u',personId:'p',medicationId:'m',course:retro,
  logs:[...logs,log('2026-11-18','20:00')]});
ok(duplicate.conflicts.some(x=>x.includes('duplicados')),'duplicação existente requer auditoria');
const scoped=revision.previewTemporaryCourseRevisionD4P5({userId:'outro',personId:'p',medicationId:'m',course:retro,logs});
ok(scoped.created===13&&scoped.settledPreserved===0,'não reutiliza dados de outra conta');
const files=[
 'lib/health-supply/temporary-course.ts','components/saude/TemporaryCourseFields.tsx',
 'app/saude/medicamentos/novo/page.tsx','app/saude/medicamentos/editar/page.tsx',
 'lib/clinical/course-agenda-preview-d4.ts','lib/clinical/temporary-course-journey-d4.ts',
 'lib/clinical/temporary-course-revision-p5.ts','components/saude/TemporaryCourseRevisionPreviewP5.tsx',
];
for(const path of files){const source=read(path);const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);ok(ast.parseDiagnostics.length===0,'sintaxe '+path)}
const fields=read('components/saude/TemporaryCourseFields.tsx');
ok(fields.includes('temporaryCourseRequiresFirstChoice')&&fields.includes('firstFixedTime')&&fields.includes('Conferência antes de salvar'),'formulário suporta corte com resumo');
ok(fields.includes('min-h-11')&&fields.includes('aria-pressed')&&fields.includes('focus-visible:outline'),'controle acessível no Android');
ok(fields.includes('Não serão compensados automaticamente')&&fields.includes('não confirma tomadas nem altera estoque'),'UI não compensa doses nem confirma tomadas ou altera estoque');
const m60=read('scripts/test-vault-m60-medication-form-ux.cjs');
ok(m60.includes('return slots;},')&&!m60.includes('return [course]'),'M60 conserva expectativa válida usando simulação de slots reais, não fake sem data');
const edit=read('app/saude/medicamentos/editar/page.tsx');
ok(edit.includes('setTemporaryCourseExistingLogs(medicationLogs)')&&edit.includes('log.person_id === activePersonId'),'edição lê somente registros da pessoa e conta');
ok(edit.includes('temporaryCourseRevisionPreview.cancelled > 0 && !temporaryCourse.confirmedReview'),'remover pendência exige confirmação');
ok(edit.includes('<TemporaryCourseRevisionPreviewP5')&&edit.includes('confirmedReview: false'),'prévia é visível e mudanças invalidam aceite');
ok(edit.includes('doseLogsRepository.replaceTemporaryCourse({ personId: safePersonId, medicamentoId: id, course })'),'continua escrevendo somente no repositório canônico');
const agenda=read('lib/clinical/course-agenda-preview-d4.ts'),journey=read('lib/clinical/temporary-course-journey-d4.ts');
ok(agenda.includes('parsed.firstPlannedAt')&&agenda.includes('parsed?.firstPlannedAt'),'D4 P3 valida nota e rejeita slots anteriores');
ok(journey.includes('course.firstPlannedAt')&&journey.includes('course?.firstPlannedAt'),'D4 P1 mantém âncora e não conta horário fantasma');
const repo=read('lib/repositories/doseLogs.ts');
ok(repo.includes('const desired = course ? temporaryCourseSlots(course) : [];'),'uma única autoridade de horários');
ok(repo.includes('settledBySlot')&&repo.includes('!row.tomado_em && !row.ignorado_em'),'preserva eventos já resolvidos');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.split('"scripts/test-vault-ci360-d4-p5-inicio.cjs"').length===2,'novo contrato registrado uma vez');
ok(gate.includes('"scripts/test-vault-ci360-d4-p3-agenda.cjs"')&&gate.includes('"scripts/test-vault-ci360-d4-p2-decisoes.cjs"'),'P2 e P3 preservadas');
console.log(`VAULT_D4_P5_OK: ${checks} contratos; sem dose fictícia, sem estoque alterado, sem extensão automática.`);
