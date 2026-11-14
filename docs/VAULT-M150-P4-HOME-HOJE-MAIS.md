# VAULT M150 P4 R1 — Home, Hoje, Mais e textos

Base confirmada: `af6e20378988681de48e74da02e65ad0a6ba2e81` — P3 publicada.

## Evidências revisitadas

Documento mestre `VAULT-360-DOCUMENTO-MESTRE-M152-CORRECOES-E-EVOLUCOES-2026-11-14.md`, auditoria 08m12s do vídeo `1002615590.mp4` e transcrição/adendo de `1002615822.mp4` (03m03s, especialmente 01:22–03:02 para Mais). O arquivo do segundo vídeo não foi reinspecionado quadro a quadro aqui; os detalhes são da transcrição fornecida.

## Entrega desta cirurgia

- Mais: conta e pessoa ativa integradas no mesmo card, mantendo seleção por pessoa; Brain em Saúde e fora do Cofre; acessos pessoais conservados; sincronização agrupada com Dados & Nuvem, segurança/backup/exportação; Update Center visível em seção própria; tema em alvos iguais; diagnóstico de proprietário preservado; rodapé com safe area.
- Home: cor semântica dos acessos de medicamentos / Minha saúde / mapa; esclarecimento visível de contagem contínuos vs linha temporal do Hoje, com botão para Hoje; pluralização de retiradas.
- Hoje: atalhos diretos e acessíveis para Check-in (diário existente), Ocorrências e Plano pessoal; orientação explícita dos contadores; pluralização de registros, eventos, compromissos e sinais.
- Nenhum registro de dose, estoque, tratamento, acesso à nuvem, Supabase, Dexie, banco, Brain ou dados pessoais é criado/modificado pelo instalador.

## Não declarados resolvidos (P4 fase posterior / P5)

Deduplicação global por *problema operacional + entidade + autoridade* atravessando diversos domínios de alertas permanece para avaliação de runtime/usuário. Não se remove alerta crítico por coincidir nome, href ou medicamento. Os motores clínicos SOS, modais, Fênix/PharmaLens e classificação regulatória continuam na P5. Não afirmar homologação visual no Android por teste textual.

## Gate e publicação

Script faz backup, worktree isolada, valida SHA de 9 arquivos, aplica 9 mudanças rastreadas e cria 2 arquivos, executa teste P4, testes direcionados e gate V63/V70/TypeScript **antes de qualquer push**; só após zero falhas cria commit seletivo e candidata `vault/fastlane/m150-p4-r1-*`. A promoção da main é separada, após CI remoto e revisão. Nada é publicado em caso de falha.
