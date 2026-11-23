# VAULT 360 — Update 360 Premium | Entrega candidata Guardian

**Base obrigatória**: `94cf39fb99c00875b0c21f97dff75224e09cd6f9`. **Estado**: pacote preparado, sem instalação/commit/push/deploy, sem nova Release, sem SQL ou alteração clínica. O Guardian é responsável pela auditoria independente.

## 1. Diagnóstico causal

O Android usa M111 (`native/updates/VaultApkUpdaterPlugin.java`) para download, SHA-256, certificado da assinatura, packageId, versionCode, cache verificado, cancelamento, confirmação do instalador. O build Android gerava `Vault-App-debug` e passava gates; a release era opt-in `vars.VAULT_ALLOW_STRICT_ANDROID_RELEASE == 'true'`. No cenário real: instalado 2195, Action #2211 concluída e último APK distribuído 2195. A Central respeitava a ausência de release; a lacuna era distribuição autorizada e comunicação dos três estados, não ausência de instalador.

## 2. Autoridades preservadas, alterações seletivas

| Área | O que já existia | Intervenção selecionada |
|---|---|---|
| M111 | Plugin, cache, SHA, package, assinatura, cancelamento, permissão e instalador | **Sem alterações no Java**; CTA humano `Atualizar VAULT` |
| Releases | Registro estrito `vault-android-bN`, URL oficial e metadata | Não aceitar Actions temporários como release |
| Client | `fetch no-store`, verificação manual, installed `App.getInfo()` | Guardar última consulta confirmada *apenas informativa*; erro desabilita instalação |
| UI | Central, histórico e notificação opt-in | 3 estados visíveis, texto honesto; um diagnóstico técnico; histórico de até 100 releases com notas completas |
| CI | V63, TS, export, Gradle, certificado, assinatura estável | `build-android.yml` só compila; release transferida a workflow protegido após run concluída |
| Build antigo | APK 2211, `1.2.0`, SHA original | Promoção por `run_id` sem recompilação e sem mudar versão |
| Versionamento | três arquivos com `1.2.0`, changelog atrasado | preparar semver antes do próximo build, com backup; sem mudança da versão nesta cirurgia |

## 3. Fluxo protegido de distribuição

Arquivo `.github/workflows/promote-android-run.yml`: gatilho `workflow_run` somente após a Action de compilação terminar, ou `workflow_dispatch` com run_id e SHA originais. **O job só executa se** `vars.VAULT_ALLOW_STRICT_ANDROID_RELEASE` for `true`, usar Environment `vault-android-release` e `vars.VAULT_RELEASE_POLICY_READY` for `true`. O administrador **deve configurar** em GitHub → Settings → Environments: required reviewers, deployment branches `main`, revisão de branch protegida e aprovação humana. **Não habilitar essa variável nesta entrega.** `workflow_run` executa a versão do publicador presente na branch default; sua alteração também exige revisão e proteção do repositório.

O script `scripts/vault-android-release-policy.cjs` verifica run concluído/SUCCESS, workflow canônico, `head_sha`, branch, repo, provenance do ZIP, digest GitHub do ZIP e origens exatas. `scripts/vault-publish-verified-action.sh` recupera o ZIP original, compara o SHA-256 publicado por GitHub para o ZIP, extrai `app-debug.apk`, compara com a última Release o certificado **real**, confere keystore, `aapt` (`versionName` do package.json original; `versionCode` igual ao **run_number** original), `apksigner`, package ID e SHA-256 do APK. Recusa downgrade, expiração, tag já publicada, versão irregular, SHA desatualizado ou não autorizado. Apenas depois monta e publica `vault-android-b<run_number>` como asset `Vault-App.apk`. Sem recompilar e sem alteração retroativa de metadados do APK.

### Caso especial: run #2211

- `run_id`: `45219364674`; `build`: `2211`; SHA original: `94cf39fb99c00875b0c21f97dff75224e09cd6f9`.
- `versionName`: `1.2.0` sem tentativa de convertê-la para `1.3.0`; `versionCode`: `2211`.
- `Vault-App-debug` foi encontrado pela API GitHub na consulta de 23/11. Validade informada até 30/11/2026; **é preciso revalidar no momento da execução**.
- A futura promoção do 2211 só poderá ocorrer **após a publicação auditada deste workflow e autorização específica**. Se a main avançar, exige `allow_stale=true`, `approved_stale_sha` igual ao SHA original e aprovação do Environment; a assinatura/ancestralidade serão reavaliadas. Releases preexistentes não podem ser sobrescritas.
- Uma release sem assinatura/metadados históricos confiáveis bloqueia o fluxo. Não enfraquecer a prova em nome da rapidez.

## 4. Versões, README, CHANGELOG e UX

`node scripts/vault-prepare-version.cjs --check` audita os 3 manifestos; `--prepare 1.3.0 --kind minor --notes docs/VAULT-RELEASE-NOTES-SAMPLE.json` gera dry-run. Depois de revisar notas reais, `VAULT_VERSION_APPLY=SIM ... --apply` prepara a **próxima compilação** com backup, não faz commit, release ou build. PATCH = correção; MINOR = funcionalidade compatível; MAJOR = incompatível documentada. A versão atual deste pacote fica `1.2.0`, inclusive o APK 2211 já assinado.

`generate-vault-release-notes-v34.cjs` passa a usar o intervalo Git completo entre SHAs, sem `--max-count=40` ou `.slice(0,12)`. O resumo público prioriza notas humanas de versão preparadas no `CHANGELOG.md`; se não houver curadoria, informa a ausência sem inventar novidades. Todos os commits verificáveis ficam separados em **Detalhes técnicos** na release. Se o histórico Git faltar ou for incompatível, **bloqueia** em vez de inventar resumo. `CHANGELOG.md` recebe adendo identificado como **Não distribuído**, com estado das frentes. Os relatórios clínicos mestres continuam sendo governados pelo Guardian.

## 5. Fontes de evidência e gates

1. `python surgery.py --selftest` (estrutura do pacote, não é TypeScript).
2. `python surgery.py --fast-preflight --repo ~/projects/vault-app` confere HEAD/origin/main exatos, hashes Git de **todos** os arquivos alterados, stage e caminho novo não ocupado.
3. `python surgery.py --apply --repo ~/projects/vault-app` cria worktree isolado no HEAD-base, executa testes dirigidos e `npm run test:release` (V63 + V70 + TypeScript), instala somente a allowlist com backup, repete os gates no checkout real, gera log e resultado. Falhas bloqueiam e acionam rollback **seletivo com conferência de hash**. Não faz stage, commit, push, SQL, workflow_dispatch nem GitHub Release.
4. `test-vault-update360-premium.cjs` e `test-vault-version-governance.cjs` entram permanentemente no V63; total **561 contratos previstos**, condicionado aos gates reais.
5. Antes de liberar o workflow: Guardian revisa 2×2 de conta/pessoa, sistema M111 Android físico, assinatura real, release anterior, política e teste adversarial do script em cenário de API/integridade negadas. **Uma validação de texto não comprova execução remota nem instalação.**

## 6. Política de certificação

Separar **preparado → aprovado local → publicado Git → Action success → release distribuída → atualização Android física → homologado**. Um PWA `READY` não disponibiliza APK. Os segredos são exclusivos do Environment. Nenhuma atualização pode instalar silenciosamente. `workflow_run` automático deve ficar desabilitado pela variável até o Guardian aceitar o ciclo completo e autorizar a política contínua.

**STOP obrigatório**: alteração simultânea de qualquer blob, stage não vazio, SHA não reconciliado, verificação incompleta do artefato, falta de privacidade, assinatura divergente, API inacessível ou ambiente não protegido.
