#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const avatar=read('components/saude/HealthAvatar.tsx');
const health=read('app/saude/minha-saude/page.tsx');
for(const [name,src] of [['Fenix',avatar],['Minha Saude',health]]){
  const parsed=ts.createSourceFile(name+'.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(parsed.parseDiagnostics.length,0,name+' JSX/TSX syntax');
}
const tokens=[
  'V330_FENIX_VISIBLE_CONTROLS','previewRef=useRef<HTMLDivElement>(null)',
  'IntersectionObserver','observer.disconnect()','visibilitychange',
  "size==='expanded'||previewVisible", "mode==='3d'&&documentVisible&&!unavailable",
  "compact={size!=='expanded'}", "aria-pressed={mode==='3d'}",
  "aria-pressed={mode==='illustration'}", "chooseMode('3d')", "chooseMode('illustration')",
  'onUnavailable={fallback}', 'AvatarStyleEditor', 'setFraming(\'body\')',
  'avatarPreferencePayload(requestedMode.current', 'localStorage.getItem(preferenceKey)',
  'onEmptyTap={toggleExpanded}', 'role={expanded&&size===\'expanded\'?\'dialog\':undefined}',
];
for(const needle of tokens)assert(avatar.includes(needle),'Fenix missing: '+needle);
assert(health.includes('VAULT_V330_HEALTH_AVATAR_HIERARCHY'));
assert(health.includes('min-[480px]:grid-cols-[minmax(0,46%)_minmax(0,1fr)]'));
assert(health.includes('aria-label="Medidas principais do perfil"'));
assert(health.includes('layout="grid"'));
const nav=read('components/saude/ClinicalSectionNav.tsx');
assert(nav.includes('layout?:"scroll"|"grid"')&&nav.includes('grid-cols-3'),'My Health navigation all tabs visible');
assert(nav.includes('window.addEventListener("hashchange",syncHash)'),'deep link selection preserved');
for(const t of ['<HealthBody key={personId}', '<AvatarReadings', '<AvatarCareWorkspace','<HealthTrendsExplorer','<DeferredHealthSection id="fontes"','<DeferredHealthSection id="analises"'])assert(health.includes(t),'My Health legacy content removed '+t);
const scene=read('components/saude/HealthAvatar3D.tsx');
for(const k of ['renderer.forceContextLoss()','powerPreference: "low-power"','avatarAdaptiveRatio(','controller.current?.preview()'])assert(scene.includes(k),'3D performance contract '+k);
assert(!scene.includes('requestAnimationFrame(animate)'),'no perpetual 3D render loop');
console.log('VAULT V330: Fenix WebGL preview gated, user preference, editor, mobile hierarchy, legacy care components OK');
