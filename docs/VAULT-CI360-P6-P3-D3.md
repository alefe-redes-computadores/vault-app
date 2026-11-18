# VAULT CI360 — P6 P3-D3 | Brain 360 & Cartão de Retorno

## Autoridade e limites

- Integra P6 P4-A já publicada; não substitui o motor de episódios e não duplica seu cartão na Home.
- O Brain **não** muda prescrições, horários, dose, estoque, retirada, diagnóstico, status de exame ou registros históricos.
- No máximo um cartão contextual de consulta na Home. Quando o fato que motivou o convite já foi registrado no próprio dia, o Brain não repete a pergunta. Dispensar permanece apenas na sessão visual (sem novo banco de concordância).
- O Cartão de Retorno é uma projeção de leitura sobre o episódio construído por IDs, conta e pessoa verificados na P4-A. Fatos novos são amostra limitada ao recorte; status desconhecido não vira pendência presumida.
- As seções separam: **fatos documentados**, **itens para conferir** e **perguntas sugeridas**. As perguntas são roteiro para o usuário, sem prescrição.
- Fatos têm data, origem e atalho à fonte. O resumo usa o limite existente de 30 registros; o modo detalhado permanece disponível. Copiar texto requer clique explícito. PDF existente do episódio continua manual e privado.
- Ações preservam o ID de consulta no CareFlow Sintomas, Exames e novo medicamento (D2), com revisão antes de salvar.
- Nada é exportado ou enviado a terceiros automaticamente.

## Escopo entregue

1. `lib/m3/brain-return-d3.ts`: projeções puras, ação deduplicada e retorno contextual.
2. `components/saude/BrainReturnCardD3.tsx`: cartão premium legível, responsivo e com cópia consentida.
3. `app/saude/careflow/episodios/page.tsx`: uma única ação Brain e cartão no episódio; atalhos vinculados.
4. `components/home/ClinicalEpisodePulseP4.tsx`: reaproveitamento do Brain P4-A, supressão de repetição no próprio dia e navegação contextual.
5. `scripts/test-v63-release-gate.mjs`: contrato D3 registrado uma vez.
6. `scripts/test-vault-ci360-p6-p3-d3.cjs`: isolamento de fontes, ausência de mutações, datas, links internos, teste de import e JSX.

## Não incluído

- Uma nova base de check-ins ou notificações. Há autoridade Brain/Notificações compartilhada com a frente P3-C; não criar concorrência e não chamar sugestão de registro.
- Interpretação automática de evolução, risco, causalidade, resposta terapêutica, febre, pressão, adesão ou exames realizados.
- Novo PDF independente. O PDF do episódio já existe e continua revisável; o cartão pode ser mostrado no celular ou copiado manualmente.
- Mudanças em medicação, Metadona, Fênix/Avatar, banco Supabase e política RLS.

## Homologação Android real

Verificar: troca de pessoa, conta e consulta; Home em dia com e sem novo sintoma; links preservando `consulta`; cartão e detalhamento 320/360/393/430 px; clipboard manual; PDF do episódio; dados offline em cache. Testes sintéticos/verificação de TypeScript não são homologação física.
