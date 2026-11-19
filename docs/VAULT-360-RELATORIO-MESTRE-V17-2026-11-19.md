# VAULT 360 — Relatório Mestre V17 | IA 2.0 P5 / QG3

**Data de corte:** 19/11/2026. **Fonte-base obrigatória:** Relatório Mestre V16 completo (60 páginas), que incorpora a V15 de 56 páginas com V14 e V7–V13. Este documento é um suplemento; não revoga nem reescreve o histórico técnico.

## 1. Evidência atualizada do GitHub

- `475ae0a018b9c2982143e7589850b248931d058f` — **IA 2.0 P4 Home Viva, Hub Saúde e Fênix dedicada: publicada na `main`** em 19/11/2026. A publicação foi conferida no GitHub. Homologação visual PWA/APK permanece independente.
- `3911651363cf072681a1d9356b81cdf92111f48b` — UX360 R4 de vídeo, medicamentos e parser conservador: publicada antes da P4.
- `6de148175287ee1a456a8357a174a3f24217751d` — D4 P5: início planejado e conferência segura, publicada.
- **IA 2.0 P5/QG3 R1:** candidata desta entrega; não presumir diagnóstico V63 real, aprovação local, push ou atualização de APK.
- Referências de commit são fotografias históricas. Sempre confirmar HEAD antes do próximo passo.

## 2. Prioridade lida do relatório fonte

A V15/V16 define **P0 de UX/Android**: homologar a arquitetura de cinco abas e as famílias A01–A25 no aparelho, corrigindo densidade, toque, títulos, retorno, continuidade e não duplicando hubs. As sete correções extras da UX360 R4 cobrem filtros duplicados, compacto, +1, embalagens, altura dos atalhos da Home, continuidade duplicada e foco sem ícone; nenhuma autoriza mutação de dados.

| Família | Achados | Critério permanente | Situação neste corte |
|---|---|---|---|
| B1 | A01–A05 | Linguagem humana, horários, datas DD/MM/AAAA, ícones, Back/teclado/modal | Código histórico; aceite Android pendente |
| B2 | A06–A10 | Sintomas sem duplicação, feedback, gráfico por tipo, dossiê relacional | Código histórico; aceite Android pendente |
| B3 | A11–A15 | Exames vinculados, itens individuais, anexos, pressão isolada, PDF A4 | Código histórico; aceite Android pendente |
| B4 | A16–A20 | Medicamentos Compacto/Conforto, filtros, PillStudio, +1 e cinco abas da gaveta | R4 publicada; aceite Android pendente |
| B5 | A21–A25 | Home, Mais, Explorar, CareFlow com barra, limpeza de texto | P4 publicada; acabamento P5 candidato; aceite Android pendente |

## 3. IA 2.0 P5 — entrega proposta

- **Hoje**: rail acessível e compacto (Doses/Agenda/Diário) com âncoras existentes, haptics e redução de movimento. Não cria tarefas, chamadas clínico-canonicas nem doses.
- **Documentos**: cabeçalho menor, filtros flutuantes com controle e foco devolvido, uma coluna até 479px, funções de busca/galeria/grade/PDF preservadas.
- **Mais**: organização compacta, texto de preferências 11px, fim de página protegido contra barra Android, sem alterar sync nem conta.
- **BottomNav**: contraste e foco melhorados mantendo cinco abas e exclusividade do FAB contextual.
- **QG3**: testes novos, fixtures negativas, regressão V31/R4/P4, V63 `.cjs` e `.mjs`, V70, TypeScript e diff antes de aprovação. O dispositivo continua obrigatório para homologar layout.

## 4. Estratégia de aplicação e publicação

Baseline imutável `475ae0a018b9`; pacote com **6 modificados e 4 novos**, ZIP e Base64. Nenhum arquivo de P4 original pode ser sobrescrito se HEAD ou Git blob mudou. O diagnóstico global roda uma vez em clone; pós-gate global uma vez no checkout real. Erros ficam acumulados em logs e ZIP privado. A aprovação local não cria commit/push; publicador faz stage estritamente na allowlist. Se o HEAD avançar por outro chat, abortar/reconciliar.

## 5. Fronteiras clínicas e frentes seguintes

- D4 mantém autoridade temporal, observado versus previsto, idempotência, consentimento e auditoria nativa read-only. Não confundir presença na fila de notificações com entrega real.
- PharmaLens, ANVISA e catálogo precisam de identidade exata e revisão privada antes de qualquer promoção. P4-E regulatória não está autorizada a mudar banco automaticamente.
- PDF A4 seletivo, E2E offline dois aparelhos, notificações Android com permissão e reboot e refinamento Fênix Studio/GPU são frentes futuras e requerem teste próprio.
- Nenhum evento fictício, dose retroativa, ajuste de medicamento, estoque ou prescrição pode ser criado por navegação/visual.

## 6. Protocolo de retomada

Confirmar GitHub/Termux: `git log -1 --oneline`, `git status --short`, `git rev-list --left-right --count HEAD...origin/main`, relatório de diagnóstico, código alterado e marcadores de aprovação. Fazer revisão visual física nas telas 320–430dp e auditável no APK. Não marcar “homologado” apenas porque compilou. Preservar V16/V15 integrais no PDF V17 entregue separadamente.
