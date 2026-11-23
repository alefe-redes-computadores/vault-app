# VAULT Guardian³ — G2-01/G2-03 pós-A10 Integral

## Autoridade, base e escopo
- Git HEAD obrigatório: `2a950bd1415be7182275e4c9194bac492f01a830`.
- A10 Integral REBASE1 já aplicada e aprovada localmente; o instalador exige o recibo `A10-0d95d5212a/RESULTADO.json` e reconstrói, a partir de `git show HEAD`, todos os 22 arquivos finais da A10 para conferir seus hashes antes de modificar qualquer arquivo.
- 3 arquivos existentes alterados: `scripts/test-v63-release-gate.mjs`, `components/saude/RehabRecurringPlannerA7M5.tsx`, `components/saude/ClinicalRecordFinderA7M5.tsx`.
- 3 arquivos novos: função pura de pluralização, teste dirigido clínico e este relatório. Total: 6 caminhos.
- **Nenhuma migração, SQL, alteração de writer, tabela, RLS, sync, marcação de presença ou prescrição.**

## G2-01: regressão clínica permanente
O V63 publicado possuía 554 testes antes da A10, 555 depois da A10. O único teste incluído no array V63 por esta microcirurgia é `scripts/test-vault-guardian-ga01-gp2-clinical.cjs`, levando a **556 contratos**. O teste G2 adicional é executado como dirigido e não integra o array para não criar um 557º contrato não autorizado. Os dois V70 continuam presentes e são executados tanto pelo V63 quanto como pós-confirmação isolada.

O contrato Guardian GA-01/GP2 só é considerado **executado de verdade** quando o log do processo exibe `VAULT_GUARDIAN_GA01_GP2_CLINICO_OK`. A presença textual no gate isoladamente não basta. O teste verifica SHA-256 do SQL histórico (sem executar SQL), locks e feedback A8/M5, relações A9 e ausência de DDL de UI.

## G2-03: português humano e UI
- Contador pt-BR puro e tipado para `sessão/sessões`, `horário/horários`, `registro/registros`, `data/datas` com casos 0, 1 e N.
- Toast de criação e datas pré-existentes, resumo de horários e CTA da agenda, contador de busca. Concordância verbal e nominal para singular/plural.
- Preservados alvos de pelo menos 44px, Lucide, seletor paginado, retorno e feedback existentes.

## Recorrência M5 — prova adversarial sem alteração
O teste G2 carrega a função **real** `lib/rehab-m5/recurrence-a7m5.ts` em ambiente hermético com Dexie/autoridade de sessão simulados. Verifica criação, reexecução local sem duplicar, falha parcial com sucesso anterior preservado e dois clientes independentes agendando o mesmo horário antes de se sincronizar. Esse último caso é uma **lacuna A11 de idempotência entre dispositivos**, não um bug remoto corrigido.

## Gates finais e publicação
- Candidata isolada = `git archive HEAD` + **exatamente** as 22 alterações A10 conferidas + os seis arquivos da microcirurgia; `node_modules` referenciado sem instalar na rede.
- `test-vault-a10-integral-360.cjs`, `test-vault-ga02-ga07-guardian.cjs`, `test-vault-guardian3-g2-clinico.cjs`, `test-vault-guardian-ga01-gp2-clinical.cjs`, TypeScript integral, V63 556 (`VAULT_V63_COLLECT_ALL=1`), V70 super integrity e V70 final completeness, `git diff --check`.
- O V63 completo é executado **uma vez na candidata final**, não novamente no pós; o pós verifica SHA exato dos arquivos instalados + TypeScript + testes dirigidos + V70 duplo. Em falha antes de aplicar nada muda; após aplicar, rollback **somente** dos seis caminhos G2 preserva toda a A10.
- Nenhum Git stage/add/commit/push. Nenhum comando Supabase. Nenhum SQL.
- Publicação seletiva conjunta A10 + G2 apenas após o Guardian receber diff e logs e autorizar. Mesmo após gate verde, Android físico A11 e testes reais RLS 2×2/multiaparelho permanecem pendentes.

## Responsáveis não tocados
G2-02 Exames e GP2 residuais: frente Work; Vercel OOM: frente de build; A11: QA Android e concorrência real. Não usar aprovação G2 para marcar esses pontos como fechados.
