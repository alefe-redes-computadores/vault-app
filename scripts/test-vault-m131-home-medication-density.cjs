#!/usr/bin/env node
"use strict";
const fs=require("node:fs"), assert=require("node:assert/strict"), ts=require("typescript");
let n=0;const read=p=>fs.readFileSync(p,"utf8");
const ok=(v,msg)=>{assert.ok(v,`M131: ${msg}`);console.log(`✓ ${++n}: ${msg}`)};
for (const p of ["components/home/HomeCommandCenter.tsx","components/home/HomeDailyHero.tsx","app/saude/medicamentos/page.tsx"]) {
  const code=read(p),tree=ts.createSourceFile(p,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  ok(tree.parseDiagnostics.length===0,`${p} sem erros de sintaxe`);
}
const home=read("components/home/HomeCommandCenter.tsx"),hero=read("components/home/HomeDailyHero.tsx"),med=read("app/saude/medicamentos/page.tsx");
ok(home.includes('grid min-w-0 grid-cols-2 gap-2')&&home.includes('label="Minha saúde"')&&home.includes('go("/saude/medicamentos")'),"duas ações principais continuam navegáveis");
ok(!home.includes('label: "Minha saúde"')&&/<HomeClinicalAreaTile\s+key=\{path\}/.test(home),"Minha saúde não está duplicada em outras áreas");
const otherDisclosure=home.match(/<ClinicalDisclosure\b[^>]*id="home-outras-areas"[^>]*>/s)?.[0]||"";
ok(/<ClinicalDisclosure\s+id="home-outras-areas"\s+title=/.test(home)&&!/\bdefaultOpen\b/.test(otherDisclosure),"outras áreas recolhidas inicialmente");
ok(home.includes('withdrawalPath="/saude/retiradas"')&&home.includes('supplyPath="/saude/fornecimento"')&&home.includes('<details className="group'),"retiradas e fornecimento continuam alcançáveis no modo Essencial");
ok(home.includes('go("/saude/plano-seguranca")')&&home.includes('id="home-organizacao"'),"segurança e organização disponíveis");
ok(home.includes('tone="border-coral/20 bg-coral/[0.06] text-coral"')&&read('components/home/HomeClinicalAreaTile.tsx').includes('onNavigate(path)'),"componente de Minha saúde reutiliza identidade sem duplicar CSS");
ok(hero.includes('data-vault-ui360-r4-routine')&&hero.includes('min-h-[75px]')&&!hero.includes('Sua rotina está em andamento')&&hero.includes('safeCompleted'),"hero visualmente compacto em todos os estados com contagem segura");
ok(hero.includes('homeRoutineSummaryNote(scheduled, safeCompleted)')&&hero.includes('role="progressbar"')&&hero.includes('onClick={onOpen}'),"progresso e CTA de Hoje preservados");
ok(!med.includes('<p className="min-w-0 truncate text-[10px] leading-snug text-ink-faint" title="Referência farmacêutica')&&med.includes('<span className="sr-only">Princípio ativo · confirmar referência nos detalhes</span>'),"dado farmacêutico não confirmado deixa de ocupar uma linha");
const strip=med.indexOf('<MedicationOperationalStrip today={todayStatus}'),action=med.indexOf('aria-label="Ações do medicamento"');
ok(strip>0&&strip<action&&(med.match(/<MedicationOperationalStrip today=\{todayStatus\}/g)||[]).length===1,"estado de dose/estoque vem antes de ações, sem duplicação");
ok(med.includes('setQuickDoseMedId(med.id!)')&&med.includes('router.push(careAction.href)')&&med.includes('<MedicationRestockAction name={med.nome}'),"dose, ação contextual e reposição preservadas");
ok((med.includes('regulatoryProfile?.label') &&
  /setSelectedRegulatoryScope\(\{\s*medicationId:\s*med\.id[^}]*userId:\s*treatmentOwner\?\.id[^}]*personId:\s*activePersonId/.test(med) &&
  med.includes('med.id === selectedRegulatoryScope.medicationId') &&
  med.includes('med.user_id === selectedRegulatoryScope.userId') &&
  med.includes('med.person_id === selectedRegulatoryScope.personId') &&
  med.includes('regulatoryProfiles[selectedRegulatoryMedication.id') &&
  med.includes('role="dialog"') && med.includes('selectedRegulatory && selectedRegulatoryMedication') &&
  med.includes('onClick={closeRegulatoryModal}') &&
  med.includes('regulatoryListLabelMED04(regulatoryProfile, reconciliationP6')) && med.includes('doseOutcome={dosesIgnoradasHoje>0&&!isSOS'),"autoridade regulatória, ignoradas e SOS preservados");
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m131-home-medication-density.cjs"'),"novo contrato integrado ao release gate");
console.log(`VAULT M131: ${n} verificações visuais/semânticas aprovadas. Sem migração de dados.`);
