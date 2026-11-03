#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");let count=0;
function ok(truth,description){assert(truth,`P14 R6: ${description}`);count++;console.log(`✓ ${count}: ${description}`);}
const p="app/saude/medicamentos/page.tsx",d="app/saude/medicamentos/detalhes/page.tsx";
const page=read(p),detail=read(d),strip=read("components/saude/MedicationOperationalStrip.tsx"),history=read("components/saude/MedicationDoseHistoryLink.tsx"),price=read("components/saude/MedicationBestPriceLink.tsx"),groups=read("components/saude/ClinicalCollectionGroup.tsx"),brain=read("lib/health-intelligence/avatar-decision-brief.ts"),avatar=read("components/saude/HealthAvatar3D.tsx"),home=read("components/home/HomeDailyHero.tsx"),today=read("components/hoje/TodayRoutinePulse.tsx"),gate=read("scripts/test-v63-release-gate.mjs");
for(const [path,source] of [[p,page],[d,detail],["MedicationOperationalStrip.tsx",strip],["MedicationDoseHistoryLink.tsx",history],["MedicationBestPriceLink.tsx",price],["ClinicalCollectionGroup.tsx",groups],["Avatar.tsx",avatar],["HomeDailyHero.tsx",home],["TodayRoutinePulse.tsx",today]]) {
 const src=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 ok(src.parseDiagnostics.length===0,`${path}: TSX sintaticamente válido`);
}
ok(page.includes("<MedicationOperationalStrip today={todayStatus}")&&page.includes('stockLabel={stockUnknown ? "Não informado"'),"listagem delega apenas a apresentação do estado operacional");
ok(page.includes('doseOutcome={dosesIgnoradasHoje>0&&!isSOS?"ignored"')&&page.includes('rotinaConcluida||sosTomadoHoje?"completed"'),"resultado da dose continua derivado da mesma autoridade");
ok(strip.includes('Hoje: ${today.label}. Estoque: ${stockLabel}')&&strip.includes('stockTone==="empty"'),"resumo clínico acessível distingue estoque conhecido de vazio");
ok(page.includes('supplyRoute.labels.join(" + ")')&&page.includes('brainAction ??'),"V271 conserva fornecimento e prioridade canônica");
ok(page.includes('scheduledWithdrawals.get(medicationWithdrawalKey(med) ?? "")')&&page.includes('ownedMedicationRenewals('),"R5 mantém isolamento por dono");
ok(detail.includes('<MedicationDoseHistoryLink onOpen=')&&detail.includes('const id = encodeURIComponent(med.id ?? \"\")')&&detail.includes('router.push(`/saude/medicamentos/historico?id=${id}`)')&&detail.includes('QuickDoseModal'),"histórico abre destino seguro sem interferir no modal de dose");
ok(detail.includes('<MedicationBestPriceLink mean={melhorFarmacia.media_preco}')&&detail.includes('window.location.hash = "historico-aquisicoes"'),"média registrada abre seção histórica, não apenas rola para painel fechado");
ok(price.includes('purchases <= 0')&&price.includes('Média')===false&&price.includes('Menor média registrada'),"média não é preço atual inventado e descarta amostras vazias");
ok(detail.includes('id="medicamento-financeiro"')&&detail.includes('id="historico-aquisicoes"')&&detail.includes('id="medicamento-fornecimento"'),"seções e âncoras de fornecimento/financeiro intactas");
ok(groups.includes('window.addEventListener("hashchange", revealHash)')&&groups.includes('if (hash === id) setOpen(true)'),"deep link abre coleção recolhida");
ok(groups.includes('onToggle={event=>{if(!forceOpen)setOpen(event.currentTarget.open);}}'),"controle manual e forceOpen conservados");
ok(home.includes('aria-valuetext={scheduled>0?')&&today.includes('isPassado && recorded===0 ? "—"'),"acessibilidade de 0/0 e passado sem registros não simulam falha de adesão");
ok(avatar.includes('P14 R6: o relevo da orelha')&&avatar.includes('materials.skinShade,sign*.207')&&avatar.includes('expressionEyeScaleY')&&avatar.includes('expressionLidScaleY'),"Avatar refina malha existente e preserva correção contra traves");
ok(!avatar.includes('requestAnimationFrame(function')&&!avatar.includes('requestAnimationFrame(animate)')&&avatar.includes('renderer.forceContextLoss()'),"Avatar preserva budget GPU e cleanup");
ok(gate.includes('scripts/test-p14-r6-clinical-modules-brain-avatar.cjs'),"R6 no gate completo");
const transpiled=ts.transpileModule(brain,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const b={exports:{}};new Function("module","exports",transpiled)(b,b.exports);
const brief=b.exports.buildAvatarDecisionBrief;
const huge=brief({title:'',reason:'Detalhe '.repeat(40),evidenceKind:'projected',overdueWithdrawals:3,missingDocuments:5});
ok(huge.explanation.length<=370&&huge.explanation.includes('Projeção não confirma realização.'),"Fênix preserva ressalva mesmo com texto longo");
ok(huge.explanation.includes('3 retirada')&&huge.explanation.includes('5 documento'),"pendências distintas aparecem antes da justificativa extensa");
ok(brief({title:'',evidenceKind:'association',reason:'A'.repeat(260)}).explanation.includes('Associação temporal não demonstra causa.'),"associação não vira causa mesmo sob truncamento");
ok(brief({evidenceKind:'missing_data'}).title.includes('Conferir dados')&&brief({lane:'prepare'}).posture==='preparar',"autoridade e posturas clínicas anteriores preservadas");
console.log(`VAULT P14 R6: ${count} contratos de módulo/autoridade/Avatar/Brain aprovados`);
