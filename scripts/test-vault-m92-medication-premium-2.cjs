#!/usr/bin/env node
"use strict";
/** M92: contracts on presentation and form affordance; no clinical writes/network. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
let checks = 0;
const read = p => fs.readFileSync(p,"utf8");
const ok = (name, condition) => {assert.ok(condition, `M92: ${name}`); checks++; console.log(`✓ ${checks}: ${name}`);};
const src = Object.fromEntries([
  'app/saude/medicamentos/page.tsx',
  'components/saude/MedicationFilterBar.tsx',
  'components/saude/MedicationOperationalStrip.tsx',
  'app/saude/medicamentos/editar/page.tsx',
  'lib/medications/form-presentation.tsx',
  'lib/medications/catalog-presentation.ts',
  'components/saude/MedicationFormatIcon.tsx',
].map(path=>[path,read(path)]));
for (const [path, code] of Object.entries(src)) {
  const ast = ts.createSourceFile(path,code,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(`Sintaxe ${path}`,ast.parseDiagnostics.length===0);
}
const med=src['app/saude/medicamentos/page.tsx'];
const filter=src['components/saude/MedicationFilterBar.tsx'];
const strip=src['components/saude/MedicationOperationalStrip.tsx'];
const editor=src['app/saude/medicamentos/editar/page.tsx'];
const fmt=src['lib/medications/form-presentation.tsx'];
const catalog=src['lib/medications/catalog-presentation.ts'];
const icon=src['components/saude/MedicationFormatIcon.tsx'];
ok('Rotina mostra progresso com as contagens canônicas', med.includes('statsProgresso.completados}/{statsProgresso.total}') && med.includes('aria-label="Progresso das doses programadas de hoje"'));
ok('SOS permanece fora do denominador',med.includes('if (item.isSOS || item.isSuspenso) continue;'));
ok('Sem divisão por zero no progresso', med.includes('statsProgresso.total > 0 ? Math.min(100'));
ok('Indicadores avançados deixam de ocupar a primeira dobra',med.includes('Indicadores e organização') && /<details className="group mb-2\.5[^>]+>[\s\S]*<ClinicalDisclosure key=/.test(med));
ok('Preserva panorama canônico sob demanda',med.includes('MedicationPortfolioOverview portfolio=') && med.includes('ClinicalDisclosure key='));
ok('Dois filtros rápidos e demais em disclosure', !/const PRIMARY:[\s\S]*?\["sos", "SOS"\][\s\S]*?const ADDITIONAL/.test(filter) && /const ADDITIONAL:[\s\S]*?\["sos", "SOS"\]/.test(filter));
ok('Busca e categorias de filtros permanecem',med.includes('<MedicationFilterBar value={medicationFilter} onChange={selectMedicationFilter}/>') && filter.includes('setExpanded(false)'));
ok('SOS recolhido no panorama e progressivo',med.includes('tone="sos" forceOpen=') && !med.includes('tone="sos" defaultOpen=') && med.includes('medsSOS.slice(0, limit).map(renderCard)'));
ok('Grupos por prioridade e dose rápida preservados',med.includes('medsPrioridade.map(renderCard)') && med.includes('setQuickDoseMedId(med.id!)'));
ok('Classificação regulatória interativa preservada',med.includes('regulatoryProfile?.label') && med.includes('setSelectedRegulatory(regulatoryProfile)'));
ok('Botão único preenche sua linha sem criar ações fictícias',med.includes('[&>button:only-child]:col-span-2') && med.includes('aria-label="Ações do medicamento"'));
ok('Retirada, dose SOS e reposição ainda independentes',med.includes('router.push(careAction.href)') && med.includes('MedicationRestockAction name={med.nome}') && med.includes('quickDoseLabel'));
ok('Estados preservados em linha operacional compacta',strip.includes('doseOutcome==="ignored"') && strip.includes('stockTone==="empty"') && strip.includes('flex min-w-0 flex-wrap') && strip.includes('Package size={12}'));
ok('Aviso de estoque é inspecionável sem romper altura',med.includes('Unidade do estoque diferente · revisar') && med.includes('min-h-9 cursor-pointer') && med.includes('className="min-w-0 flex-1 truncate"'));
ok('Cabeçalho do editor aceita as duas cores do oblongo',editor.includes('formato === "oblongo"') && editor.includes('formato === "oblongo_sulcado"'));
ok('Salvar visível em qualquer aba de edição',/\{editIntent !==\s*"menu" && \(/.test(editor) && !/"menu" &&\s*hasChanges && \(/.test(editor));
ok('Salvar não dispara sem alterações e impede concorrência',/isSaving \|\| !hasChanges/.test(editor) && editor.includes('isSubmitLocked.current'));
ok('Footer respeita safe area e permanece acima do formulário',editor.includes('fixed bottom-0 left-0 right-0 z-40') && editor.includes('env(safe-area-inset-bottom)'));
ok('Salvamento preserva autoridade e pessoa',editor.includes('handleSubmit') && editor.includes('activePersonId !==') && editor.includes('markChanged()'));
ok('Comprimido redondo e partido preservados',fmt.includes('id: "comprimido"') && fmt.includes('id: "partido"'));
ok('Oblongo inteiro e sulcado como formas adicionais',fmt.includes('id: "oblongo", label: "Oblongo inteiro"') && fmt.includes('id: "oblongo_sulcado", label: "Oblongo com sulco"'));
ok('Novo desenho não altera dose ou tratamento',fmt.includes('O sulco NÃO constitui orientação para dividir') && !fmt.includes('applyStockDelta'));
ok('Ícones oblongos são distintos no picker e nos cards',fmt.includes('export function OblongPillIcon') && fmt.includes('export function ScoredOblongPillIcon') && med.includes('return ScoredOblongPillIcon'));
ok('Ícones de outras telas aceitam novas apresentações',icon.includes('normalizedFormat === "oblongo"') && icon.includes('normalizedFormat === "oblongo_sulcado"'));
ok('Estoque mantém unidade comprimido sem conversão',catalog.includes('oblongo:["comprimido","comp"]') && catalog.includes('oblongo_sulcado:["comprimido","comp"]') && catalog.includes('return "comprimido(s)"'));
ok('Catálogo mantém compatibilidade do formato oficial',catalog.includes('inferVaultFormatFromOfficialPresentation') && catalog.includes('formatMatchesCatalog'));
ok('Legados de densidade alinhados, sem remover suas garantias',read('scripts/test-vault-m71-final-visual-contract.cjs').includes('flex min-w-0 flex-wrap') && read('scripts/test-vault-m25-premium-longlist-hotpath.cjs').includes('flex min-w-0 flex-wrap'));
ok('Gate canônico começa pela M92',read('scripts/test-v63-release-gate.mjs').includes('const contracts = [\n  "scripts/test-vault-m92-medication-premium-2.cjs",'));
console.log(`M92: ${checks} contratos específicos aprovados, sem operação clínica.`);
