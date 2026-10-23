#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const styleSource=read('lib/health-profile/avatar-style.ts');
const js=ts.transpileModule(styleSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const box={exports:{}};new Function('exports','module','require',js)(box.exports,box,require);
const {DEFAULT_AVATAR_STYLE,normalizeAvatarStyle,avatarStyleLabel}=box.exports;
for(const hair of ['short','fade','curly','coily','wavy','long','bob','bun','ponytail','braids','bald'])assert.equal(normalizeAvatarStyle({hair}).hair,hair,`cabelo ${hair}`);
assert.equal(normalizeAvatarStyle({earrings:'hoop'}).earrings,'hoop');
assert.equal(normalizeAvatarStyle({earrings:'unsafe'}).earrings,'none');
assert.equal(normalizeAvatarStyle({hair:'unsafe'}).hair,DEFAULT_AVATAR_STYLE.hair);
assert.match(avatarStyleLabel(normalizeAvatarStyle({hair:'braids'})),/Tranças/i);
const editor=read('components/saude/AvatarStyleEditor.tsx');
for(const token of ['Crespo','Ondulado','Longo','Bob','Coque','Rabo de cavalo','Tranças','Ponto de luz','Argola','Não há modelo masculino ou feminino'])assert(editor.includes(token),`editor: ${token}`);
const scene=read('components/saude/HealthAvatar3D.tsx'),fallback=read('components/saude/HealthBody.tsx');
for(const token of ["appearance.hair==='coily'","appearance.hair==='wavy'","appearance.hair==='long'","appearance.hair==='bob'","appearance.hair==='bun'","appearance.hair==='ponytail'","appearance.hair==='braids'","appearance.earrings==='stud'","appearance.earrings==='hoop'"]){assert(scene.includes(token),`3D: ${token}`);assert(fallback.includes(token),`fallback: ${token}`);}
const framing=read('lib/health-profile/avatar-framing.ts');assert.match(framing,/style\.hair,style\.facialHair,style\.earrings/);
const onboarding=read('app/onboarding/page.tsx');
for(const token of ['Começar com a sua cara','As opções não definem gênero','avatarPreferenceKey(user.id,p.id)','avatarPreferencePayload("3d","compact"','A preferência cosmética local nunca bloqueia'])assert(onboarding.includes(token),`onboarding: ${token}`);
assert.match(onboarding,/existing\|\|await personsRepository\.create/);
assert.match(onboarding,/await changePerson\(p\.id!\)/);
assert.match(onboarding,/router\.replace\("\/"\)/);
const docs=read('docs/AVATAR-DIRETRIZ-VAULT.md');assert.match(docs,/não infere gênero/);assert.match(docs,/falha ou indisponibilidade do armazenamento cosmético nunca pode impedir/);
console.log('V239 AVATAR INCLUSIVO: onboarding opcional, cabelos, brincos, 3D, fallback e isolamento cosmético OK');
