# VAULT 360 — M153 P6, candidata de explicabilidade e hierarquia visual

Base exata: `0056145bc1fb9776f0b32e287984883f4f85359b` (candidata P5 FIX4, exigir publicada na main).

## Implementado neste pacote
- Home: pulso do Brain em linguagem humana, manutenção das métricas em texto assistivo, ocultação efetiva de gavetas secundárias via Modo Essencial, sem filtros de busca no topo.
- Medicamentos: card único com Lista/Grupos, Compactos/Conforto e filtro sob demanda; conserva as autoridades dos estados, grupos, SOS, doses e estoque.
- B05: resumo visual compacto com prioridade, fonte e passagem a Plano de Segurança; explicação integral auditável; medidor em mg **somente quando** total, apresentação, unidade e referência oficial forem estruturalmente confirmados.
- Brain: sondagem 2 horas após registro SOS confirmado, preservando a chave idempotente legada `d1` para nunca reapresentar perguntas dispensadas antes da mudança (não após dose planejada), opt-in original, silêncio de novas perguntas 22h–8h e limite visual de uma nova pergunta por dia; cap semanal original permanece.
- PharmaLens: conferência guiada de dados declarados versus referência oficial, imagem local opt-in, divergências e proveniência; nenhuma escrita automática, promoção global ou movimentação fictícia.
- Consultas: CTA um toque para o relatório canônico de 30 dias, com exportação/compartilhamento já existentes e exclusivamente opt-in.
- Fênix 3D: enquadramento responsivo por proporção da tela, menor min-height em paisagem, renderizador e loop originais preservados.

## Limites verificáveis — não apresentar como pronto
1. O repositório consultado não contém um OCR operacional vinculado a este fluxo do PharmaLens. Selecionar imagem **não executa OCR**. Não fingir a extração; integração de OCR exige motor real e testes com documentos.
2. Medição de dose em mg só aparece com `officialSourceVerified` e `comparable` estruturados. A aplicação existente não fornece esses dois campos estruturados aos alertas B05; **nenhum número em mg foi inventado**. Falha segura mostra motivo.
3. A reconciliação integral dos contadores Home/Hoje/Medicamentos exige unificar motores de agenda e coberturas, com contrato distinto de SOS, períodos e contínuos. Este pacote não declara igualdade artificial.
4. Não há migration SQL nesta candidata; sondagens continuam com opt-in explícito. O limite silencioso 22–8 protege o usuário, mas configuração granular de horário precisa ser desenvolvida e homologada antes de qualquer ativação geral.
5. Requer homologação visual e clínica no Android; gates locais e publicação não substituem teste físico.

## Engenharia
- Reaproveitar worktree isolada, sem modificar `~/projects/vault-app`.
- Preflight exigindo SHA exato de `origin/main` e SHA Git blob de todos os arquivos rastreados antes de gravar; backup seletivo, allowlist, TypeScript, `git diff --check`, gate V63 que inclui V70.
- Produzir **candidata apenas**, sem SQL ou `push main`. Priorizar testes direcionados antes dos 300+ contratos.
- A regra de engenharia do proprietário é preservar melhorias legítimas e atualizar contratos obsoletos sem perder segurança.
