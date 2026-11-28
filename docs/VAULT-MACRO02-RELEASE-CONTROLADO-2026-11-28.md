# Macro02 — checkpoint de release controlado — 28/11/2026

## Autoridade
Parecer independente Guardian APPROVED recebido do proprietário neste chat, com autorização expressa de integração da candidata 2b0103b71420c96b2d067dda2a56a4564d0abc8a, tree dac7806abe8cc2e98a0290ba74f6b7cf7ed37e96, sobre main 4d7010cf88e78bb31ef94c706a1102729662aab7.

## Ações realizadas
- Main atualizada por fast-forward não forçado com expected_sha 4d7010cf88e78bb31ef94c706a1102729662aab7. Main 2b0103b71420c96b2d067dda2a56a4564d0abc8a reconfirmada via GitHub e git fetch independente. Tree dac7806abe8cc2e98a0290ba74f6b7cf7ed37e96 conferida. Diferença .github/workflows, vercel.json, supabase/migrations = zero; git diff --check aprovado. Não integrar envelope lab.
- Vercel Production anterior READY: dpl_Gu6AyPuXWi5EPTw68fhs5aNCULrd, SHA 4d7010cf88e7. Deployment produtivo novo dpl_Ar97y5EVMh6aB4ujbZ9NZniAadpK, SHA 2b0103b71420; BUILDING na primeira conferência. https://vercel.com/alefe-redes-computadores-projects/vault-app/Ar97y5EVMh6aB4ujbZ9NZniAadpK
- APK oficial: run 46180002893, job 141087175983, versionCode previsto 2246. https://github.com/alefe-redes-computadores/vault-app/actions/runs/46180002893
- Último release observado: vault-android-b2244, v1.4.0, SHA 49c3aabde83bf0b2480a84bb5e967922e41975f2, APK SHA256 b0ef6a0cb3588b96b371ab5cf6f4be312abbf37aa334bc411b93b753112e4035, appId com.alefejohsefe.vault, cert SHA256 0ab0832dc5848fed53aef27a9a58259225d549b9488c20c998ba51ade2d5bed1. Promoção anterior 2245 (run 46178248845) aguardando ambiente protegido vault-android-release. Não aprovar SHA antigo; não usar allow_stale ou bypass.
- Workflow oficial build-android.yml usa keystore estável e github.run_number. Publicador promote-android-run.yml exige Environment protegido, valida ZIP, APK anterior, assinatura, packageId, versionCode, SHA e release imutável. Não alterar esses mecanismos.
- Supabase leitura agregada: um fence Legacy geração 0, sem epoch, zero active_accounts, zero claims, zero recibos. Nenhuma mutação SQL. Nenhuma migration reaplicada. A conta continua Legacy.

## Continuidade
Confirmar deployment Production READY e SHA. Confirmar conclusão da Action de compilação e logs da validação de assinatura/versionCode. Localizar promoção oficial para o run 46180002893, verificar SHA da origem, esperar/requerer approval pelo revisor do Environment protegido (se necessário); não desabilitar proteção, não publicar APK manual por fora do gate. O conector GitHub não oferece aprovação de deployments de environment e gh auth status no sandbox não está autenticado. Consultar release latest e confirmar SHA, tag, build superior, certificado, appId, hash e digest do asset antes de orientar atualização.

Somente após release verificado: atualizar APK sobre instalação existente, sem desinstalar/limpar dados. Central de segurança > Preparar Central Premium, confirmar demais aparelhos sincronizados e fora de uso. Aguardar mensagem de cópia privada persistida e conferida, operação e SHA-256. Preservar dados; nenhum congelamento até validação real da preparação. Recovery claim/recibo e ativação somente com evidência real, via autoridades canônicas; sem dose fictícia e sem modificar estoque artificialmente. A homologação física e a ativação ainda não ocorreram.
