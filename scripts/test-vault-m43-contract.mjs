/** M43: semantic health issues and safe contextual presentation. Offline, read-only. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const source = p => fs.readFileSync(path.join(root, p), 'utf8');
let count = 0;
function ok(label, fn) { fn(); count++; console.log(`M43 OK ${count}: ${label}`); }
const care = source('lib/health-intelligence/care-plan.ts');
const command = source('lib/health-intelligence/care-command.ts');
const signals = source('lib/health-intelligence/home-signal-orchestration.ts');
const home = source('app/page.tsx');
const hero = source('components/home/HomeDailyHero.tsx');
const identity = source('components/health-intelligence/VaultBrainIdentity.tsx');
ok('Plano possui fenômeno clínico operacional explícito', () => assert.match(care, /BrainCarePhenomenon/));
ok('Mesmo medicamento não define sozinho uma identidade de decisão', () => {
  assert.doesNotMatch(care, /const key = item\.medicationId \? `medication:\$\{item\.medicationId\}`/);
  assert.match(care, /item\.phenomenon/);
  assert.match(care, /item\.occurrenceKey/);
});
ok('Retirada e receita independentes do saldo', () => {
  assert.match(care, /phenomenon: "prescription"/);
  assert.match(care, /phenomenon:"documents"/);
  assert.match(care, /"withdrawal"/);
});
ok('Ações de forecast não são descartadas por medicamento', () => {
  assert.doesNotMatch(command, /seenMedication/);
  assert.match(command, /seenEvents/);
});
ok('Overlap na Home só usa vínculos de entidade estruturados', () => {
  assert.doesNotMatch(signals, /insightText\.includes\(medicationName\)/);
  assert.match(signals, /relacoesContextuais/);
  assert.match(signals, /opportunity\.careStage/);
});
ok('Destaque da Home agora abre a ação anunciada', () => {
  assert.match(home, /router\.push\(safeReturnTarget\(resumoContextual\.href, "\/hoje"\)\)/);
  assert.match(hero, /ctaLabel/);
});
ok('A Home preserva a rotina e o atalho de pendências', () => {
  assert.match(home, /setModalPendenciasAberto\(true\)/);
  assert.match(home, /<HomeQuickMetrics/);
});
ok('Brain na Home não abre outro painel por padrão', () => {
  assert.match(home, /title="Ver observações do Brain"/);
  assert.match(home, /defaultOpen=\{false\}/);
  assert.match(home, /Outras prioridades/);
});
ok('Identidade compartilhada usa Lucide, sem criar avatar novo', () => {
  assert.match(identity, /BrainCircuit/);
  assert.match(identity, /VAULT Brain/);
  for (const f of ['components/health-intelligence/BrainNextStep.tsx', 'components/saude/CareCommandStrip.tsx', 'components/vault-intelligence/ContextualHealthIntelligence.tsx', 'components/health-intelligence/BrainCarePlan.tsx']) {
    assert.match(source(f), /VaultBrainIdentity/, f);
  }
});
ok('Nenhum registro clínico é escrito nos arquivos novos', () => {
  assert.doesNotMatch(identity, /(?:doseLogsRepository|safeAddRenovacao|updateMedicamento|db\.\w+\.put)/);
});

let ts;
try { ts = require('typescript'); } catch { /* Optional dependency for the lightweight gate */ }
if (ts) {
  function evaluate(file, mocks = {}) {
    const js = ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    const mockRequire = name => {
      if (!(name in mocks)) throw Error(`No mock: ${name} from ${file}`);
      return mocks[name];
    };
    new Function('module', 'exports', 'require', js)(module, module.exports, mockRequire);
    return module.exports;
  }
  const forecast = { generatedFor: '2026-11-03', windows: [{ days:30, plannedKnownCost:0, expectedRefillCost:0, expectedRefillCostCoverage:100 }], actions: [
    { id:'wd-10', kind:'overdue_withdrawal', lane:'now', medicationId:'med-1', medicationName:'Teste', date:'2026-11-01', title:'Retirada atrasada', reason:'Registro de teste', evidence:['Retirada agendada'], href:'/saude/retiradas/detalhes?id=wd-10' },
    { id:'wd-11', kind:'upcoming_withdrawal', lane:'next', medicationId:'med-1', medicationName:'Teste', date:'2026-11-10', title:'Retirada futura', reason:'Registro de teste', evidence:['Retirada agendada'], href:'/saude/retiradas/detalhes?id=wd-11' },
    { id:'stock-1', kind:'stock_projection', lane:'next', medicationId:'med-1', medicationName:'Teste', date:null, title:'Revisar saldo', reason:'Projeção', evidence:['Estoque informado'], href:'/saude/medicamentos/detalhes?id=med-1' },
    { id:'stock-copy', kind:'stock_projection', lane:'follow_up', medicationId:'med-1', medicationName:'Teste', date:null, title:'Revisar saldo', reason:'Projeção', evidence:['Estoque informado'], href:'/saude/medicamentos/detalhes?id=med-1' },
  ] };
  const readiness = { items: [{ medicationId:'med-1', medicationName:'Teste', state:'overdue', nextDate:'2026-11-01', headline:'Retirada pendente precisa de decisão', route:{labels:['SUS']}, missing:[], evidence:['Agendada'], href:'/saude/medicamentos/detalhes?id=med-1' }] };
  const documents = { items: [{ medicationId:'med-1', medicationName:'Teste', routeLabel:'SUS', requirements:[{status:'missing', label:'Documento SUS', evidence:['Processo ativo']}], href:'/saude/fornecimento?id=proc-1' }] };
  const context = { userId:'user-1', personId:'person-1', consultas:[], registrosSaude:[] };
  const planMod = evaluate('lib/health-intelligence/care-plan.ts', {
    './cautious-associations': { buildCautiousAssociations: () => [] },
    './care-forecast': { buildCareForecast: () => forecast },
    './care-readiness': { buildCareReadiness: () => readiness },
    './care-document-readiness': { buildCareDocumentReadiness: () => documents },
    './prescription-planning': { buildPrescriptionPlanningPortfolio: () => ({items:[{medicationId:'med-1', medicationName:'Teste', due:true, date:'2026-11-03', href:'/saude/renovacao'}]}) },
    './consultation-window': { buildConsultationWindow: () => ({days:null, evidence:[]}) },
  });
  const plan = planMod.buildBrainCarePlan(context, forecast, readiness, documents);
  const medItems = plan.items.filter(item => item.medicationId === 'med-1');
  ok('Runtime: estoque, retirada, receita e documento não se apagam', () => {
    assert.deepEqual(new Set(medItems.map(item => item.phenomenon)), new Set(['stock','withdrawal','prescription','documents']));
  });
  ok('Runtime: duas retiradas independentes mantêm seus destinos', () => {
    assert.equal(medItems.filter(item => item.phenomenon === 'withdrawal').length, 2);
    assert.ok(medItems.some(item => item.href.endsWith('wd-10')));
    assert.ok(medItems.some(item => item.href.endsWith('wd-11')));
  });
  ok('Runtime: duplicação do MESMO fato de estoque vira um item', () => assert.equal(medItems.filter(item => item.phenomenon === 'stock').length,1));
  ok('Runtime: decisão principal preserva prioridade sem gravação', () => assert.equal(plan.decision?.lane,'now'));
  const signalsMod = evaluate('lib/health-intelligence/home-signal-orchestration.ts');
  const opportunity = { medicamentoId:'med-1', medicamentoNome:'Teste', careStage:'stock_review' };
  const insight = (id, category, entityId) => ({ id, categoria:category, titulo:'Teste precisa de receita', mensagem:'Teste', entidadeTipo:'medicamento', entidadeId:entityId });
  ok('Runtime: estoque explícito duplicado é suprimido na Home', () => assert.equal(signalsMod.suppressOperationalOverlap([insight('i1','estoque','med-1')],[opportunity]).length,0));
  ok('Runtime: receita do mesmo medicamento continua visível', () => assert.equal(signalsMod.suppressOperationalOverlap([insight('i2','receita','med-1')],[opportunity]).length,1));
  ok('Runtime: texto com nome sem vínculo não suprime outro medicamento', () => assert.equal(signalsMod.suppressOperationalOverlap([insight('i3','estoque',undefined)],[opportunity]).length,1));
  const scriptKind = file => file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  const tsFiles = ['lib/health-intelligence/care-plan.ts','lib/health-intelligence/care-command.ts','lib/health-intelligence/home-signal-orchestration.ts','components/health-intelligence/VaultBrainIdentity.tsx','components/health-intelligence/BrainNextStep.tsx','components/health-intelligence/BrainCarePlan.tsx','components/saude/CareCommandStrip.tsx','components/vault-intelligence/ContextualHealthIntelligence.tsx','app/page.tsx','components/home/HomeAttentionRail.tsx','components/home/HomeDailyHero.tsx'];
  ok('TS/TSX: 11 fontes modificadas sem erro de sintaxe', () => {
    for (const file of tsFiles) {
      const ast=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true,scriptKind(file));
      assert.equal(ast.parseDiagnostics.length,0,`${file}: ${ast.parseDiagnostics.map(x => x.messageText).join(', ')}`);
    }
  });
} else {
  console.log('M43 AVISO: contrato funcional opcional e sintaxe TSX exigem typescript; execute o gate completo antes de publicar.');
}
console.log(`M43: ${count} verificações aprovadas.`);
