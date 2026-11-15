# VAULT M153 P5 — Macrocirurgia Pós-Vídeo 360

**Base exata:** `9b7935eb3327678c1b323a1e7b489c0a8c0959ff` (M153 P4). **Sem SQL e sem alterações de dados clínicos.**

## O que o pacote modifica

- **#1 Home (duplicações):** impedida a segunda CTA de Continuidade quando `actionHref` aponta para o mesmo ID de retirada já visível na Agenda. Atenção de outra natureza (estoque, receita, segurança clínica) preservada. A deduplicação antiga por alerta/agenda permanece.
- **#2 Contadores:** distinção explícita entre `Atrasadas` (Home) e pendentes do dia; no Medicamentos, rótulo indica contínuos/temporários com horários e exclusão de SOS. Home já distinguia contínuos; NÃO se fingiu uniformidade de denominadores distintos. Reconciliação aritmética completa Home/Hoje ainda requer E2E de projeção real e não é selada por este pacote.
- **#3 Cards:** modo compacto sem altura mínima fixa de 172px; status/estoque e ação principal inline, ações secundárias acessíveis no modo Conforto e nas telas de detalhes. Mantidas proveniência, tarja e alerts; princípio ativo completo nos detalhes.
- **#4 Ordenação:** módulo puro `medication-pending-priority-p5.ts`, próxima dose efetivamente pendente em ordem cronológica, doses resolvidas depois, SOS separado, grupo `Próximas doses de hoje` aberto e **sem paginação**. Doses ignoradas não contam como pendentes pela hora resolvida.
- **#5 Navegação:** BottomNav permanece em `/saude/*/detalhes` de consulta/visão, sem liberar formulários `novo`, `editar` ou `nova`.
- **#6 Mais:** a Central de Atualizações mantém status, busca e fluxo nativo; release, Actions, checksum, histórico e diagnósticos ficam em `<details>` fechado por padrão.
- **#7 Home:** panorama de rotina/agenda sobe para junto do Hero e abre por padrão; deixa de ficar depois de Brain e alertas.
- **#8 Receita:** DocumentViewer da Galeria mostra PDF embutido com scroll e zoom suportados pelo navegador, oferecendo abertura externa como fallback. Imagens continuam usando `object-contain` e zoom/pan já existentes. Fluxos específicos de anexo de Saúde continuam sujeitos a homologação.
- **#9 Quantidade atípica:** tira cabeçalho e ícone duplicados do card, adiciona atalho para os detalhes/bula do medicamento (P4) quando identidade de medicamento é conhecida e acesso ao Plano de Segurança. Mantém a heurística cadastral separada dos limites regulatórios; não calcula uma dose em mg sem prova de apresentação e tomada.
- **Refino:** `1 dia` e respiro inferior dos dois sheets de explicação. Contratos históricos de expectativa visual P4 R3/P5 P4 atualizados sem desativar os demais.

## Critério de publicação

1. Instalação hermética sobre worktree isolada, hashes de blobs e âncoras; nenhum `git add -A`, reset hard, clean nem force.
2. Testes novos `test-vault-m153-p5-post-video.cjs` + `git diff --check`, TypeScript e V63/V70 históricos.
3. Após sucesso, apenas **branch candidata remota**, com `SHA` e `BRANCH` no log. Conferir CI e Vercel nesse SHA antes de promover `main` com comando guardado separado.
4. Gerar/instalar APK do SHA final para homologar cenários do vídeo: Cerumin 16h, Donaren 22h, BUP/Pristiq/Venvanse concluídos; Home, Mais, PDF, detalhes, Back Android, acessibilidade e UI mobile.

**Estado inicial:** pacote preparado, NÃO executado no ambiente Termux e NÃO homologado no Android.


## FIX1 — Âncoras de indentação
Ajustados dois alvos estáticos de `app/saude/medicamentos/page.tsx`: linha do `min-h-[172px]` e rótulo `Ordem por horário`. Na P4 ambos têm 10 espaços de recuo. Conferidas as demais âncoras estáticas na base SHA 9b7935eb. Nenhuma regra de negócio alterada pelo FIX1.
