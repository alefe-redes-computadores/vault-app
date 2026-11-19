# IA 2.0 P3 / QG2 — CTA único de Fornecimento e navegação recuperável

**Base:** HEAD descendente da P2 publicada `bd2be93d4d4`; gate V63 preservado cumulativamente.

## Evidência do problema

`app/saude/fornecimento/page.tsx` possui `creating` e `editing` locais, sem equivalência necessária com `searchParams.action`. Ao iniciar ProcessForm internamente ou quando a lista está vazia, o CTA do cabeçalho P2 poderia continuar exibido. Com `action=novo`, o cabeçalho deixa de assumir a criação e o FAB global poderia ressurgir.

## Mudanças

1. `ListPageHeader` aceita `suppressCreate` (prop de UI; nenhum estado clínico).
2. Fornecimento informa `creating || editing || !processes.length`; formulário salva somente por sua autoridade já existente. A lista que possui processos mantém o CTA do cabeçalho.
3. O `BottomNav` nunca cria segundo FAB em `/saude/fornecimento`; nas demais páginas, o Compose da P2 segue igual.
4. `ContextualCreateP2` recupera um botão de navegação bloqueado após oito segundos e após exceção síncrona. Não dispara salvamento, não gera toast falso e não muda o destino com `return_to`.
5. Novo contrato P3 valida modos de Fornecimento, rotas de Documentos com fallback e integridade de P1/P2/R5, sem silenciar contratos legados.

## Fora do escopo — não presumir homologação

Não remove FAB de Documentos, não altera formulários de Documento, não muda estoque/receita/dose/sync/CareFlow/Brain. Testar em Android: Fornecimento com processo vazio, com processo cadastrado, via `?action=novo`, edição interna; Documentos pessoais e clínicos vazios/preenchidos, teclado e Android Back. A aprovação via TypeScript/V63/V70 é técnica, **não visual real**.

## Release

Instalar/validar em worktree isolada, conferir 8 arquivos da allowlist, `tsc --noEmit`, V63 com todas as falhas consolidadas, V70 Super/Final, selo sem commit. Publicar separadamente, sem força de push, somente se HEAD remoto for exatamente a base validada.
