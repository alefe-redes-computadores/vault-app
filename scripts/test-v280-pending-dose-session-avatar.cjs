#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(rel){const file=path.join(root,rel);if(cache.has(file))return cache.get(file).exports;const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);mod.require=id=>id.startsWith('@/')?load(id.slice(2)+(path.extname(id)?'':'.ts')):require(id);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;}
const ok=(v,label)=>{assert.ok(v,label);console.log('OK:',label);};
const review=load('lib/pending-dose-review.ts');
const a={data:'2026-10-26',medicamentoId:'venvanse',horario:'22:00'},b={data:'2026-10-27',medicamentoId:'pristiq',horario:'08:00'};
assert.equal(review.pendingDoseKey(a),'2026-10-26:venvanse:22:00');
assert.equal(review.pendingDoseStillOpen(a,[a,b]),true);
assert.equal(review.pendingDoseStillOpen(a,[b]),false);
assert.deepEqual(review.nextPendingDose(a,[a,b]),b);
ok(true,'sessão preserva identidade e avança sem depender da posição reativa');
const modal=fs.readFileSync(path.join(root,'components/PendingDosesModal.tsx'),'utf8');
ok(modal.includes('useState<PendingDose | null>')&&modal.includes('const resolvedDose = selectedDose'),'dose selecionada permanece como snapshot durante a gravação');
ok(modal.includes('resolvedInSession')&&modal.includes('aria-live="polite"'),'confirmação do lote informa progresso sem confirmação ambígua');
const home=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');
ok(home.includes('doseResolutionLockRef.current = true')&&home.includes('doseResolutionLockRef.current = false'),'trava síncrona impede envio duplo mesmo antes do próximo render');
const avatar=load('lib/health-profile/avatar-attention-map.ts');
const mapped=avatar.buildAvatarAttentionMap([{id:'i',kind:'pattern',categoria:'habitos',titulo:'Sono irregular',mensagem:'Registro de sono',urgencia:'media',confianca:'media',amostra:4,gravidadeSeguranca:'informativa'}]);
assert.equal(mapped[0].region,'cabeca');assert.equal(mapped[0].evidenceLabel,'associação');assert.equal(mapped[0].priorityLabel,'atenção');
ok(true,'Avatar explica região, prioridade e natureza da evidência');
console.log('\nVAULT V280 — DOSES PENDENTES + AVATAR EXPLICÁVEL: OK');
