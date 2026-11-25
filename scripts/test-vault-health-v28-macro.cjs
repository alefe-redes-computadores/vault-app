const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');
const time = read('components/saude/HealthTimePicker.tsx');
const pressure = read('app/saude/careflow/pressao/page.tsx');
const pressureParser = read('lib/health/pressure-input.ts');
const medical = read('lib/m3/medical-dossier-p3.ts');
const medicalUi = read('app/saude/careflow/modo-medico/page.tsx');
const consultations = read('app/saude/consultas/page.tsx');
const consultationDetails = read('app/saude/consultas/detalhes/page.tsx');
const exams = read('app/saude/careflow/exames/page.tsx');
const newRecord = read('app/saude/registros/novo/page.tsx');
const today = read('app/hoje/page.tsx');
const agenda = read('components/hoje/TodayAgendaOverview.tsx');
const home = read('app/page.tsx');
const careLine = read('app/saude/registros/page.tsx');
const reports = read('app/saude/careflow/relatorios/page.tsx');
const consultationComparison = read('components/saude/ConsultationComparisonP6P2.tsx');

assert.match(time, /onBlur=\{commit\}/, 'horário deve confirmar somente ao sair');
assert.doesNotMatch(time, /minuteRef|\.focus\(\)/, 'horário não pode roubar foco');
assert.match(pressureParser, /digits\.length === 5/, 'parser deve aceitar 14682');
assert.match(pressureParser, /abbreviated \? Number\(left\) \* 10/, 'parser deve aceitar 14\/9');
assert.match(pressure, /const \[slots,\s*setSlots\]\s*=\s*useState\(\[""\]\)/, 'plano deve iniciar com um slot vazio');
assert.match(pressure, /<PressureReadingFieldSTB\b/, 'CareFlow consome o campo canônico de pressão');
const pressureFieldSTB=read('components/saude/PressureReadingFieldSTB.tsx');
assert.match(pressureFieldSTB, /Interpretado como/, 'pressão abreviada deve ter feedback');
assert.match(pressureFieldSTB, /\{parsed\.display\} mmHg/, 'prévia explícita em mmHg');
assert.match(pressure, /target_route:\s*["']\/saude\/careflow\/pressao\?novo=1["']/, 'lembrete deve abrir fluxo canônico');
assert.match(newRecord, /router\.push\("\/saude\/careflow\/pressao\?novo=1"\)/, 'atalho genérico deve abrir fluxo canônico');
assert.match(medical, /reading\.tipo!==['"]pressao_arterial['"]/, 'dossiê deve projetar pressão legada');
assert.doesNotMatch(medical, /— \$\{row\.title\}/, 'dose não pode repetir medicamento');
assert.match(medicalUi, /MEDICAL_SECTIONS_P3\.map\(\s*\(?section\)?\s*=>\s*section\.id\s*\)/, 'dossiê começa com áreas reais disponíveis');
assert.doesNotMatch(consultations, /Próximas \(/, 'consultas não deve manter aba vazia');
assert.match(consultationDetails, /new Set\(consulta\?\.medicamento_ids/, 'relações devem contar medicamentos explícitos');
assert.doesNotMatch(exams, />Sugerir texto por OCR/, 'sigla técnica não deve aparecer na ação');
assert.match(today, /remindersForaDaAgenda/, 'Hoje deve retirar planos da lista duplicada de lembretes');
assert.match(agenda, /onOpenReminder/, 'agenda deve abrir a ação canônica do lembrete');
assert.match(home, /doseProjectionReady/, 'Home não pode projetar atraso antes da hidratação das doses');
assert.doesNotMatch(careLine, /\+ Humor|\+ Ansiedade|\+ Fadiga/, 'Linha de cuidado não deve ter atalhos clínicos fixos');
assert.match(careLine, /activeSymptomCount\s*===\s*0\s*&&\s*pressurePlans\.length\s*===\s*0/, 'Linha de cuidado deve adaptar a entrada ao contexto');
assert.match(reports, /visible\.length === 1 \? "arquivo" : "arquivos"/, 'Biblioteca deve pluralizar arquivos');
assert.doesNotMatch(consultationComparison, /SOS\/extra|\{x\.from\} → \{x\.through\}/, 'Atendimento não deve expor jargão ou data ISO crua');
assert.match(pressure, /\bEditar\b/, 'plano salvo deve oferecer edição');
assert.match(pressure, /\bEncerrar\b/, 'plano salvo deve oferecer encerramento');

for (const forbidden of ['lib/db/index.ts', 'hooks/useSyncQueue.ts', 'lib/types.ts']) {
  assert.ok(!process.argv.slice(2).includes(forbidden), `arquivo protegido alterado: ${forbidden}`);
}

console.log('VAULT HEALTH V28 MACRO CONTRACT: OK');
