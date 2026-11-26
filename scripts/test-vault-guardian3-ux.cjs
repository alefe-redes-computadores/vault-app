#!/usr/bin/env node
'use strict';
/** Guardian3: deterministic, offline assertions of targeted UX contracts.
 * This does NOT replace physical 320-430dp, clinical E2E or sync tests.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const read = file => fs.readFileSync(file, 'utf8');
let verified = 0;
function ok(test, label) { assert.ok(test, `Guardian3: ${label}`); verified++; }
const files = [
  'app/saude/careflow/exames/page.tsx',
  'components/home/HomeQuickMetrics.tsx',
  'components/saude/HealthRelationPicker.tsx',
  'components/saude/HealthMeasurementForm.tsx',
  'app/saude/consultas/nova/page.tsx',
  'components/saude/CareFlowRelationsR5.tsx',
  'app/saude/careflow/pressao/page.tsx',
];
for (const p of files) {
  const src = ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  ok(src.parseDiagnostics.length===0, `TSX válido ${p}: ` + src.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
}
const exams = read(files[0]);
const updates = exams.slice(exams.indexOf('  const addUpdate=async('), exams.indexOf('  return <PageTransition>'));
ok(updates.includes('if(examEventLock.current||busy)return;') && updates.includes('examEventLock.current=true'), 'trava sincrona do evento preservada');
ok(updates.includes('await appendMany([') && updates.includes('await append({kind:\'exam_status\''), 'writers canônicos de exame preservados');
ok(updates.includes('showSuccess(asResult ?') && updates.includes("trigger('success');"), 'toast e haptic após persistência');
ok(updates.indexOf('showSuccess(asResult ?') > updates.indexOf('await appendMany([') && updates.indexOf('showSuccess(asResult ?') > updates.indexOf('await append({kind:'), 'sucesso somente após ambos awaits');
ok(updates.indexOf('showSuccess(asResult ?') < updates.indexOf('}catch(e){'), 'erro nunca dispara feedback de sucesso');
ok(updates.includes('showError(reason)') && updates.includes('setDrafts(prev=>'), 'erro e histórico por item preservados');
ok(exams.includes('examSubmitLock.current=true') && exams.includes('idempotency:{orderId:'), 'GA-02/03 preservados');
const home = read(files[1]);
ok(home.includes('metrics.filter(metric => metric.key !== "extra" || metric.value > 0)'), 'SOS zero não ocupa cartão');
ok(home.includes('visible.map(') && home.includes('gridTemplateColumns:`repeat(${visible.length}, minmax(0, 1fr))`'), 'grade acompanha conteúdo');
ok(home.includes('key: "agenda"') && home.includes('key: "pendentes"') && home.includes('key: "medicamentos"'), 'indicadores base não escondidos');
ok(!home.includes('text-violet-300'), 'violeta removido dos indicadores');
const relation = read(files[2]);
ok(relation.includes('selected ? icon(selected) : <Icon') && relation.includes('size={compact ? 14 : 16}'), 'ícone e chevron também compactos');
ok(relation.includes('SelectionModal<Choice>') && relation.includes('onValueChange(item.id)'), 'modal e vínculo ID preservados');
ok(relation.includes('min-h-[44px]') && relation.includes('min-w-0 flex-1 break-words'), 'alvo 44px e texto responsivo');
const measurement = read(files[3]);
ok(measurement.includes('const { showSuccess } = useToast();'), 'toast próprio sem depender do pai');
ok(measurement.indexOf('showSuccess(`${METRICS[type].label}') > measurement.indexOf('await saveHealthMeasurement('), 'toast após escrita confirmada');
ok(measurement.includes('      onClose();') && measurement.includes('trigger("success")'), 'fechamento e haptic mantidos');
ok(measurement.includes('min-h-11 min-w-11') && measurement.includes('aria-label="Fechar registro"'), 'botão fechar 44px');
ok(!measurement.includes('text-violet-300'), 'violeta extra removido do formulário de sono');
const parent = read('app/saude/minha-saude/page.tsx');
ok(parent.includes('<HealthMeasurementForm') && parent.includes('onClose={() => setPanel(null)}'), 'pai apenas fecha formulário; não duplica toast');
const consultation = read(files[4]);
ok(!consultation.includes('violet-400') && !consultation.includes('violet-300'), 'consultas sem violeta fora do Brain');
ok(consultation.includes('TreatmentIdentityIconR03 entity={tratamento}') && consultation.includes('treatmentColorR03(tratamento.cor)') && consultation.includes('text-rose-300') && consultation.includes('border-emerald-400/30'), 'cores semânticas tratamento/hospital');
const links = read(files[5]);
ok(links.includes('const civilDateR5=') && links.includes('const match=/^(\\d{4})-(\\d{2})-(\\d{2})(?:T.*)?$/.exec(value);'), 'formatação civil sem UTC');
ok(links.includes('{civilDateR5(e.payload.date)}') && links.includes('doctorOwnerId!==userId'), 'data BR preservando isolamento do médico');
function day(value) { const match=/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value); return match?`${match[3]}/${match[2]}/${match[1]}`:value; }
ok(day('2026-11-22')==='22/11/2026' && day('2026-11-22T00:00:00Z')==='22/11/2026', 'civil day não desloca fuso UTC');
const pressure = read(files[6]);
ok(pressure.includes('pressurePdfDateBR(String(r.data || ""))') && pressure.includes('const pressurePdfDateBR'), 'PDF próprio da pressão apresenta data brasileira');
ok(pressure.includes('const pdf = new jsPDF(') && pressure.includes('await pdfLibraryM2.add('), 'gerador e biblioteca originais mantidos');
ok(pressure.includes('measurements.length === 1 ? "medição" : "medições"'), 'plural PDF próprio');
const gate = read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('scripts/test-vault-ga02-ga07-guardian.cjs') && gate.includes('scripts/test-vault-a7-m5-clinical-continuity-360.cjs'), 'contratos anteriores preservados sem editar V63');
console.log(`GUARDIAN3_UX_CONTRATOS_OK | ${verified} verificações offline; testes Android e E2E pendentes`);
