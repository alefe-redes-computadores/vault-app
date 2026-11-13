# VAULT M144 R1 — Integração Global e Publicação Condicional

## Escopo entregue

- Integra automaticamente o trabalho local aprovado da M143 P1, P2 e P3 em **worktree separado** baseado no `main` remoto atual (Brain V7, Supply Shield SS7, Visual Studio V8).
- Preserva o código original, mudanças rastreadas e arquivos não rastreados num snapshot privado com SHA-256.
- Merge 3-way real por arquivo com bloqueio quando houver conflito, inclusive após alterações concorrentes.
- Reconcilia o gate V63 por nomes de testes, preservando V7, SS7 e V8 e incluindo P2/P3/M144.
- Adiciona visualização somente leitura do PillStudioV8 à tela de edição de medicamentos, preservando formato e cores selecionados sem gravar dados automaticamente.
- Executa M71, V266, V271, P2, P3, V7, SS7, V8, M144, release completo, TypeScript e `git diff --check`.
- Se e **somente se** todos os gates passarem, remoto continuar no mesmo HEAD e fontes locais não mudarem, faz commit explícito no worktree e push normal para a `main`, sem force.

## Limitações e segurança

- Não acessa Dexie nem registros clínicos pessoais. Não declara receitas válidas nem compras recebidas por inferência.
- Não inclui mudanças automáticas em doses, estoque, status, protocolos, anexos ou tratamentos.
- Qualquer conflito ou teste falho impede o commit/push. O worktree é preservado para auditoria e diagnóstico; o checkout principal continua intacto.
- Não confundir `git push` bem-sucedido com deploy Vercel READY ou APK atualizado. A homologação visual real permanece obrigatória.
- M144 R1 integra todas as correções locais existentes, mas **não certifica os bugs que exigem dados pessoais ou inspeção do vídeo**.


HEAD remoto base: `a1af6d46449f72ad26e40a5257778db1457862b8`
