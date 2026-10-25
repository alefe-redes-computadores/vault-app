# VAULT Surgery 2.1 — Fechamento técnico V260 R1

Instalado por cirurgia local protegida. Nunca executa `git add`, `commit`, `push`, `npm install`, build Android nem altera Supabase.

## Análise de impacto

`node scripts/surgery21/impact.mjs --changed lib/health-intelligence/brain-v5.ts`

`node scripts/surgery21/impact.mjs --json --changed components/saude/HealthAvatar3D.tsx`

`node scripts/surgery21/impact.mjs --all --changed hooks/useSyncQueue.ts`

O algoritmo lê o grafo estático de imports/exports/require por TypeScript AST, encontra importadores transitivos, procura referências explícitas em testes e usa heurísticas de domínio com confiança rotulada. Não afirma exaustividade.

## Contratos e falhas

`node scripts/surgery21/selftest.mjs`

`node scripts/surgery21/classify.mjs caminho/do/log.txt`

O gate rápido **não substitui** `node scripts/test-v63-release-gate.mjs` e `node node_modules/typescript/bin/tsc --noEmit`.

## Contribuição para outros repositórios

Adapte o arquivo do release gate, o conjunto de extensões e o prefixo de import `@/`. Se TypeScript não existir, use um parser de JS do próprio repositório. O pacote é Node.js portável em Termux/macOS/Linux/Windows; apenas o instalador é Bash para Termux/Linux.

## Política

- Contratos textuais são sentinelas de compatibilidade, não teste de comportamento. Substituir progressivamente por AST, fixtures reais e testes de estado.
- Classificar a falha não significa silenciá-la.
- Nunca presumir que `tsc --noEmit` substitui exportação Next, WebView, notificações ou teste visual.
- Migrations são outra cirurgia, com backup, versão, idempotência e verificação RLS; nunca no instalador de tooling.
- Aplicação e publicação devem ser operações separadas.
