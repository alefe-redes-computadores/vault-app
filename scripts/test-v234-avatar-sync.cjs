#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=f=>fs.readFileSync(f,'utf8');
const avatar=read('components/saude/HealthAvatar3D.tsx');
const src=ts.createSourceFile('HealthAvatar3D.tsx',avatar,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(src.parseDiagnostics.length,0,'Avatar sem erros de parsing');
assert.match(avatar,/expressionLidScaleY\.set\(upperLid,upperLid\.scale\.y\)/,'escala base de cada pálpebra preservada');
assert.match(avatar,/expressionEyeScaleY\.set\(pupil,pupil\.scale\.y\)/,'escala base de cada pupila preservada');
assert.match(avatar,/object\.scale\.y=\(expressionLidScaleY\.get\(object\) \?\? object\.scale\.y\)\*\(value==="reflective"\?\.72:value==="happy"\?\.84:1\)/);
assert.match(avatar,/object\.scale\.y=\(expressionEyeScaleY\.get\(object\) \?\? object\.scale\.y\)\*\(value==="reflective"\?\.88:1\)/);
assert(!/object\.scale\.y=value===/.test(avatar),'nenhuma expressão sobrescreve a escala Y absoluta');
assert(avatar.includes('expressionLids.push({object:upperLid,sign})'),'V208 ainda encontra registro facial clássico');
assert(avatar.includes('expressionEyes.push({object:pupil,restY:pupil.position.y})'),'olhos preservam API histórica');
// Executa a FUNÇÃO REAL de expressão extraída do renderizador, sem precisar WebGL.
const begin=avatar.indexOf('    const setExpression=(value:AvatarBodyContext[\'expression\'])=>{');
const finish=avatar.indexOf('    setExpression(expressionRef.current);',begin);
assert(begin>=0 && finish>begin,'setExpression deve ser encontrada no Avatar');
const expression=avatar.slice(begin,finish).replace("value:AvatarBodyContext['expression']",'value');
for(const mood of ['neutral','happy','reflective']) {
  const lid={rotation:{z:0},scale:{y:.012}};
  const pupil={position:{y:2.819},scale:{y:.006}};
  const brow={rotation:{z:0},position:{y:2.861}};
  const mesh=()=>({visible:true,rotation:{z:0},position:{y:0}});
  const lidScaleMap=new WeakMap([[lid,.012]]);
  const eyeScaleMap=new WeakMap([[pupil,.006]]);
  const run=new Function('expressionBrows','expressionLids','expressionEyes','expressionLidScaleY','expressionEyeScaleY','mouth','neutralMouth','lowerLip', expression+'\nreturn setExpression;')(
    [{object:brow,sign:1}],[{object:lid,sign:1}],[{object:pupil,restY:2.819}],lidScaleMap,eyeScaleMap,mesh(),mesh(),mesh());
  run(mood);
  const factor=mood==='reflective'?.72:mood==='happy'?.84:1;
  assert.equal(lid.scale.y,.012*factor,`pálpebra: ${mood}`);
  assert.equal(pupil.scale.y,.006*(mood==='reflective'?.88:1),`pupila: ${mood}`);
  assert(lid.scale.y<.02 && pupil.scale.y<.01,`olho se mantém compacto: ${mood}`);
}
const pull=read('lib/sync/pull.ts');
assert.match(pull,/criticalPullErrors\.length > 0/);
assert.match(pull,/\.order\("id", \{ ascending: true \}\)/);
assert.match(pull,/\.range\(offset, offset \+ size - 1\)/);
const refresh=read('lib/sync/recent-dose-refresh.ts');
assert.match(refresh,/queuedIds\.has\(remote\.id!\)/);
assert.match(refresh,/local\?\.synced === false/);
assert.match(refresh,/localTime > remoteTime/);
assert.match(refresh,/\.gte\("data", earliest\)/);
const providers=read('components/Providers.tsx');
assert.match(providers,/refreshRecentCloudDoses\(userId\)/);
assert.match(providers,/document\.visibilityState !== "visible"/);
assert.match(providers,/10 \* 60_000/);
for(const f of ['lib/sync/pull.ts','lib/sync/recent-dose-refresh.ts','components/Providers.tsx']){
 const ast=ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0,`syntax: ${f}`);
}
console.log('V234: regressão real da escala ocular, paginação, proteção de fila e atualização em foreground OK');
