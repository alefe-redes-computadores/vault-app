# VAULT A11 — Matriz de homologação física e independente

**Corte documental:** 22/11/2026, base Git f393b06. **Estado inicial:** todos os itens físicos abaixo são `NOT_TESTED`; a aprovação de scripts herméticos não altera esse estado. A coleta nunca deve incluir identificação ou bytes de pacientes reais.

## A. Identidade e RLS 2×2

| ID | Ensaio exigido | STOP quando |
|---|---|---|
| SEC-01 | Login A; pessoa A1; ler fixture própria | Falta fixture ou erro não explicado |
| SEC-02 | Login A; pessoa A2; filtros e PDF não mostram A1 | Dado de A1 aparece durante troca |
| SEC-03 | Login B não encontra fixture A1/A2 em SELECT | Retorna linha/erro permissivo |
| SEC-04 | Login A não encontra fixture B1/B2 em SELECT | Retorna linha/erro permissivo |
| SEC-05 | Pesquisa A10 pendente troca A1→A2 | Resultado A1 aparece após troca |
| SEC-06 | Brain e PharmaLens com OCR em voo, troca de pessoa | Resultado anterior reaparece |
| SEC-07 | Modo Médico/PDF em geração na troca A→B | PDF anterior pode ser salvo/compartilhado |
| SEC-08 | Logout + login B, cache Dexie e sync queue | Estado A visível ao B |
| SEC-09 | Storage M3 privado: objeto fictício do dono | Não carrega para o titular |
| SEC-10 | Storage M3 privado: acesso cruzado e revogado | Não titular acessa bytes |
| SEC-11 | Buckets públicos legados: link fixo de teste | Risco não mapeado/sem plano de compatibilidade |

## B. Sincronização e concorrência entre aparelhos

| ID | Ensaio exigido | STOP quando |
|---|---|---|
| SYNC-01 | A offline registra dose; B online; A volta | Registro perdido/duplicado |
| SYNC-02 | B edita mesmo registro enquanto A offline | Conflito silencioso e dados perdidos |
| SYNC-03 | A agenda M5 e B agenda slot igual sem pull | Duplicata remota não tratada |
| SYNC-04 | A cria e B exclui/tombstone, depois troca ordem | Registro ressurge sem confirmação |
| SYNC-05 | Reiniciar A com fila com falha e backoff | Fila se perde ou falso sincronizado |
| SYNC-06 | Internet cai durante pull de documentos | Ausência remota vira lista vazia |
| SYNC-07 | Idempotência ao repetir push após timeout | Evento duplicado |
| SYNC-08 | Mudar conta durante pull/push | Resultado da conta anterior é exibido |
| SYNC-09 | Fuso horário e DST na agenda M5 e DoseLogs | Dia civil muda indevidamente |
| SYNC-10 | Restauração do APK com arquivo e fila legados | Documento inacessível sem plano |
| SYNC-11 | Reconciliação de A5, A7, A8, A9 e M5 | Vínculo por ID rompe sem feedback |
| SYNC-12 | A10 resumo vs Modo Médico vs PDF | Qualquer diferença factual não declarada |

## C. Android, UX, acessibilidade e energia

| ID | Ensaio exigido | STOP quando |
|---|---|---|
| AND-01 | 320 dp; teclado aberto; clique e Voltar | Conteúdo ou CTA oculto |
| AND-02 | 360 dp, 390 dp, 412 dp, 430 dp | Cortes, sobreposição, rolagem travada |
| AND-03 | TalkBack percorre ícones e estados | Alvo sem descrição/ícone ausente |
| AND-04 | Fonte ampliada (200%) e modo compacto | Evidência truncada |
| AND-05 | Gesture back / return_to na A10 | Perda de filtro e posição |
| AND-06 | Fênix reduced motion, troca para 2D | GPU continua em loop oculto |
| AND-07 | Fênix em segundo plano/Doze | Bateria/CPU fora do orçamento medido |
| AND-08 | Health Connect: permissões negadas/parciais | Dados indevidos importados |
| AND-09 | Notificações negadas, opt-in e Quiet Hours | Mensagem de envio falso |
| AND-10 | Reinício/Doze/alarmes/expiração | Notificação perdida sem estado honesto |
| AND-11 | Biometria cancelada, timeout e logout | Acesso cruzado persistente |
| AND-12 | Update 360: versão anterior → nova assinada | Assinatura/versionCode incoerentes |

## D. CI, PWA e entrega

| ID | Ensaio exigido | STOP quando |
|---|---|---|
| REL-01 | Git HEAD/`origin/main`/payload SHA igual | Avanço de branch ou colisão |
| REL-02 | V63 estrito 557 + TS + V70 | Falha ou contrato omitido |
| REL-03 | `git diff --check`, payload fechado | Whitespace, staged fora allowlist |
| REL-04 | CI Android run no SHA aprovado | Falha, artefato de SHA diferente |
| REL-05 | APK real instalado em pelo menos dois aparelhos | Só CI/binary e nenhuma prova física |
| REL-06 | Vercel READY no mesmo SHA | OOM/SIGKILL/ERROR/BUILDING |
| REL-07 | PWA/OOM reproduzido e diagnosticado | Suposta correção sem comparação de RSS |
| REL-08 | Guardian independente revisar recibos/diffs | Parecer pendente ou gate afrouxado |

## Protocolo de evidência

Para cada item: ID, SHA exato, ambiente (modelo/OS sem números de série), resultado, redacted screenshot/log, data/fuso e observação. Nunca anexar credenciais, PDFs clínicos, URLs assinadas, service_role ou conteúdo de pacientes. Comparar pelo mesmo SHA antes de promover release. **A11 não recebe selo `CERTIFIED` só por aprovação local de código.**
