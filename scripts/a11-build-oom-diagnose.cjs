#!/usr/bin/env node
'use strict';
/** A11: log analyzer only. Does not rewrite next.config, kill workers or deploy. */
const fs=require('node:fs');
const file=process.argv[2];
if(!file||!fs.existsSync(file)){console.error('Uso: node scripts/a11-build-oom-diagnose.cjs /caminho/build-vercel.log');process.exit(2)}
const raw=fs.readFileSync(file,'utf8');
const evidence={
  hasSigkill:/SIGKILL|BUILD_UTILS_SPAWN_SIGKILL/i.test(raw),
  hasMemoryEvent:/out.of.memory|\bOOM\b|heap out of memory|allocation failed/i.test(raw),
  reachesNextOptimization:/Creating an optimized production build/i.test(raw),
  reachesStaticGeneration:/Generating static pages/i.test(raw),
  hasSentrySourceMapWarning:/sentry.*source.map|source.map.*sentry/is.test(raw),
  notes:['OOM ou SIGKILL não identifica, sozinho, a origem do consumo. Comparar experimentos por SHA, memória, artefatos e flags.'],
};
console.log('A11_VERCEL_BUILD_DIAGNOSTICO_SEM_MUTACAO');
console.log(JSON.stringify(evidence,null,2));
if(evidence.hasSigkill||evidence.hasMemoryEvent)process.exitCode=3;
