# VAULT 360 — R4 P0: respiro e rodapé adaptativo

## Diagnóstico do vídeo de 19/11/2026

O fundo preto não é apenas uma falha de cor. São três fenômenos distintos:
- `min-h-screen`/`min-h-[100dvh]` numa página dentro do `body` que também recebe Safe Area; algumas páginas são mais altas que o viewport real.
- Reservas `pb-28`, `pb-32`, `pb-36`, `pb-[calc(7.5rem+safe)]`, `pb-[calc(8rem+safe)]` não consideram se a BottomNav está montada ou se há um botão de criação sobre ela. As áreas CareFlow mantêm grande reserva mesmo quando não exibem a barra.
- Páginas com poucos resultados (notadamente Pedidos de Exames) têm grande área naturalmente livre no viewport. Isso não se resolve removendo a Safe Area, que protege os controles. O redesign de estados vazios e a integração das listas serão uma cirurgia funcional/UX separada.

## Correção R4 P0

17 páginas principais têm sua altura ajustada à viewport dinâmica descontando a Safe Area do `body`. Sua margem final é agora **adaptativa**: sem BottomNav, 1,5rem + inset; BottomNav sem ação flutuante, 5,5rem + inset; com CTA flutuante, 8rem + inset. Se `:has()` não existir no WebView, a reserva original conservadora de 8rem permanece. A BottomNav e suas rotas não são modificadas. Classes de tailwind anteriores permanecem nos arquivos como fallback.

A lista vazia de **Pedidos de Exames** recebe um cartão centralizado, informativo e com CTA de cadastro real, em vez de uma linha mínima isolada no alto de uma tela enorme. Não cria pedido fictício nem altera a gravação do formulário. A reorganização das duas abas fica para a cirurgia de integração de exames.

O pacote cria também `INVENTARIO-PAGINAS.tsv`, com todas as páginas identificadas no checkout. **Somente as 17 páginas de código verificadas foram alteradas**, sem supor que outras páginas tenham a mesma necessidade ou estrutura. Não tentar corrigir todas as áreas com regex cega.

## Garantias

- Sem alterações de DoseLog, eventos clínicos, contas, medicamentos, estoque, banco, prescrições, notificações ou PDF.
- `git hash-object` de todos os arquivos verificado contra o HEAD GitHub auditado, mesmo que `main` tenha avançado desde R3; mudanças concorrentes em arquivos-alvo BLOQUEIAM antes de aplicar.
- Clone de diagnóstico sem push, backups seletivos, pós-validação, Git diff check, TypeScript, V63 novo contrato e publicação separada.
- O V63 **integral** será executado pelo workflow Android no commit publicado (`npm run test:release`); esta R4 exige teste focado + TypeScript no Termux, sem declarar Android homologado antes da Action e teste físico.

## QA Android recomendado

Home, Hoje, Mais, Documentos, Medicamentos, Exames, Consultas, Saúde e CareFlow, com e sem o CTA Adicionar. Nos caminhos CareFlow, verificar Modo Médico (sem barra) e Pedidos de Exames (com barra), rolando até o último botão. Testar teclado, retorno/gesto Android, inset inferior, fonte ampliada, PWA e APK em 320, 360, 393 e 430dp. Excesso preto ao redor de um *estado vazio* pode persistir legitimamente até o redesenho daquela tela; não inventar dados nem posicionar a BottomNav acima da borda da tela.


## FIX1 — compatibilidade HEAD UX360 P0

Reconciliada após commit `8bcb770f4a3f81e9f36a1e2a15ab5a32147cf898` (medicamentos, densidade e criação contextual Android). A R4 modifica somente a classe CSS de cada `main` elegível, preservando o restante do arquivo de Medicamentos, e mantém a verificação por hash de todos os alvos. Nenhum dado clínico foi alterado.
