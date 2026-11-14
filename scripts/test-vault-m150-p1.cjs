#!/usr/bin/env node
'use strict';
/* M150 P1 — behavioral and structural proof, no DB/network writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const read = f => fs.readFileSync(f,'utf8');
let count = 0;
const ok=(value,message)=>{assert.ok(value,'M150: '+message);count++;console.log(`✓ M150 ${count}: ${message}`)};
const files=[
  'lib/navigation/clinical-directory-m150.ts',
  'lib/navigation/clinical-return-m150.ts',
  'app/saude/mapa/page.tsx',
  'components/home/HomeCommandCenter.tsx',
  'components/BottomNav.tsx',
  'app/mais/page.tsx',
  'app/saude/central-m144/page.tsx',
  'components/home/HomeDailyHero.tsx',
  'components/hoje/TodayRoutinePulse.tsx',
];
for(const f of files){
  const src=ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(src.parseDiagnostics.length===0,`${f}: sintaxe TS/TSX`);
}
function loadTs(f, mocked={}){
  const js=ts.transpileModule(read(f),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const sandboxModule={exports:{}};
  new Function('module','exports','require',js)(sandboxModule,sandboxModule.exports,name=>{
    if(Object.hasOwn(mocked,name))return mocked[name];
    throw new Error('Import nao autorizado no teste puro: '+name);
  });
  return sandboxModule.exports;
}
const original=loadTs('lib/navigation/return-context.ts');
const ret=loadTs('lib/navigation/clinical-return-m150.ts',{'@/lib/navigation/return-context':original});
const safe=ret.safeClinicalReturnM150;
ok(safe('/saude/medicamentos?id=abc','/saude/central-m144','/saude/mapa')==='/saude/medicamentos?id=abc','retorna à entidade com identificador');
ok(safe('/saude/central-m144?return_to=%2F','/saude/central-m144','/saude/mapa')==='/saude/mapa','recusa retorno circular');
ok(safe('/hoje?focus=doses&return_to=%2Fsaude%2Fmedicamentos','/saude/central-m144','/saude/mapa')==='/hoje?focus=doses','remove return_to aninhado preservando foco');
ok(safe('//evil.example','/saude/mapa','/')==='/','nunca redireciona para dominio externo');
ok(safe('javascript:alert(1)','/saude/mapa','/')==='/','nunca aceita esquema nao local');
ok(safe('/saude/mapa','/saude/mapa','/')==='/','mapa nao aponta para si');
const catalog=loadTs('lib/navigation/clinical-directory-m150.ts');
const sections=catalog.clinicalDirectoryM150;
ok(sections.length>=4,'diretorio dividido por tarefa');
const entries=sections.flatMap(s=>s.items);
ok(entries.length>=20,'mapa inclui areas realmente existentes');
ok(new Set(entries.map(e=>e.href)).size===entries.length,'nenhuma rota duplicada no mapa');
ok(new Set(entries.map(e=>e.id)).size===entries.length,'identidades estaveis nao duplicadas');
for(const e of entries){
  ok(e.href.startsWith('/')&&!e.href.startsWith('//')&&fs.existsSync(path.join('app',e.href,'page.tsx')),`destino existente: ${e.href}`);
}
const fenix=catalog.searchClinicalDirectoryM150('fenix').flatMap(g=>g.items);
ok(fenix.some(e=>e.href==='/saude/minha-saude'),'busca sem acento encontra Fenix');
const s=catalog.searchClinicalDirectoryM150('SUS').flatMap(g=>g.items);
ok(s.some(e=>e.href==='/saude/fornecimento'),'busca encontra fornecimento/SUS');
ok(catalog.searchClinicalDirectoryM150('nadaexistente').length===0,'busca nao inventa destinos');
const map=read('app/saude/mapa/page.tsx');
ok(map.includes('withReturnTarget(entry.href,\'/saude/mapa\')')&&map.includes('safeClinicalReturnM150('),'mapa adiciona origem sem cascata');
ok(map.includes('Buscar áreas de saúde')&&map.includes('onChange={event=>setQuery(event.target.value)}'),'busca real e acessivel');
ok(map.includes('href={href}')&&map.includes('focus-visible:outline'),'destino clicavel com foco visivel');
const home=read('components/home/HomeCommandCenter.tsx');
const more=read('app/mais/page.tsx');
ok(home.includes('Ver todas')&&home.includes('/saude/mapa?return_to=%2F'),'Home oferece mapa sem nova area aninhada');
ok(more.includes('Explorar áreas de saúde')&&more.includes('/saude/mapa?return_to=%2Fmais'),'Mais oferece acesso principal ao mapa');
ok(read('components/BottomNav.tsx').includes('"/saude/mapa"'),'mapa mantem navegação inferior');
const central=read('app/saude/central-m144/page.tsx');
ok(central.includes("safeClinicalReturnM150(requested,'/saude/central-m144','/saude/mapa')"),'Central rejeita loop e retorna ao mapa sem origem');
ok(read('components/home/HomeDailyHero.tsx').includes('· contínuos'),'Home declara escopo do progresso');
ok(read('components/hoje/TodayRoutinePulse.tsx').includes('rotina do dia'),'Hoje declara seu escopo distinto');
const gate=read('scripts/test-v63-release-gate.mjs');
ok(gate.includes('const contracts = [\n  "scripts/test-vault-m92-medication-premium-2.cjs",'),'M92 segue primeiro');
ok(gate.split('"scripts/test-vault-m150-p1.cjs"').length===2,'M150 registrado uma vez no gate');
console.log(`VAULT M150 P1: ${count} verificações reais sem alterar dados de saúde`);
