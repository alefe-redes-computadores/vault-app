# VAULT CI360 M3 P1 — Reconstrução sobre M2

Base semântica documentada: `b427d3935e0cfc9aee06b24832b32fe19b564b71` (M2 publicada). A execução usa **origin/main mais recente** e aceita HEAD avançado se mantiver as âncoras semânticas.

## Integrado nesta candidata

- `CustomDatePicker`: fechamento por seleção, toque fora e tecla Escape.
- `catalog-presentation`: reconhecer `COM SUB-LING` / `COM SUB LING` sem declarar produto ou bula oficialmente validados.
- `Novo` e `Editar`: paleta compartilhada, 1 nova cor para formatos comuns, até 2 para cápsulas; dados históricos não sofrem conversão na abertura.
- `PillStudio` e ícone da forma sublingual: ilustração própria, sem simular aparência real da embalagem.
- Aviso de apresentação/catalogação com linguagem honesta de evidência e não equivalência médica presumida.
- Tela de lembretes: antecedentes **por categoria** de compromisso (consulta, exame, retirada, compra), **locais e por conta/pessoa**. Motor nativo existente usa seleção quando disponível; sem sincronização entre aparelhos, sem criação de eventos clínicos.
- CareFlow: Dossiê local pela pessoa, filtros de seções, linha do tempo dos eventos M2, geração/arquivo de PDF local por ação humana, acesso à biblioteca existente e à Central do Relatório Clínico 360.
- V63 inclui testes dedicados P1, sem eliminar contratos anteriores.

## Não confundido com concluído

A M3 P1 NÃO é a M3 inteira. Check-ins Brain pós-curso/pós-consulta, preferências por evento sincronizadas, notificações completas por cirurgia/renovação/PA, Quiet Hours integrado, Modo Médico A4 com anexos, Fênix/Avatar Studio, GPU/Android real, OCR visual de marcação e a P6 P3 ainda exigem suas respectivas entregas e homologações. O PDF P1 é a linha do tempo M2 local, não um relatório médico completo.

## Invariantes

Sem alteração automática de doses, estoque, receita, consulta, retirada, documento, RLS ou migrations. Não confundir `document_id` ausente com excluído. Metadona só por evento real. História de tratamentos, idempotência e perfis preservados. Nada é compartilhado automaticamente.

## Testes

O aplicador primeiro planeja TODOS os arquivos sem escrever nenhum; âncora ausente/duplicada = bloqueio.
Worktree isolada em `origin/main`; a pasta `~/projects/vault-app` é preservada.
O diagnóstico percorre TODO vetor V63, registrando TODAS as falhas, ambos V70 e TypeScript — não pára no primeiro erro. Depois de zero falhas roda o V63 oficial.
Somente um selo aprovado autoriza publicar via script separado, com nova checagem do remoto. Push normal, stage por allowlist, sem `git add -A`, `reset --hard`, `clean -fd` ou `push --force`.
