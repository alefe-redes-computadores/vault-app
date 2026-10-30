#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const avatar=read('components/saude/HealthAvatar.tsx');
const scene=read('components/saude/HealthAvatar3D.tsx');
const v156=read('scripts/test-v156-clinical-experience.cjs');
const v330=read('scripts/test-v330-fenix-health-preview.cjs');
for(const [name,src] of [['Avatar',avatar],['3D',scene]]){
 const parsed=ts.createSourceFile(name+'.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(parsed.parseDiagnostics.length,0,`${name}: TSX parse error ${parsed.parseDiagnostics.map(x=>x.messageText).join('; ')}`);
}
assert(avatar.includes("onEmptyTap={size==='expanded'?undefined:toggleExpanded}"),'empty 3D tap cannot close full screen');
assert(avatar.includes("if(next!=='expanded')setAppearanceEditorOpen(false)"),'editor closed when leaving full-screen');
assert(avatar.includes('V333_FENIX_LAZY_PERSONALIZATION'));
assert(avatar.includes('appearanceEditorOpen?<AvatarStyleEditor'),'only mount heavy editor on demand');
assert(avatar.includes('aria-expanded={appearanceEditorOpen}'),'editor has accessible state');
assert(avatar.includes('Personalizar Avatar'),'editor has visible action');
assert(avatar.includes("size==='expanded'||previewVisible"),'3D preview still viewport gated');
assert(avatar.includes("mode==='3d'&&documentVisible&&!unavailable"),'3D preview still foreground gated');
assert(scene.includes('antialias: !compactRef.current'),'compact anti-alias no longer consumes full-screen GPU budget');
assert(scene.includes('avatarAdaptiveRatio('),'adaptive pixel limit preserved');
assert(scene.includes('renderer.forceContextLoss()'),'WebGL context cleanup preserved');
assert(scene.includes('requestAnimationFrame(now') && !scene.includes('requestAnimationFrame(animate)'),'no perpetual render loop');
assert(v156.includes("onEmptyTap={size==='expanded'?undefined:toggleExpanded}"),'migrated V156 checks safe behavior');
assert(v330.includes("onEmptyTap={size==='expanded'?undefined:toggleExpanded}"),'migrated V330 checks safe behavior');
console.log('VAULT V333: Avatar mode, open controls, lazy customization, GPU budget, accessible navigation and cleanup OK');
