#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const read = p => fs.readFileSync(p,'utf8');
const paths = [
  'app/saude/medicamentos/page.tsx',
  'components/saude/MedicationProvenanceLineM150P3.tsx',
  'lib/medications/medication-list-provenance-m150-p3.ts',
  'lib/health-intelligence/medication-withdrawal-brain-authority-m150-p4.ts',
];
for(const p of paths) {
  const parsed=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length,0,'Syntax: '+p);
}
function pure(path) {
  const js=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const m=new Module(path,module);m._compile(js,path);return m.exports;
}
const guard=pure(paths[3]).medicationBrainActionWithVerifiedWithdrawalM150P4;
const detail={href:'/saude/retiradas/detalhes?id=R1&return_to=%2Fsaude%2Fmedicamentos',label:'Retirada',description:'Atenção'};
assert.equal(guard(detail,'R1'),detail,'Retirada em aberto e escopada permanece acessível');
assert.equal(guard(detail,null),null,'Sugestão Brain sem retirada agendada é rejeitada');
assert.equal(guard(detail,'R2'),null,'Brain nunca abre retirada antiga ou de outra pessoa');
assert.equal(guard({...detail,href:'/saude/retiradas/detalhes'},'R1'),null,'Sem id não há autoridade');
const plan={...detail,href:'/saude/retiradas/nova?medicamento_id=M1'};
assert.equal(guard(plan,null),plan,'Planejamento permanece distinguível do compromisso real');
const other={...detail,href:'/saude/renovacao/nova-receita?medicamento_id=M1'};
assert.equal(guard(other,null),other,'Brain preserva outras sugestões clínicas');
const name=pure(paths[2]).medicationListDisplayNameM150P3;
assert.equal(name('PRISTIO 100mg'),'PRISTIO 100mg','Sem identidade verificada, o cadastro não é presumido errado');
assert.equal(name('PRISTIO 100mg','cloridrato de desvenlafaxina'),'PRISTIO 100mg','Princípio ativo sozinho não comprova marca');
assert.equal(name('PRISTIO 100mg','Pristiq 100 mg'),'Pristiq 100mg','Nome da marca referencial confirmado permite apresentação corrigida');
assert.equal(name('PRYSTIQ 100mg'),'Pristiq 100mg','Correção anterior preservada');
assert.equal(name('Venvanse 30mg'),'Venvanse 30mg','Outros nomes não são alterados');
const component=read(paths[1]),list=read(paths[0]),v63=read('scripts/test-v63-release-gate.mjs');
assert(component.includes('MedicationProvenanceBadge')&&component.includes('source={latest ? "ultima_aquisicao" : "etiqueta"}')&&component.includes('aria-label={summary.evidence}'),'Uma insígnia Factory/Tag com evidência acessível');
assert(!component.includes('<MedicationProvenanceBadge name={latest}')&&!component.includes('<MedicationProvenanceBadge name={declared}'),'Sem duas etiquetas concorrentes');
assert(list.includes('medicationBrainActionWithVerifiedWithdrawalM150P4(')&&list.includes('scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "")'),'Brain valida autoridade por pessoa e evento real');
assert(list.includes('Planejar retirada')&&list.includes('Abrir retirada'),'Planejamento e retirada existente não recebem o mesmo CTA');
assert(list.includes('resolveMedicationCardAction(careDecision, brainSuggestion, null)'),'Prioridade histórica do Brain protegida pelo filtro de autoridade');
assert(list.includes('latestManufacturer={latestManufacturer}')&&list.includes('declaredManufacturer={med.laboratorio_etiqueta}'),'Origens independentes preservadas');
assert.equal((v63.match(/"scripts\/test-vault-m150-p4-r2.cjs"/g)||[]).length,1,'Contrato integrado exatamente uma vez ao V63');
assert.equal((v63.match(/"scripts\/test-ux-p6-clinical-experience.cjs"/g)||[]).length,1,'P6 histórico integrado ao V63 uma vez');
assert(list.includes('careAction === brainAction && brainCareItem?.lane === "now"'),'Cor de urgência acompanha a ação resolvida');
console.log('M150 P4 R2: REGRAS DE RETIRADA, IDENTIDADE E GATE APROVADAS');
