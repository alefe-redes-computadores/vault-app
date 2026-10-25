#!/usr/bin/env node
import assert from 'node:assert/strict';
import {canonical,resolveImport,buildReverseGraph,reachableImporters,rankTests} from './impact-core.mjs';
assert.equal(canonical('./lib/x.ts'),'lib/x.ts');
assert.throws(()=>canonical('../outside'),/fora do repositório/);
const known=new Set(['app/page.tsx','lib/x.ts','lib/a.ts','components/Card.tsx','scripts/test-med.cjs','scripts/test-avatar.cjs']);
assert.equal(resolveImport('app/page.tsx','@/lib/x',known),'lib/x.ts');
assert.equal(resolveImport('components/Card.tsx','../lib/x',known),'lib/x.ts');
const graph=buildReverseGraph({'app/page.tsx':['@/components/Card'],'components/Card.tsx':['@/lib/a'],'lib/a.ts':['./x']},known);
const deps=reachableImporters(['lib/x.ts'],graph);
assert.deepEqual([...deps].sort(),['app/page.tsx','components/Card.tsx','lib/a.ts','lib/x.ts'].sort());
const ranked=rankTests(['scripts/test-med.cjs','scripts/test-avatar.cjs'],{
  'scripts/test-med.cjs':`const x=read('lib/x.ts');`, 'scripts/test-avatar.cjs':'const y=1;'
},['lib/x.ts'],deps);
assert.equal(ranked[0].test,'scripts/test-med.cjs');
assert.equal(ranked[0].confidence,'alta');
assert.equal(ranked.length,1);
const surface=rankTests(['scripts/test-avatar.cjs'],{'scripts/test-avatar.cjs':''},['components/saude/HealthAvatar3D.tsx'],new Set());
assert.equal(surface[0].confidence,'heurística');
console.log('Surgery 2.1 selftest: resolução de import, grafo transitivo, isolamento, prioridade e fallback heurístico OK');
