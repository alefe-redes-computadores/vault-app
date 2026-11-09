# VAULT M103 P3 — Sincronização, contas e continuidade offline

**Base:** `f5dc972e372d1fabebdbd4f1dddc5453e47dee28` (M103 P2).

## Mudanças auditáveis

1. `lib/sync/runtime-status.ts`: o carimbo de última sincronização usa armazenamento limitado ao proprietário da sessão. O carimbo legado global permanece intacto, porém não serve mais de evidência de sincronização atribuível a uma conta. Troca de conta limpa a apresentação de sucesso e restaura somente o carimbo daquela conta. Resultados tardios de sync manual recebem contexto de dono e não podem marcar sincronização de outra conta.
2. `components/Providers.tsx`: troca de conta atualiza a autoridade visual de sync. Respostas atrasadas do pull de um proprietário antigo não atualizam o estado da nova conta; alerta visual de pull demorado também verifica proprietário.
3. `lib/sync/manual-sync.ts`: chamada explícita repetida da mesma conta compartilha a promessa em andamento, sem duplicar pull/push. Enquanto houver uma operação manual ativa, outra conta não pode reutilizar o resultado. Ao concluir ou falhar, a trava é liberada.
4. `app/diagnostico/page.tsx` e `app/recuperacao/page.tsx`: pull manual urgente coordenado com o pull de boot. A interface só afirma "Sincronização concluída" quando a fase realmente terminou em `synced`, e distingue fila não vazia, erro parcial de leitura, atividade atual, offline e ausência de conferência.
5. `components/SyncStatusIndicator.tsx`: estado `idle` nunca cai no selo verde apenas por haver um carimbo de uma sincronização histórica.
6. Novo projetor puro `lib/sync/presentation-m103.ts`, com decisões determinísticas sem acessar banco, rede ou estado clínico.

## Não alterado

- Dados de DoseLog, estoque, documentos, fila Dexie, RLS, migrations, notificações e alarmes nativos.
- Política de backoff e retry persistente V310; pull+push existentes continuam sendo as autoridades dos dados.
- Não há envio automático de dados a terceiros, reimportação ou exclusão.
- O runtime do APK continua sujeito a validação em dispositivo físico, reconexão real, sessão e bateria; esta cirurgia **não equivale a homologação Android/PWA**.

## Gates de aceitação

`tsc --noEmit`, teste hermético P3, V179, M52, M53, V56, V63, V91, M66, P2/P1 preservadas, `npm run test:release`, `git diff --check` e stage de exatamente dez arquivos. Publicação sem `--force` apenas após aprovação.
