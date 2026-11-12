#!/usr/bin/env node
"use strict";
const fs=require("node:fs"), assert=require("node:assert/strict"), ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");
let passed=0;const ok=(v,label)=>{assert.ok(v,`M132: ${label}`);console.log(`✓ ${++passed}: ${label}`)};
const paths=["app/saude/medicamentos/page.tsx","components/home/HomeClinicalAreaTile.tsx","components/saude/MedicationFilterBar.tsx","components/saude/ClinicalCollectionGroup.tsx","components/saude/MedicationOperationalStrip.tsx"];
for(const path of paths){const src=read(path), parsed=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);ok(!parsed.parseDiagnostics.length,`Sintaxe TSX: ${path}`)}
const page=read(paths[0]),tile=read(paths[1]),filter=read(paths[2]),group=read(paths[3]),strip=read(paths[4]);
ok(page.includes('compactTight={compactCards}')&&page.includes('compact={compactCards}>')&&page.includes('"@vault:meds_density_v1"'),"modo compacto/conforto visual compartilhado por card e grupos");
ok(page.includes('localStorage.setItem("@vault:meds_density_v1"')&&page.includes('catch { /* somente apresentacao'),"falha de armazenamento nao afeta dados clinicos");
ok(page.includes('aria-pressed={compactCards}')&&page.includes('aria-pressed={!compactCards}')&&page.includes('chooseCardDensity(true)')&&page.includes('chooseCardDensity(false)'),"selecao acessivel e reversivel");
ok(page.includes('medsPrioridade.map(renderCard)')&&page.includes('medsEmDia.map(renderCard)')&&page.includes('medsSOS.map(renderCard)'),"grupos e suas autoridades mantidos");
ok(page.includes('setQuickDoseMedId(med.id!)')&&page.includes('router.push(careAction.href)')&&page.includes('MedicationRestockAction name={med.nome}'),"dose, reposicao e decisao original intactas");
ok(page.includes('VAULT_V318_OPERATIONAL_STRIP')&&page.includes('regulatoryProfile?.label')&&page.includes('doseOutcome={dosesIgnoradasHoje>0&&!isSOS'),"receita regulatoria, dose ignorada e estoque mantidos");
ok(tile.includes('const surface = areaTone.split')&&tile.includes('${surface || "border-surface-border/60 bg-surface"}')&&tile.includes('onNavigate(path)'),"superficie respeita paleta canonica e navegacao/haptics");
ok(filter.includes('grid grid-cols-2 min-[390px]:grid-cols-3')&&filter.includes('min-h-11')&&filter.includes('break-words'),"filtros adaptativos, tocaveis e com texto legivel");
ok(filter.includes('setExpanded(false)')&&filter.includes('Escape')&&filter.includes('pointerdown')&&filter.includes('aria-pressed={value === key}'),"filtros fecham por selecao, Escape e toque externo");
ok(group.includes('compact?: boolean')&&group.includes('compact=false')&&group.includes('pageSize=3')&&group.includes('revealHash'),"compactacao opcional sem perder deep-link e paginacao");
ok(strip.includes('aria-label={`Hoje: ${today.label}. Estoque: ${stockLabel}. ${stockDetail}`}')&&strip.includes('stockTone === "low"')&&strip.includes('stockTone === "empty"'),"texto clinico completo acessivel, detalhe de alerta visivel");
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m132-mobile-medication-density.cjs"'),"novo contrato integrado ao gate integral");
console.log(`VAULT M132: ${passed} verificacoes de UX e preservacao de autoridade.`);
