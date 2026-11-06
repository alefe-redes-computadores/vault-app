#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const assert=require("node:assert/strict");
const ts=require("typescript");
let checks=0;
const ok=(condition, label)=>{assert.ok(condition,`M76: ${label}`);console.log(`✓ ${++checks}: ${label}`);};
const read=(path)=>fs.readFileSync(path,"utf8");
const parse=(path)=>{
  const s=read(path);
  const parsed=ts.createSourceFile(path,s,ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(parsed.parseDiagnostics.length===0,`${path}: sintaxe TS/TSX`);
  return s;
};
const pure=parse("lib/today/agenda-overview.ts");
const compiled=ts.transpileModule(pure,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function("module","exports",compiled)(m,m.exports);
const project=m.exports.buildTodayAgendaOverview;
const sample=project({
  now:"17:30",
  doses:[{horario:"22:00",medicamentoNome:"Dose futura",tomada:false,ignorada:false},
    {horario:"10:00",medicamentoNome:"Resolvida",tomada:true,ignorada:false},
    {horario:"12:00",medicamentoNome:"Ignorada",tomada:false,ignorada:true}],
  reminders:[{id:"r",time:"15:00",title:"Lembrar de registrar água"}],
  appointments:[{id:"c",horario:"18:00",tipo:"consulta"},{id:"w",tipo:"retirada"}],
});
ok(sample.rows.map(x=>x.time).join("|")==="15:00|18:00|22:00","agenda entre categorias é cronológica, não por bloco");
ok(sample.rows.map(x=>x.kind).join("|")==="reminder|appointment|dose","prévia preserva origem de cada evento");
ok(sample.rows[2].context==="Dose prevista"&&sample.dueDoseCount===0,"dose futura não é tratada como atrasada ou pendente agora");
ok(sample.untimedAppointments===1,"retirada sem horário não recebe hora fictícia");
ok(!sample.rows.some(x=>x.title==="Resolvida"||x.title==="Ignorada"),"tomada e ignorada não reaparecem como pendentes");
const conflicts=project({now:"10:30",doses:[{horario:"10:00",tomada:false,ignorada:false,isDataConflict:true},{horario:"10:00",tomada:false,ignorada:false,isExpectedUnconfirmed:true},{horario:"10:00",tomada:false,ignorada:false}],reminders:[],appointments:[]});
ok(conflicts.rows.length===1&&conflicts.rows[0].context==="Dose a revisar"&&conflicts.dueDoseCount===1,"conflitos e ausência histórica de confirmação são excluídos");
const invalid=project({now:"10:30",doses:[{horario:"99:99",tomada:false,ignorada:false}],reminders:[{id:"x",time:"14:80",title:"Inválido"}],appointments:[{tipo:"exame",horario:""}]});
ok(invalid.rows.length===0&&invalid.untimedAppointments===1,"horários inválidos não são inventados");
const stable=project({now:"08:00",doses:[{horario:"09:00",medicamentoNome:"A",tomada:false,ignorada:false},{horario:"09:00",medicamentoNome:"B",tomada:false,ignorada:false}],reminders:[],appointments:[]});
ok(stable.rows.map(x=>x.title).join("|")==="A|B","empates mantêm ordem original estável");
const cap=project({now:"00:00",doses:Array.from({length:9},(_,i)=>({horario:`0${i}:00`,tomada:false,ignorada:false})),reminders:[],appointments:[]},3);
ok(cap.rows.length===3&&cap.hiddenCount===6,"prévia é compacta e preserva contagem de mais itens");
const view=parse("components/hoje/TodayAgendaOverview.tsx");
ok(view.includes('Atenção do dia')&&view.includes('Agenda por horário')&&view.includes('onOpenWithdrawals'),"Hoje mostra atenção e navegação para retirada sem inventar estado");
ok(view.includes('onJump(item.destination)')&&view.includes('remindersCount > 0'),"previsão acessa seções existentes e lembra da agenda completa");
const today=parse("app/hoje/page.tsx");
ok(today.indexOf('<TodayAgendaOverview')<today.indexOf('id="hoje-doses"')&&today.indexOf('<TodayAgendaOverview')>0,"atenção aparece antes da lista extensa de doses");
ok(today.indexOf('<TodayActionCenter')<today.indexOf('id="hoje-doses"')&&today.indexOf('<TodayActionCenter')>0,"Brain de Hoje sobe sem duplicar autoridade");
ok(today.includes('id="hoje-compromissos"')&&today.includes('buildTodayAgendaOverview'),"reaproveita a agenda e os destinos reais");
const meds=parse("app/saude/medicamentos/page.tsx");
ok(meds.includes('className="sr-only" title={`Princípio ativo: ${activeIngredient}`}')&&meds.includes('aria-hidden="true" className="min-w-0 line-clamp-1 break-words text-xs font-medium'),"princípio ativo visível com leitura acessível única");
ok(meds.includes('Princípio ativo: {activeIngredient}')&&meds.includes('line-clamp-1 break-words text-xs font-medium')&&meds.includes('showActiveIngredient'),"princípio ativo aparece quando conhecido e não duplicado");
ok(meds.includes('ChevronDown,')&&meds.includes('Unidade do estoque diferente · revisar')&&meds.includes('Unidade do estoque: {stockReview}'),"alerta de unidade fica visível e texto completo acessível");
ok(meds.includes('setQuickDoseMedId(med.id!)')&&meds.includes('medsPrioridade.map(renderCard)'),"ação de dose e grupos canônicos preservados");
const medFilters=parse("components/saude/MedicationFilterBar.tsx");
const todayFilters=parse("components/hoje/TodayFilterPanel.tsx");
const generalFilters=parse("components/list/ListFilters.tsx");
const retired=parse("app/saude/retiradas/page.tsx");
const active=parse("components/saude/MedicationListActiveFilter.tsx");
ok([medFilters,todayFilters,generalFilters,retired,active].every(x=>x.includes('min-h-11')),"filtros usam alvo tátil mínimo comum");
ok(medFilters.includes('aria-pressed={value === key}')&&todayFilters.includes('aria-pressed={active}')&&retired.includes('aria-pressed={status === key}'),"estado real dos filtros preservado");
ok(retired.includes('Reorganizar retiradas')&&retired.includes('WithdrawalBatchPlanner')&&retired.includes('setStatus("atrasada")'),"retiradas: prioridades antes de ferramentas secundárias");
const treatment=parse("app/saude/tratamentos/detalhes/page.tsx");
ok(treatment.includes('Já está cadastrado? Revisar medicamento existente')&&treatment.includes('tratamento_id=${encodeURIComponent(id)}')&&treatment.includes('possibleMedications.map('),"tratamento mantém ações explícitas, sem vínculo automático");
const avatar=parse("components/saude/HealthAvatar.tsx");
ok(avatar.includes('text-xs leading-relaxed text-ink-muted')&&avatar.includes('Ver contexto registrado · não é diagnóstico'),"Fênix mantém ressalva e legendas legíveis");
const home=parse("components/home/HomeAttentionRail.tsx");
ok(home.includes('alerts.slice(0, 1)')&&home.includes('renderAlert(alert)'),"Home preserva identidade de alertas e prioridade existente");
const gate=read("scripts/test-v63-release-gate.mjs");
ok(gate.indexOf('"scripts/test-vault-m76-final-visual-ux.cjs"')<gate.indexOf('"scripts/test-vault-m75-visible-coherence.cjs"'),"novo contrato é o primeiro do gate global");
console.log(`VAULT M76: ${checks} verificações funcionais + estruturais, sem operações clínicas.`);
