#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript");
const read=p=>fs.readFileSync(p,"utf8");
const check=(ok,msg)=>assert.ok(ok,"M134: "+msg);
const names=[
 "components/saude/FenixMark.tsx",
 "components/saude/HealthAvatar.tsx",
 "app/saude/minha-saude/page.tsx",
 "app/inteligencia/page.tsx",
 "app/inteligencia/saude/page.tsx",
 "app/inteligencia/alertas/page.tsx",
];
for (const path of names){
 const src=read(path),ast=ts.createSourceFile(path,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 check(ast.parseDiagnostics.length===0,"JSX sintaticamente válido: "+path);
}
const mark=read(names[0]),avatar=read(names[1]),health=read(names[2]),general=read(names[3]),analysis=read(names[4]),alerts=read(names[5]);
const home=read("app/page.tsx"),brainId=read("components/health-intelligence/VaultBrainIdentity.tsx");
check(mark.includes('import { Bird, Flame } from "lucide-react"')&&mark.includes('role={label?undefined:"img"}'),"Bird + Flame acessíveis e sem efeito clínico");
check(!/setInterval|requestAnimationFrame|db\.|fetch\(|localStorage|useEffect/.test(mark),"marca Fênix sem animação, banco ou rede");
check(health.includes('label:"Fênix",icon:<FenixMark')&&health.includes('<FenixMark size="xs" label />'),"Fênix visível na navegação e no cartão real");
check(health.includes('{person?.name || "Seu perfil"}')&&health.includes('person?.avatar_url'),"identidade e foto escolhidas pela pessoa não são substituídas");
check(avatar.includes('<FenixMark size="xs" label/>')&&avatar.includes('avatarDisplayName(avatarName,personName)'),"marca integrada à inspeção ampliada e nome pessoal preservado");
check(avatar.includes('canMountAvatar3D(')&&!mark.includes('WebGLRenderer('),"seleção WebGL original preservada; marca não cria renderização");
check(general.includes('>VAULT Brain</p>')&&general.includes('>Central do Brain</h1>')&&general.includes('label="Áreas do VAULT Brain"'),"central integrada com uma só marca");
check(analysis.includes('>Análises de saúde</h1>')&&analysis.includes('O VAULT Brain usa somente dados registrados'),"subárea de saúde sem marca concorrente");
check(alerts.includes('>VAULT Brain</p>')&&alerts.includes('>Alertas e evidências</h1>'),"alertas identificados como parte do Brain");
check(health.includes('>VAULT Brain <ChevronDown')&&home.includes('>VAULT Brain</h2>')&&brainId.includes('VAULT Brain'),"Brain com marca consistente em Home e Minha Saúde");
for(const src of [health,general,analysis,alerts])check(!/>Vault Intelligence\b|>Vault Insight\b|>VAULT INTELLIGENCE\b|>VAULT INSIGHT\b/.test(src),"marca anterior removida da interface visível");
check(health.includes('onBrainSelect={()=>{')&&health.includes('setSelectedInsight(insight)'),"Fênix preserva abertura de evidência individual");
const v321=read('scripts/test-v321-global-health-focus.cjs');
check(v321.includes('>VAULT Brain <ChevronDown')&&v321.includes('FenixMark')&&!v321.includes("health.includes('Vault Intelligence')"),"V321 exige Avatar e marca real, não rótulo obsoleto");
const more=read('app/mais/page.tsx');
check(more.includes('label: "VAULT Brain"')&&more.includes('id: "inteligencia"')&&more.includes('onClick: () => {'),"atalho Mais usa VAULT Brain sem alterar rota nem ação");
const gate=read('scripts/test-v63-release-gate.mjs');
check(gate.includes('"scripts/test-vault-m132-mobile-medication-density.cjs"')&&gate.includes('"scripts/test-vault-m133-home-brain-grouping.cjs"')&&gate.includes('"scripts/test-vault-m134-fenix-branding.cjs"'),"gate mantém M132/M133 e registra M134");
console.log('M134: contratos de identidade, JSX, WebGL e compatibilidade aprovados.');
