'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const files=[
 'app/hoje/page.tsx','app/mais/page.tsx','app/perfil/page.tsx',
 'app/saude/medicamentos/page.tsx','app/ajuda/page.tsx','app/pessoas/editar/page.tsx',
 'components/hoje/TodayDateNavigation.tsx','components/hoje/TodayRoutinePulse.tsx',
 'components/hoje/TodayAgendaOverview.tsx','components/hoje/TodayRemindersPanel.tsx',
 'components/updates/VaultUpdateDisclosureR4.tsx','components/saude/MedicationActionsSheetR4.tsx'
];
for(const file of files){
 const content=read(file);
 const tree=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(tree.parseDiagnostics.length,0,'TSX parse '+file+': '+tree.parseDiagnostics.map(d=>d.messageText).join(';'));
}
const page=read('app/hoje/page.tsx'),cal=read('components/hoje/TodayDateNavigation.tsx');
const pulse=read('components/hoje/TodayRoutinePulse.tsx'),agenda=read('components/hoje/TodayAgendaOverview.tsx');
const more=read('app/mais/page.tsx'),profile=read('app/perfil/page.tsx');
const med=read('app/saude/medicamentos/page.tsx'),actions=read('components/saude/MedicationActionsSheetR4.tsx');
const help=read('app/ajuda/page.tsx'),update=read('components/updates/VaultUpdateDisclosureR4.tsx');
const person=read('app/pessoas/editar/page.tsx');
assert(!cal.includes('type="date"')&&cal.includes('aria-haspopup="dialog"')&&cal.includes('role="dialog"'),'custom date sheet no native picker');
assert(cal.includes('Semana da data selecionada')&&cal.includes('Voltar para Hoje')&&cal.includes('onSelectDate(value)'),'week strip and direct day selection');
assert(!page.includes('data-vault-p5p5-dose-shortcut="true"')&&page.includes('LINHA DO TEMPO'),'Today header minimal');
assert(pulse.includes('Entender o progresso')&&pulse.includes('Este total é da linha do tempo selecionada'),'progress explanation behind info');
assert(agenda.includes('previewRows=overview.rows.filter(item=>item.kind!=="appointment")')&&page.includes('<TodayAppointmentCard'),'no duplicated appointment card identity');
assert(page.includes('TodayActionCenter')&&page.includes('TodayAgendaOverview'),'Brain operational context kept');
assert(page.includes('SmilePlus')&&page.includes('Registrar sintoma'),'check-in semantics');
assert(page.includes('vault:today:r4-return')&&page.includes('saved.person!==activePersonId'),'same owner/date scroll only');
assert(more.includes('<VaultUpdateDisclosureR4')&&more.includes('<VaultUpdateCenter />')&&more.includes('id="vault-updates-r4"')&&update.includes('return <summary'),'update diagnostics preserved, direct official center under collapsed accordion');
assert(update.includes('state.installedVersion||APP_VERSION'),'no made-up APK version');
assert(more.includes('grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 [&_button]:min-w-0')&&more.includes('grid grid-cols-1 gap-2 border-t border-surface-border/35 pb-3 pt-3'),'data grid');
assert(more.includes('return_to=%2Fmais')&&profile.includes('Voltar para Mais')&&person.includes('fromMoreR4 ? "/mais" : "/pessoas"'),'canonical return Mais');
assert(help.includes('topicGroupsR4')&&help.includes('searchHelpTopics(query)'),'help semantic groups and search');
assert(med.includes('grid-cols-[minmax(0,1fr)_78px]')&&med.includes('showChevron={false}'),'fixed 78px action slot');
const medLucideImports=med.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
assert(medLucideImports&&/\bChevronRight\b/.test(medLucideImports[1]),'ChevronRight used in 78px action column must be imported');
assert(med.includes('secondaryActionSheetR4')&&med.includes('aria-label="Ações do medicamento"')&&actions.includes('window.setTimeout(onClose,0)'),'secondary actions run before closing sheet');
assert(med.includes('actionLayoutM150P3.primary')&&med.includes('MedicationRestockAction')&&med.includes('setQuickDoseMedId'),'original clinical action handlers unchanged');
assert(med.includes('compactCareActionLabelR4')&&med.includes('Abrir retirada')&&med.includes('Registrar aquisição')&&med.includes('aria-label={`${careAction.description} para ${med.nome}`}'),'short visible CTA never discards full clinical meaning');
assert(read('components/hoje/TodayRemindersPanel.tsx').includes('<a href="/saude/lembretes"')&&read('components/hoje/TodayRemindersPanel.tsx').includes('lembrete(s) programado(s)'),'reminder link preserves independent row buttons and full count');
assert(page.indexOf('<TodayActionCenter')<page.indexOf('<TodayAgendaOverview'),'Brain stays in priorities before daily agenda');
const gate=read('scripts/test-v63-release-gate.mjs');
assert.equal(gate.split('"scripts/test-vault-m153-p7-r4-ux.cjs"').length-1,1,'registered once in V63');
console.log('VAULT M153 P7 R4: semântica, navegação e 12 ASTs OK');
