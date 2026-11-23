# A11 — Provas externas obrigatórias (sem dados clínicos reais)

## RLS autenticada 2×2

Use **duas contas de teste independentes**, cada uma com **duas pessoas fictícias** e uma dose fictícia atribuída a cada pessoa. Os IDs precisam existir; resultado vazio para o proprietário nunca conta como aprovação.

Rode `node scripts/a11-rls-2x2-readonly.mjs` em ambiente controlado, exportando por meio seguro (NÃO cole credenciais no chat ou no relatório) as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VAULT_A11_A_EMAIL`, `VAULT_A11_A_PASSWORD`, `VAULT_A11_B_EMAIL`, `VAULT_A11_B_PASSWORD`, `VAULT_A11_A1_PERSON`, `VAULT_A11_A2_PERSON`, `VAULT_A11_B1_PERSON`, `VAULT_A11_B2_PERSON`, `VAULT_A11_A1_DOSE`, `VAULT_A11_A2_DOSE`, `VAULT_A11_B1_DOSE`, `VAULT_A11_B2_DOSE`.

Esse teste executa apenas SELECT autenticado e sign-in/out local. Ele não semeia fixtures, não altera RLS, não modifica dados e não usa `service_role`. Verifica acesso do proprietário, negação entre contas e filtro por pessoa dentro da mesma conta. **Não considera RLS por pessoa dentro da mesma conta como uma política implícita**.

## Storage real

Usar 2 arquivos **fictícios** nos buckets relevantes e testar obtenção pelo não titular sem URL compartilhada. Não enviar URLs clínicas reais para o relatório. Bucket `public=true` permite URL pública mesmo com política restritiva de LIST/SELECT; esse comportamento exige migração compatível, não fechamento imediato. Testar ainda assinatura temporária, expiração, cache antigo e links legados no APK.

## Dois aparelhos

Aparelhos A/B com mesma conta e pessoa: offline, reinício, fila, conflito com mesma chave, exclusão/tombstone, recuperação, batelada M5 simultânea, Health Connect e notificações. Repetir com troca de pessoa/conta durante importação, visualização, PDF e upload. Registrar resultado por passo e SHA, nunca nomes/doses reais.

## Certificação Android, PWA e Guardian

A matriz exige evidências autenticadas/externas e CI do mesmo SHA. `node scripts/a11-certification-gate.cjs evidencia-a11.json SHA40` **só valida a estrutura das provas**: não valida a autenticidade das capturas. Guardian deve verificar manualmente artefatos, URLs e segurança antes do release. Nenhum script faz deploy, release, SQL ou build de APK por conta própria.
