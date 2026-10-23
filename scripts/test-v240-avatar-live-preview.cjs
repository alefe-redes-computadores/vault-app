#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('lib/health-profile/avatar-style.ts');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const box={exports:{}};new Function('exports','module','require',js)(box.exports,box,require);
const {DEFAULT_AVATAR_STYLE,normalizeAvatarStyle}=box.exports;
for(const brows of ['soft','defined','full'])assert.equal(normalizeAvatarStyle({brows}).brows,brows);
for(const lips of ['natural','rose','berry'])assert.equal(normalizeAvatarStyle({lips}).lips,lips);
assert.equal(normalizeAvatarStyle({brows:'unsafe'}).brows,DEFAULT_AVATAR_STYLE.brows);
assert.equal(normalizeAvatarStyle({lips:'unsafe'}).lips,DEFAULT_AVATAR_STYLE.lips);
const editor=read('components/saude/AvatarStyleEditor.tsx');
for(const token of ['Sobrancelhas','Suaves','Definidas','Cheias','Lábios','Rosé','Ameixa'])assert(editor.includes(token),`editor: ${token}`);
const onboarding=read('app/onboarding/page.tsx');
for(const token of ['Prévia ao vivo do Avatar','<HealthBody','GLASSES_CHOICES','EARRING_CHOICES','LIP_CHOICES','A prévia muda na hora'])assert(onboarding.includes(token),`onboarding: ${token}`);
assert.match(onboarding,/devices=\{\[\]\}/);
assert.match(onboarding,/showControls=\{false\}/);
const scene=read('components/saude/HealthAvatar3D.tsx'),fallback=read('components/saude/HealthBody.tsx');
for(const token of ['appearance.brows','appearance.lips']){assert(scene.includes(token),`3D: ${token}`);assert(fallback.includes(token),`fallback: ${token}`);}
const framing=read('lib/health-profile/avatar-framing.ts');assert.match(framing,/style\.earrings,style\.brows,style\.lips/);
const docs=read('docs/AVATAR-DIRETRIZ-VAULT.md');assert.match(docs,/prévia imediata/);assert.match(docs,/sem rotular o corpo/);
console.log('V240 AVATAR LIVE PREVIEW: rosto inclusivo, onboarding visual, 3D, fallback e compatibilidade OK');
