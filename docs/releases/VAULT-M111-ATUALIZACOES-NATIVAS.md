# VAULT M111 — Central de Atualizações Nativas Premium

Base certificada: `4c84e6002642945ec84f3aeec34cbcb354d6a044` (M110). Cirurgia de código **sem commit, push ou deploy automáticos**.

## Auditoria do VAULT (10/11/2026)

- Next.js 14 / React 18 / Capacitor 6. App Android `com.alefejohsefe.vault`, `capacitor.config.json`, `webDir=out`. `android/` é gerado no GitHub Actions, não rastreado no repositório.
- `.github/workflows/build-android.yml`: `npm ci`, gate V63, export, `cap add/sync`, integração Health Connect, edge-to-edge, alarmes M99, restauração do keystore permanente `VAULT_DEBUG_KEYSTORE_BASE64`, assinatura `vaultStableDebug`, verificação via `apksigner` + `aapt`, upload de artefato e `gh release create` somente após testes e build bem-sucedidos.
- As releases são nomeadas `vault-android-b<run_number>` e contêm `Vault-App.apk`, `VAULT_VERSION`, `VAULT_BUILD`, `VAULT_COMMIT`, `VAULT_APK_SHA256`. A M111 adiciona `VAULT_APP_ID` e `VAULT_CERT_SHA256` derivado do certificado assinado, sem alterar o keystore.
- A Central existente já consulta releases certificadas em `lib/updates/client.ts` e `release-registry.ts`, distinguindo PWA/APK, status do CI e download manual. A M111 preserva o fallback.
- Repositório Finance R464 consultado como referência da arquitetura (Java, FileProvider, SHA256, consentimento); **não** se reutilizam IDs, URLs ou materiais de assinatura do Finance.

## Fluxo implementado

1. A Action termina verificações de release, Android, certificado e APK antes de criar a Release. Falhas não geram nova Release.
2. A interface reconhece apenas uma release não-draft, não-prerelease, do repositório VAULT, com nome de asset fixo e hash/versão/build/commit coerentes. Releases antigas podem ser mostradas, mas não oferecem atualização nativa sem os metadados M111.
3. O novo bridge existe apenas no APK com M111 e só aceita `build`, tamanho, versão, hash SHA-256, `appId` VAULT e certificado esperado. A URL HTTPS é construída **no Java**, com redirects limitados a hosts GitHub autorizados, não aceita URLs arbitrárias do JS.
4. Download via `HttpURLConnection` em `getCacheDir()/vault-apk-updates` (sem permissão de armazenamento externo). Progresso nativo emitido para React. Cancelamento, timeouts e arquivos parciais têm limpeza e erro recuperável: tentar novamente inicia download limpo.
5. Antes de autorizar a instalação, checa hash, tamanho, `packageName`, `versionCode` maior que o instalado, `versionName`, certificados do APK instalado e do arquivo baixado **e** SHA-256 do certificado informado pela Release. Abertura via `FileProvider` restrito e não exportado, com grant temporário de leitura. O Android exige permissão de instalar desta origem e confirmação; não há instalação silenciosa.
6. Download manual existente permanece disponível; PWA continua na web; histórico/changelog só mostra releases certificadas consultadas sob demanda.

## Publicação explícita / não automática

- `instalar.sh`: aplica em escopo estrito e **não** cria commit/push/deploy. Roda teste M111, teste:release e check:versions, gera estado e backup com hashes.
- `publicar.sh CAMINHO_DO_BACKUP`: requer iniciativa explícita, refaz gates, exige branch main sem desvios e stage exato antes do `git push`. Após o push, o workflow **existente** publica uma Release se a Action passar.
- `rollback.sh CAMINHO_DO_BACKUP`: apenas se a M111 **não foi publicada**, verifica checksums antes de restaurar seus quatro arquivos rastreados e remover os dez novos.

## Evidência e limitações

- Testes locais verificam integridade do pacote, sintaxe TS/JS e transformações; testes funcionais puros cobrem parser, URL adulterada, versão, certificado e legado. Um cenário sintético testa a aplicação do patch no AndroidManifest e MainActivity.
- **Não** há certificação Java/Gradle em Termux: o build Android real, a verificação de assinatura e o funcionamento do FileProvider precisam da Action e do aparelho.
- A primeira versão com M111 precisa ser instalada manualmente sobre o APK atual; para testar o fluxo dentro do VAULT, é necessária uma **segunda release real e mais nova**, sem gerar build artificial só para homologação.
- Verificar no dispositivo Android: download, progresso, rede offline, rede interrompida, cancelamento, bytes, arquivo modificado, assinatura divergente, appId, versão anterior, autorização negada, retorno de Settings e confirmação do instalador. Validar manutenção de login, dados locais, sincronização, notificações e rotas após atualização.
- O APK continua público no GitHub Releases. Se o projeto migrar para a Play Store, reavaliar distribuição e permissões: priorizar a API oficial de atualização da loja.
