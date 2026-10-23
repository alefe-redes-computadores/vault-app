#!/usr/bin/env node
'use strict';
// V235: release readiness passivo: não lê dados pessoais nem modifica registros.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];
const check=(name,predicate)=>{assert.ok(predicate,name);checks.push(name);console.log('✓ '+name)};
const avatar=read('components/saude/HealthAvatar3D.tsx');
check('Avatar guarda a escala original das pálpebras',avatar.includes('expressionLidScaleY.set(upperLid,upperLid.scale.y)'));
check('Avatar guarda a escala original das pupilas',avatar.includes('expressionEyeScaleY.set(pupil,pupil.scale.y)'));
check('Avatar não estica o eixo Y de olhos na expressão',!avatar.includes('object.scale.y=value==='));
const refresh=read('lib/sync/recent-dose-refresh.ts');
check('Doses recentes usam janela limitada e paginação',refresh.includes('.gte("data", earliest)')&&refresh.includes('.range(offset, offset + pageSize - 1)'));
check('Atualização protege doses locais pendentes',refresh.includes('queuedIds.has(remote.id!)')&&refresh.includes('local?.synced === false'));
check('Dose antiga do APK não é sobrescrita por sync recente',refresh.includes('localTime > remoteTime'));
const pull=read('lib/sync/pull.ts');
check('Pull de doses possui confirmação paginada',pull.includes('criticalPullErrors.length > 0')&&pull.includes('.order("id", { ascending: true })'));
const providers=read('components/Providers.tsx');
check('Recuperação automática em foreground tem intervalo limitado',providers.includes('refreshRecentCloudDoses(userId)')&&providers.includes('10 * 60_000'));
const filters=read('components/list/ListFilters.tsx'),sort=read('components/list/ListSort.tsx');
check('Filtros e ordenação permitem Escape e devolvem foco',filters.includes('event.key !== "Escape"')&&sort.includes('event.key === "Escape"')&&filters.includes('focus({ preventScroll: true })')&&sort.includes('focus({ preventScroll: true })'));
check('Listagens continuam com filtros aplicáveis',filters.includes('Aplicar filtros')&&sort.includes('const handleSelect = (selectedValue: string)'));
const card=read('components/list/ListCard.tsx');
check('Cards respeitam preferência de movimento reduzido',card.includes('useReducedMotion()')&&card.includes('reducedMotion ? false'));
const intelligenceSheet=read('components/vault-intelligence/VaultInsightSheet.tsx');
check('Brain apresenta evidências legíveis e botão acessível',intelligenceSheet.includes('text-xs leading-relaxed text-ink-secondary')&&intelligenceSheet.includes('min-h-12 w-full'));
const docsBanner=read('components/HealthDocsBanner.tsx');
check('Atalhos para documentos usam alvos de toque amplos',docsBanner.includes('min-h-11 shrink-0')&&docsBanner.includes('h-11 w-11 items-center'));
const time=read('components/saude/HealthTimePicker.tsx');
check('Seletor visual próprio sem gerar opções por render',time.includes('const HOURS = Array.from')&&time.includes('const MINUTES = Array.from')&&time.includes('HealthRelationPicker'));
const critical=[
  ['Brain clínico','lib/health-intelligence/brain-v4.ts'],
  ['Cérebro comportamental','lib/health-intelligence/brain-v5.ts'],
  ['Rede de cuidado','lib/health-network/care-continuity.ts'],
  ['Documentos relacionais','lib/health-documents/relations.ts'],
  ['Notificações','lib/dose-notification-pipeline.ts'],
  ['Minhas doses','lib/repositories/doseLogs.ts'],
  ['Minha Saúde','app/saude/minha-saude/page.tsx'],
  ['Linha de cuidado','app/saude/timeline/page.tsx'],
  ['Documentos de saúde','app/saude/documentos/page.tsx'],
  ['Documentos pessoais','app/documentos/page.tsx'],
  ['Novo medicamento','app/saude/medicamentos/novo/page.tsx'],
  ['Editar medicamento','app/saude/medicamentos/editar/page.tsx'],
  ['Detalhe do medicamento','app/saude/medicamentos/detalhes/page.tsx'],
];
for(const [label,file] of critical) check('Fonte preservada: '+label,fs.statSync(path.join(root,file)).size>100);
const selectedRoots=['app','components','hooks','lib'];
let scanned=0;const nativeVisible=[];const scan=(dir)=>{for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
  if(e.name.startsWith('.'))continue;
  const rel=path.join(dir,e.name);
  if(e.isDirectory()){scan(rel);continue;}
  if(!/\.(tsx|jsx)$/.test(e.name))continue;
  scanned++;
  const s=read(rel);
  // Select offscreen em HealthRelationPicker é intencional e semanticamente válido.
  if(/<select\b/i.test(s) && rel!=='components/saude/HealthRelationPicker.tsx')nativeVisible.push(rel+': select');
  if(/<input\b[^>]*type\s*=\s*["'](?:date|time|datetime-local)["']/is.test(s))nativeVisible.push(rel+': native date/time');
}};
selectedRoots.forEach(scan);
check('Sem selects nativos visíveis não auditados',nativeVisible.length===0);
console.log(`✓ Auditoria estrutural ${scanned} telas/componentes JSX; ${checks.length} guardas aprovados.`);
console.log('OBS: inspeção estática não substitui teste visual, notificações reais ou verificação entre aparelhos.');
