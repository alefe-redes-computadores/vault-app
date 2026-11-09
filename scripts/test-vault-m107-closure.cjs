#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
let count=0;
const ok=(condition,label)=>{assert.ok(condition,`VAULT M107: ${label}`); console.log('OK',++count,label);};
const read=p=>fs.readFileSync(p,'utf8');
const changed=[
  'app/saude/farmacias/page.tsx',
  'app/saude/medicos/page.tsx',
  'components/Providers.tsx',
  'lib/notification-dose-navigation.ts',
];
for(const file of changed){
  const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  ok(ast.parseDiagnostics.length===0,`TS/TSX sem erro: ${file}`);
}
const pharmacy=read(changed[0]);
ok(pharmacy.includes('const corBase =\n    "#10B981";') && pharmacy.includes('badgeColor="text-emerald-300"') && pharmacy.includes('iconColor="text-emerald-300"'),'Farmacias com identidade verde consistente');
ok(pharmacy.includes('farmacia.isMaisEconomica') && pharmacy.includes('"#34D399"') && pharmacy.includes('Melhor preço') && pharmacy.includes('bg-amber-400 px-2 py-0.5'),'Melhor preco permanece visivel e distinto da categoria');
ok(pharmacy.includes('border-emerald-400 bg-emerald-400/20 text-emerald-300') && pharmacy.includes('hover:text-emerald-300'),'Filtro e edicao coerentes');
const doctors=read(changed[1]);
ok(doctors.includes('badgeColor="text-sky-300"') && doctors.includes('iconColor="text-sky-300"') && doctors.includes('const primaryColor = "#38BDF8";'),'Categoria medica azul independente dos vinculos');
ok(doctors.includes('tratamento.color') && doctors.includes('medico.tratamentos') && doctors.includes('backgroundColor:') && doctors.includes('borderColor:'),'Tratamentos conservam sua propria identidade colorida');
ok(doctors.includes('medico.temAlertaUrgente') && doctors.includes('text-coral'),'Alertas medicos nao perdem a cor de atencao');
const medications=read('app/saude/medicamentos/page.tsx');
ok(medications.includes('const regulatoryBorderColor =') && medications.includes('regulatorySurface.rail') && medications.includes('style={medicationPersonalAccentStyle(med)}') && /color=\{\s*regulatoryBorderColor\s*\}/.test(medications),'Faixa regulatoria preservada; identidade pessoal no icone');
ok(medications.includes('setQuickDoseMedId(med.id!)') && medications.includes('if (item.isSOS || item.isSuspenso) continue;'),'Dose rapida e exclusao SOS preservadas');
const notify=read(changed[3]);
const transpiled=ts.transpileModule(notify,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};
new Function('module','exports',transpiled)(m,m.exports);
const {resolveDoseNotificationDestination:route,shouldSignalPendingDosesInPlace:signal}=m.exports;
ok(route('dose_overdue')==='/?open=pending-doses' && route('dose_overdue_group')==='/?open=pending-doses','Avisos atrasados levam ao modal sem confirmar doses');
ok(route('dose_reminder','23:15')==='/hoje?focus=doses&time=23%3A15' && route('dose_reminder','99:99')==='/hoje?focus=doses','Lembretes continuam usando agenda e horarios validos');
ok(signal('/?open=pending-doses','/')===true && signal('/?open=pending-doses','/hoje')===false && signal('/hoje','/')===false,'Evento de modal so e enviado quando a Home ja esta montada');
ok(!/(?:marcarDose|registrarDose|doseLogs|\.put\(|\.delete\(|\.add\(|fetch\()/.test(notify),'Helper nao cria autoridade de escrita nem sincronizacao');
const provider=read(changed[2]);
ok((provider.match(/shouldSignalPendingDosesInPlace\(destination, window\.location\.pathname\)/g)||[]).length===2,'Duas entradas de notificacao usam a mesma regra');
ok(provider.includes('router.push(destination!)') && provider.includes('router.push(destination ??') && provider.includes('if (data.userId && data.userId !== user.id) return;'),'Navegacao por query e protecao do proprietario mantidas');
const home=read('app/page.tsx');
ok(home.includes('window.addEventListener("vault:open-pending-doses", open)') && home.includes('url.searchParams.get("open") === "pending-doses"'),'Home abre modal por evento em tela ou query ao navegar');
const owner=read('hooks/useTodayOwnerData.ts');
ok(owner.includes('where("[user_id+person_id]").equals([userId, personId]).toArray()') && owner.includes('historicoDosesCompleto'),'Historico permanece isolado por conta/pessoa; otimizar apos benchmark');
const v200=read('scripts/test-v200-care-network-performance-avatar.cjs');
ok(v200.includes('doctors.includes(\'badgeColor="text-sky-300"\')') && v200.includes('hospitals.includes(\'badgeColor="text-rose-300"\')'),'V200 atualizado para a nova politica sem retirar contratos de rede');
ok(read('scripts/test-v63-release-gate.mjs').includes('"scripts/test-vault-m107-closure.cjs",'),'Novo contrato entra no gate completo');
console.log(`VAULT M107: ${count} verificacoes de layout, notificacao, clinica e compatibilidade OK`);
