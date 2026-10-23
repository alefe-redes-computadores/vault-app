#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('lib/health-profile/avatar-style.ts');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const box={exports:{}};new Function('exports','module','require',js)(box.exports,box,require);
const {DEFAULT_AVATAR_STYLE,normalizeAvatarStyle,avatarStyleLabel}=box.exports;
for(const topStyle of ['tee','hoodie','tank'])assert.equal(normalizeAvatarStyle({topStyle}).topStyle,topStyle);
assert.equal(normalizeAvatarStyle({topStyle:'unsafe'}).topStyle,DEFAULT_AVATAR_STYLE.topStyle);
assert.match(avatarStyleLabel(normalizeAvatarStyle({topStyle:'hoodie'})),/moletom/i);
const editor=read('components/saude/AvatarStyleEditor.tsx');
for(const token of ['Parte de cima','Camiseta','Moletom','Regata'])assert(editor.includes(token),`editor: ${token}`);
const onboarding=read('app/onboarding/page.tsx');
for(const token of ['LOOK_PRESETS','Essencial','Expressivo','Leve','role="tablist"','appearanceStage','sticky top-2','dynamic(() => import'])assert(onboarding.includes(token),`onboarding: ${token}`);
const scene=read('components/saude/HealthAvatar3D.tsx'),fallback=read('components/saude/HealthBody.tsx');
for(const token of ["appearance.topStyle==='hoodie'","appearance.topStyle==='tank'"]){assert(scene.includes(token),`3D: ${token}`);assert(fallback.includes(token),`fallback: ${token}`);}
assert.match(scene,/coque desce para a nuca/);assert.match(scene,/appearance\.hat==='none'\?2\.73:2\.67/);
const framing=read('lib/health-profile/avatar-framing.ts');assert.match(framing,/style\.lips,style\.topStyle/);
const context=read('lib/health-profile/avatar-context.ts'),avatar=read('components/saude/HealthAvatar.tsx');
assert.match(context,/avatarAttentionLabel/);assert.match(context,/Revisão prioritária/);
assert.match(scene,/Math\.min\(4,Math\.floor\(rank\)\)/);
assert.match(avatar,/Prioridade baseada nos registros · não é diagnóstico/);
assert.equal((avatar.match(/avatarAttentionLabel\(attention\)/g)||[]).length,1,'uma superfície explicativa do Brain');
console.log('V241 AVATAR LOOKS + FIT: roupa, presets, encaixe, Brain explicável, 3D e fallback OK');
