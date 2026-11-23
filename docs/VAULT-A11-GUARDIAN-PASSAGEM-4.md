# VAULT A11 — Dossiê técnico para Guardian (passagem pós-A10 / Guardian³)

**Base de revisão:** f393b06e317b0c2d722b77275d108038679529e2. **Candidata:** A11 MACRO1. **Regras permanentes:** nenhum dado clínico real, SQL, writer/queue alternativa, alteração de Storage/bucket, git add/push ou release sem aprovação separada.

## Provar na candidata

1. `git diff --check` sem alertas; comparar HEAD/remote e 2 blobs editados exatamente; allowlist dos novos arquivos sem colisão.
2. V63 atual tem 556 contratos, somar apenas `test-vault-a11-integral-360.cjs` = **557**. Confirmar que GA-01, GA-02–GA-07, A10 e V70 duplo permanecem. Não tolerar falha sob `VAULT_V63_COLLECT_ALL=1`.
3. TypeScript integral no checkout isolado e depois da instalação; módulos novos puros passam TS estrito. TSX sintático e mobile 320–430/TalkBack devem ser auditados no APK.
4. Conferir `lib/a11/local-snapshot.ts`: somente SELECT Dexie filtrado por proprietário e pessoa; revalida scope após awaits, não retorna payload. `app/diagnostico/a11/page.tsx` invalida estado em troca de conta/pessoa e não envia relatório automaticamente.
5. Oracle de paridade: 2 contas×2 pessoas sintéticas; collision/tombstone/ausência de dados remotos bloqueiam selo. Recorrência M5 não foi alterada e continua sem garantia de unicidade global.
6. RLS 2×2 script é **read-only** e usa contas/fixtures fictícias e chaves públicas, nunca `service_role`. Sem fixtures deve falhar fechado. Teste de bucket privado com conta B é outra prova obrigatória; não confundir RLS `storage.objects` com acesso `/public/`.
7. Compatibilidade de Storage: classificador puro sem leitura de bytes; quatro buckets públicos mantidos **por pendência** e não declarados privados. Qualquer cutover requer artefato separado e prova offline.
8. Android: coleta de viewport/reduced motion somente por gesto; zero WebGL/RAF novos, zero alertas nativos disparados; via checklist não se pode obter status `certified`.
9. Vercel `ERROR out_of_memory` para SHA f393b06 e anteriores: não declarar READY. `a11-build-oom-diagnose` identifica sintoma, não fornece causa ou deploy.
10. `a11-certification-gate`: faltas/etapas duplicadas/fonte errada/SHA divergente => STOP; mesmo com estrutura OK, referência precisa ser conferida pelo Guardian independente.

## Provas não produzidas nesta cirurgia

- RLS JWT real e bucket privado 2×2, instalação física APK, concorrência de dois dispositivos, comportamento Doze, GPU/Fênix/energia, biometria e PWA READY. Não chamar nenhum desses de aprovado.
- Alteração de política RLS, migração SQL, tabela Dexie, versão do APK ou movimento de bytes antigos: **não efetuados**.

## Decisão do Guardian solicitada

- **GO de código** somente após recibo `A11_INTEGRAL_360_APPROVED_LOCAL` e inspeção de diff/hashes.
- **STOP de certificação Android/PWA** até matriz de ensaios e Vercel READY no mesmo SHA.
- Em caso de conflito com Work, rebase por arquivo e SHA completo, nunca rebase cego/force push.
