#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const ts=require("typescript");
const read=path=>fs.readFileSync(path,"utf8");
const files=[
  "app/saude/medicamentos/page.tsx",
  "app/saude/careflow/episodios/page.tsx",
  "app/saude/careflow/relatorios/page.tsx",
  "components/saude/MedicationWorkspaceNavigation.tsx",
  "components/saude/MedicationAcquisitionHistoryCard.tsx",
  "components/saude/MedicationDetailCareHubM148.tsx",
  "components/saude/TreatmentContinuityA4.tsx",
  "components/saude/MedicationBehaviorEvidence.tsx",
  "components/saude/HealthSupplyEntry.tsx",
  "components/saude/MedicationContinuityAvatarSummary.tsx",
];
for(const file of files){
  const source=read(file);
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length,0,`${file}: sintaxe TypeScript/TSX`);
}
const medicines=read(files[0]);
const episode=read(files[1]);
const reports=read(files[2]);
const navigation=read(files[3]);
const acquisition=read(files[4]);
const detailHub=read(files[5]);
const treatment=read(files[6]);
const behavior=read(files[7]);
const supply=read(files[8]);
const continuity=read(files[9]);
const v34y=read("scripts/test-vault-v34y-integrity.cjs");
const checks=[
  ["estoque desconhecido é explícito",medicines.includes('stockUnknown ? "Estoque não registrado"')&&!medicines.includes('stockUnknown ? "Não informado"')],
  ["receita e suspensão usam cores de domínio",navigation.includes('text-sky-300')&&navigation.includes('text-amber-300')&&!navigation.includes('text-violet-300')],
  ["aquisição apresenta receita em azul",acquisition.includes('bg-sky-500/15 text-sky-300')&&!acquisition.includes('bg-violet-500/15')],
  ["mapa do detalhe não usa violeta",!detailHub.includes('violet')&&detailHub.includes('text-amber-300')],
  ["continuidade A4 usa esmeralda",!treatment.includes('violet')&&treatment.includes('text-emerald-300')],
  ["evidência comportamental neutra usa azul",!behavior.includes('violet')&&behavior.includes('text-sky-300')],
  ["entrada de fornecimento não usa violeta",!supply.includes('violet')&&supply.includes('text-sky-200')],
  ["PDF do episódio tem CTA esmeralda",/exportPdf\('download'\)[\s\S]{0,180}bg-emerald-300/.test(episode)&&!/exportPdf\('download'\)[\s\S]{0,180}bg-violet-300/.test(episode)],
  ["biblioteca usa CTA esmeralda e arquivo âmbar",reports.includes('bg-emerald-300 text-sm font-bold')&&reports.includes('text-amber-300')&&!reports.includes('bg-violet-300 text-sm font-bold')],
  ["resumo de continuidade sem plural mecânico",!continuity.includes('ativo(s)')&&!continuity.includes('retirada(s) aberta(s)')&&!continuity.includes('dose(s) aberta(s)')],
  ["gate V34Y falha de verdade",v34y.includes('V34Y_CONTRATOS_BLOQUEADOS')&&v34y.includes('process.exitCode=1')],
];
const blocked=[];
for(const [name,condition] of checks){
  console.log(`${condition ? '✓' : '✗'} V34Z ${name}`);
  if(!condition) blocked.push(name);
}
if(blocked.length){
  console.error(`V34Z_CONTRATOS_BLOQUEADOS | ${blocked.length}/${checks.length} | ${blocked.join('; ')}`);
  process.exitCode=1;
}else{
  console.log(`VAULT_V34Z_FECHAMENTO_OK | ${checks.length}/${checks.length}`);
}
