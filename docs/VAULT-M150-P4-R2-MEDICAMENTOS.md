# VAULT M150 P4 R2 — Correções de lista e autoridade operacional

Base fixa: `de261bbb35aca5c0bfc6113cf2a797393345817f` (P4 R1 publicada).

## Entrega
- Abertura da retirada exige correspondência do `id` do detalhe sugerido pelo Brain com a retirada realmente **agendada** do mesmo medicamento, conta e pessoa ativa, indexada no estado local.
- Retirada inexistente/encerrada não recebe CTA de detalhe de Brain desatualizado. Planejar nova retirada possui rótulo distinto de abrir retirada agendada.
- Se existir um segundo agendamento `agendada` no banco, ele permanece visível. A cirurgia não declara deduplicação nem conclui registros automaticamente; verificar no detalhe se há duplicidade histórica ou fila offline pendente.
- Apenas uma insígnia visual colorida de laboratório por card, com ícone `Factory` para última aquisição e `Tag` para etiqueta declarada. Dados e origens distintas continuam no `title`/`aria-label`, sem equiparar fabricante ao estoque físico atual.
- `PRISTIO` permanece na base; só a apresentação é corrigida se o catálogo confirmar a marca **Pristiq** (não apenas o princípio ativo). Não há reescrita clínica ou alteração de dose.

## Gate e segurança
- Pré-voo SHA e blobs, worktree isolada, backup, allowlist, testes P3/P4/novos e gate integral V63 + V70 + TypeScript.
- O instalador só envia uma candidata `vault/fastlane/*` se o gate local passar. Fast Lane GitHub precede qualquer publicação main. APK e homologação Android permanecem etapas separadas.
- Nenhuma mutação em Supabase, Dexie, estoque, doses, retiradas, receitas ou históricos.

## Cenários Android
1. Metadona: retirada realizada → sem botão para abrir aquele detalhe encerrado. Se houver outro agendamento real, ele aparece e deve ser conferido no histórico.
2. Metadona: retirada realmente agendada → abre a retirada correta e volta ao cartão de origem.
3. Card Eurofarma, Cristália, EMS e laboratório desconhecido: selo colorido único, fabricante com origem declarada diferenciada e legível em 320–430px.
4. PRISTIO / PRYSTIQ: conferir nome de cadastro e ingrediente, sem modificar evento histórico.
