#!/usr/bin/env node
"use strict";
/** M102 P1 hermetic contract: no database, no Android, no clinical values from the user. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
let count = 0;
const check = (value, label) => {assert.ok(value, `M102 P1: ${label}`);count++;};
const read = name => fs.readFileSync(name,"utf8");
function compile(name) {
  const source = read(name);
  const tree=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  check(!tree.parseDiagnostics.length,`sintaxe ${name}`);
  const result=ts.transpileModule(source,{fileName:name,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  check(!(result.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),`transpilação ${name}`);
  return result.outputText;
}
function pure(name) {
  const mod=new Module(path.resolve(name),module);mod.filename=path.resolve(name);
  mod._compile(compile(name),mod.filename);return mod.exports;
}
const presence=pure("lib/health-profile/avatar-presence-m102.ts").projectAvatarPresenceM102;
const follow=pure("lib/health-intelligence/followup-m102.ts");
const date=day=>({data:day,contexto:"[humor:v1]bem"});
const context={today:"2026-11-09",expression:"happy",moods:[date("2026-11-09"),date("2026-11-08"),date("2026-11-07")],moodEvidence:{days:3,reason:"positive",positive:3,negative:0}};
let r=presence(context);
check(r.recency==="today"&&r.lastMoodAgeDays===0&&r.coverageDays===3,"relato de hoje com três dias reais");
check(r.expression==="happy"&&r.detail.includes("Não mede emoção em tempo real"),"não inventa emoção nem altera expressão canônica");
r=presence({...context,moods:[date("2026-11-08")],expression:"neutral"});
check(r.recency==="yesterday"&&r.coverageDays===1&&r.expression==="neutral","ontem é evidência; dia ausente não conta");
r=presence({...context,moods:[date("2026-11-03")],expression:"neutral"});
check(r.recency==="older"&&r.lastMoodAgeDays===6,"idade por dia civil, sem confundir fuso");
r=presence({...context,moods:[date("2026-11-02")],expression:"neutral"});
check(r.recency==="unreported"&&r.coverageDays===0,"relato anterior à janela não vira dado atual");
r=presence({...context,moods:[date("2026-11-31"),date("2026-11-10")],expression:"neutral"});
check(r.recency==="unreported"&&r.coverageDays===0,"datas inválidas e futuras ignoradas");
r=presence({...context,moods:[date("2026-11-09"),date("2026-11-09"),date("2026-11-08")],expression:"neutral"});
check(r.coverageDays===2,"duplicação de um dia não amplia amostra");
r=presence({...context,today:"2032-02-30",expression:"neutral"});
check(r.recency==="unreported"&&r.coverageDays===0,"dia civil impossível é inválido");
const uid="owner123", pid="person456", alert={key:"brain-alert-1",episode:2,person_id:pid,state:"active"};
const now=Date.parse("2026-11-09T12:00:00Z");
check(follow.followUpKeyM102(uid,pid)!==follow.followUpKeyM102("owner123","other"),"preferência isolada por pessoa");
check(follow.followUpKeyM102(uid,pid)!==follow.followUpKeyM102("other",pid),"preferência isolada por usuário");
check(follow.followUpKeyM102("",pid)===null&&follow.followUpKeyM102(uid,"")===null,"sem contexto de titular não há escrita");
check(follow.followUpFingerprintM102(alert)!==follow.followUpFingerprintM102({...alert,episode:3}),"episódio diferente tem chave diferente");
check(follow.createFollowUpM102(uid,pid,{...alert,person_id:"other"},24,now)===null,"episódio de outra pessoa rejeitado");
check(follow.createFollowUpM102(uid,pid,{...alert,state:"resolved"},24,now)===null,"alerta resolvido não gera preferência");
check(follow.createFollowUpM102(uid,pid,alert,12,now)===null,"prazo fora de 24 ou 48 horas proibido");
check(follow.createFollowUpM102(uid,pid,alert,24,NaN)===null,"relógio inválido rejeitado");
const p24=follow.createFollowUpM102(uid,pid,alert,24,now);
check(p24 && Date.parse(p24.dueAt)-now===24*3600000&&p24.version===1,"24h com versão e timestamp determinísticos");
const p48=follow.createFollowUpM102(uid,pid,alert,48,now);
check(p48 && Date.parse(p48.dueAt)-now===48*3600000,"48h explícitas, sem alarme oculto");
check(!JSON.stringify(p24).includes(alert.key)&&!JSON.stringify(p24).includes("titulo")&& !JSON.stringify(p24).includes("medicamento"),"persistência não guarda identificador em claro nem informação clínica");
check(follow.parseFollowUpM102(JSON.stringify(p24),alert,now)?.delayHours===24,"roundtrip do plano legítimo");
check(follow.followUpStateM102(p24,now)==="planned"&&follow.followUpStateM102(p24,now+25*3600000)==="due","pendente vs data atingida");
check(follow.followUpStateM102(null,now)==="off","sem escolha não há lembrete presumido");
check(follow.parseFollowUpM102(JSON.stringify(p24),{...alert,episode:3},now)===null,"episódio trocado não recupera plano antigo");
check(follow.parseFollowUpM102(JSON.stringify(p24),{...alert,state:"resolved"},now)===null,"alerta resolvido não recupera plano");
check(follow.parseFollowUpM102("{corrompido",alert,now)===null,"localStorage corrompido não quebra a tela");
check(follow.parseFollowUpM102(JSON.stringify({...p24,delayHours:48}),alert,now)===null,"prazo alterado sem mudar data rejeitado");
check(follow.parseFollowUpM102(JSON.stringify(p24),alert,now+15*86400000)===null,"preferência com mais de 14 dias expira");
check(follow.parseFollowUpM102(JSON.stringify({...p24,createdAt:"2032-01-01T00:00:00.000Z"}),alert,now)===null,"datas futuras adulteradas rejeitadas");
for(const name of [
 "components/saude/AvatarEvidenceStripM102.tsx", "components/saude/BrainFollowUpM102.tsx",
 "components/saude/AvatarMoodEvidence.tsx", "components/saude/AvatarCareWorkspace.tsx",
 "app/saude/minha-saude/page.tsx"
])compile(name);
const avatar=read("app/saude/minha-saude/page.tsx");
check(avatar.includes("<AvatarEvidenceStripM102 context={bodyContext} onOpenMood={()=>selectBody('mood')} />"),"faixa de evidência no Avatar existente");
check(avatar.includes('userId={person?.user_id||""} topAlert={brainPulse.top}'),"acompanhamento recebe proprietário e alerta real");
const strip=read("components/saude/AvatarEvidenceStripM102.tsx");
check(strip.includes("projectAvatarPresenceM102")&&strip.includes("onOpenMood")&&strip.includes("min-h-11"),"visual compacto e botão acessível");
const mood=read("components/saude/AvatarMoodEvidence.tsx");
check(mood.includes("projectAvatarPresenceM102")&&mood.includes("não indica seu humor neste instante"),"proveniência também disponível em detalhes");
const workspace=read("components/saude/AvatarCareWorkspace.tsx");
check(workspace.includes("<BrainFollowUpM102 alert={topAlert} userId={userId} personId={context.personId}"),"Brain no workspace contextual existente");
const ui=read("components/saude/BrainFollowUpM102.tsx");
check(ui.includes("localStorage.setItem")&&ui.includes("localStorage.removeItem")&&ui.includes("Revisar em 24h")&&ui.includes("Revisar em 48h"),"opt-in e revogação explícitos");
check(ui.includes("/saude/registros/novo?preset=humor")&&ui.includes("/inteligencia/alertas?insight="),"resposta clínica encaminhada a fluxos canônicos");
check(!ui.includes("Notification.requestPermission")&&!ui.includes("setInterval")&&!ui.includes("enfileirarOperacao")&& !ui.includes("setTimeout"),"sem notificações nem nova mutação clínica");
check(!/<select\b/i.test(ui)&&!/<select\b/i.test(strip),"V112: sem select nativo visível");
const gate=read("scripts/test-v63-release-gate.mjs");
check(gate.includes('"scripts/test-vault-m102-p1-avatar-brain.cjs"')&&gate.includes('"scripts/test-vault-m101-p4-quality.cjs"'),"gate inclui M102 preservando M101");
console.log(`VAULT M102 P1: ${count} verificações herméticas aprovadas; não equivale a homologação no aparelho.`);
