# M150 P4 R3 — Consolidação 360 / Home, Hoje e Brain (fase de autoridade visual)

**Base obrigatória**: `b39cfb7ce47e67fbba8295d22ad6419700f77c2a` — M150 P4 R2 aprovada após Fast Lane remoto. Esta cirurgia é candidata, não publicação automática.

## Escopo consolidado
- Home: o alerta deixa de desaparecer apenas por compartilhar o `href` com o hero. Alias de retirada só é agrupado quando o ID do evento é comprovado na Agenda. Alertas críticos ou vencidos nunca desaparecem pelo agrupador. Repetições *exatamente idênticas* não geram segundo cartão neutro.
- Home: Indicadores da rotina + detalhamento resumido da agenda saem de dentro do destaque principal e passam ao rodapé, depois de prioridade, Alertas e Brain. Os contadores originais continuam sendo calculados pelas fontes atuais.
- Brain: supressão do mesmo fenômeno operacional continua válida para informação rotineira, mas não silencia observações com gravidade de segurança crítica/importante/atenção. Evidências permanecem acessíveis.
- Hoje: mantém as três entradas rápidas (diário, ocorrências, plano), enquanto o segundo painel duplicado é reduzido a um atalho contextual único para os quatro eixos. O domínio de doses e as ações em lote não mudam.
- Textos: pluralização de retiradas/compromissos/doses e estoque onde o erro foi confirmado.

## Fora do escopo, não declarar resolvido
- Deduplicação longitudinal de outras superfícies por problema clínico, calibração de gravidade A05–A07, SOS e interações, medicações históricas, réguas de ANVISA, navegação profunda, Home acrdõeos de demais áreas, integração opt-in M152B, Fênix 3D e PharmaLens. Permanecem P4 R4 / P5 e auditoria Android.

## Segurança e publicação
- Nenhum registro de dose, estoque, receita, aquisição, pessoa, diagnóstico, Supabase ou Dexie é criado, editado ou inferido. Mudanças somente na apresentação e política read-only de visibilidade.
- Worktree isolada; SHA de blob verificado; backup das fontes; allowlist e symlink protegido; testes direcionados e V63/V70/TypeScript **antes** de qualquer commit/push.
- Após CI remoto, promover `main` separadamente. APK e inspeção no Android são outros gates.
