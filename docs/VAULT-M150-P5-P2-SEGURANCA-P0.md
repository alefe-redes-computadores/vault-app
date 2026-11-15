# VAULT M150 P5 P2 — Segurança clínica e fluxo P0 (fase 1)

**Base exata:** M150 P5 P1 `c2f05cf818892107d16a1e395f3e3474993289a3` publicada. Nenhum arquivo clínico é criado ou migrado, nenhuma dose é registrada automaticamente.

## O que mudou

- **A05:** Percepções deixa de exibir uma lista inespecífica de riscos farmacológicos como se fosse conclusão individual. O botão de salvar relato, eixos 0–10 e dado original permanecem.
- **A06:** reconhecimento explícito de tramadol / Tramal / cloridrato de tramadol em vocabulário fechado e triagem de interações **apenas quando há tomada confirmada** do mesmo proprietário/pessoa nas últimas 24h, com bula DailyMed revisada. Acompanhamento do uso SOS em conjunto com depressores do SNC ou substâncias serotoninérgicas é informativo; não diagnostica síndrome serotoninérgica, sedação nem intoxicação e não estabelece intervalo seguro. Não altera a classificação regulatória brasileira, a prescrição ou estoque.
- **A07:** prioridade administrativa de retirada/receita/estoque não se pinta como emergência clínica só por `urgency='alta'`. Somente evidência clínica independente, explicitamente fornecida pelo chamador, pode habilitar o tom crítico da apresentação operacional; alertas de segurança do Brain mantêm sua autoridade separada. O CTA operacional de detalhe também usa âmbar.
- **A30:** a projeção de ciclos temporários descarta entradas de outra data/pessoa; Cerumin de amanhã fica planejado no amanhã e não vira dose pendente hoje. Os logs originais não são alterados.
- **A01:** guarda específica na resolução de CTA clínico impede encaminhar ações de *receita/anexo de saúde* à rota do Cofre Pessoal; respeita receita canônica com ID quando existente e mantém pesquisa legítima de documentos pessoais.
- **A32:** guarda estática de ordem dos hooks e fluxo de ignorar por falta de estoque no modal. **NÃO declarar React #310 corrigido sem reproduzir e homologar a operação no APK atualizado**.

## Fontes regulatórias (não usadas para inferir receituário brasileiro)

- DailyMed, tramadol hydrochloride, versão de 03/11/2026: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ccb3e0f9-57db-40bc-84d2-b66a827a5b96 — alerta para depressores do SNC, interações serotoninérgicas e convulsões. Fonte para risco potencial, não para diagnosticar evento em indivíduo.

## Gate e limites

- Alterações de apresentação, projeções read-only e motor de triagem; sem criar nem atualizar `doseLogs`, estoque, receitas, Supabase, pessoas ou migrações.
- Gate dirigido P5 P2 + testes legados + **V63/V70/TypeScript agregado**, integração seletiva em branch candidata, sem push direto a `main`, sem build no Termux.
- Cenários de aceitação em APK: Hoje → Clonazepam → Vincular/preparar receita → documentos clínicos; Tramal SOS registrado e companheiros com registro dentro de 24h; dose planejada/ignorada não infla triagem; Cerumin amanhã 08h/18h só na agenda de amanhã; retirada vencida é alerta administrativo e não emergência clínica.
- **A32 permanece em aberto**: no APK, com dados de teste, repetir doses atrasadas/atuais + ignorar por falta de estoque + confirmar, alternar perfis e reabrir, sem perder registros. Teste de hooks de compilação não substitui reprodução React.
- A06 ainda depende de homologação de cobertura por substância/nome comercial e lista de classes brasileiras com fontes brasileiras; essa cirurgia não altera rótulos Anvisa.
