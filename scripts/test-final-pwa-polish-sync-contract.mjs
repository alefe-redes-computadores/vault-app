import fs from 'node:fs';
function read(path){ return fs.readFileSync(path,'utf8'); }
function ok(condition,message){ if(!condition) throw new Error(message); console.log('OK:',message); }
const providers=read('components/Providers.tsx');
const indicator=read('components/SyncStatusIndicator.tsx');
const runtime=read('lib/sync/runtime-status.ts');
const health=read('app/inteligencia/saude/page.tsx');
ok(runtime.includes('"background"'), 'sync possui estado background');
ok(providers.includes('VAULT_SYNC_BACKGROUND_V64'), 'pull longo migra para background');
ok(providers.includes('8_000'), 'spinner ativo tem janela curta');
ok(!providers.includes('A atualização da nuvem está demorando mais que o esperado.'), 'pull lento não vira falso erro');
ok(indicator.includes('syncRuntime.phase === "background"'), 'indicador trata background');
ok(indicator.includes('Atualizando'), 'background possui rótulo discreto');
ok(health.includes('timelineExpanded ? 20 : 5'), 'timeline usa progressive disclosure');
ok(health.includes('signalsExpanded ? 8 : 3'), 'sinais usam progressive disclosure');
ok(health.includes('humanSignalSubject'), 'IDs de medicamento são humanizados');
ok(health.includes('Relação temporal'), 'tipos internos têm rótulos humanos');
ok(health.includes('brainHealthExpanded'), 'saúde do cérebro é recolhível');
ok(health.includes('experienceInsights.slice(0, 1)'), 'feedback inicia compacto');
console.log('FINAL PWA POLISH + SYNC: CONTRATOS OK');
