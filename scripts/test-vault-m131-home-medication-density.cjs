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
ok(!home.includes('label: "Minha saúde"')&&home.includes('<HomeClinicalAreaTile key={path}'),"Minha saúde não está duplicada em outras áreas");
ok(home.includes('id="home-outras-areas" title=')&&!home.includes('id="home-outras-areas" defaultOpen'),"outras áreas recolhidas inicialmente");
ok(home.includes('withdrawalPath="/saude/retiradas"')&&home.includes('supplyPath="/saude/fornecimento"')&&home.includes('<details className="group'),"retiradas e fornecimento continuam alcançáveis no modo Essencial");
ok(home.includes('go("/saude/plano-seguranca")')&&home.includes('id="home-organizacao"'),"segurança e organização disponíveis");
ok(home.includes('tone="border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"')&&read('components/home/HomeClinicalAreaTile.tsx').includes('onNavigate(path)'),"componente de Minha saúde reutiliza identidade sem duplicar CSS");
ok(hero.includes('const quietRoutine = scheduled <= 0 || safeCompleted >= scheduled')&&hero.includes('min-h-[86px]')&&hero.includes('min-h-[104px]'),"hero compacto somente quando rotina resolvida ou sem programação");
ok(hero.includes('homeRoutineSummaryNote(scheduled, safeCompleted)')&&hero.includes('role="progressbar"')&&hero.includes('onClick={onOpen}'),"progresso e CTA de Hoje preservados");
ok(!med.includes('<p className="min-w-0 truncate text-[10px] leading-snug text-ink-faint" title="Referência farmacêutica')&&med.includes('<span className="sr-only">Princípio ativo · confirmar referência nos detalhes</span>'),"dado farmacêutico não confirmado deixa de ocupar uma linha");
const strip=med.indexOf('<MedicationOperationalStrip today={todayStatus}'),action=med.indexOf('aria-label="Ações do medicamento"');
ok(strip>0&&strip<action&&(med.match(/<MedicationOperationalStrip today=\{todayStatus\}/g)||[]).length===1,"estado de dose/estoque vem antes de ações, sem duplicação");
ok(med.includes('setQuickDoseMedId(med.id!)')&&med.includes('router.push(careAction.href)')&&med.includes('<MedicationRestockAction name={med.nome}'),"dose, ação contextual e reposição preservadas");
ok(med.includes('regulatoryProfile?.label')&&med.includes('setSelectedRegulatory(regulatoryProfile)')&&med.includes('doseOutcome={dosesIgnoradasHoje>0&&!isSOS'),"autoridade regulatória, ignoradas e SOS preservados");
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m131-home-medication-density.cjs"'),"novo contrato integrado ao release gate");
console.log(`VAULT M131: ${n} verificações visuais/semânticas aprovadas. Sem migração de dados.`);
