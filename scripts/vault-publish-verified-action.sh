#!/usr/bin/env bash
# Protected environment only. Promotes an existing, immutable GitHub Actions artifact.
set -Eeuo pipefail
umask 077
REPO='alefe-redes-computadores/vault-app'
: "${GH_TOKEN:?token GitHub Actions com actions:read e contents:write requerido}"
: "${VAULT_SOURCE_RUN_ID:?informe run_id original}"
: "${VAULT_EXPECTED_SHA:?SHA da Action original exigido}"
: "${VAULT_RELEASE_POLICY_READY:?Environment protegido não ativado}"
: "${VAULT_ALLOW_STRICT_ANDROID_RELEASE:?opt-in de distribuição ausente}"
[ "$VAULT_RELEASE_POLICY_READY" = 'true' ] && [ "$VAULT_ALLOW_STRICT_ANDROID_RELEASE" = 'true' ] || { echo 'STOP: gate de distribuição não autorizado' >&2; exit 1; }
[[ "$VAULT_SOURCE_RUN_ID" =~ ^[1-9][0-9]{5,15}$ ]] || { echo 'STOP: run_id inválido' >&2; exit 1; }
[[ "$VAULT_EXPECTED_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'STOP: SHA esperado inválido' >&2; exit 1; }
VAULT_ALLOW_STALE="${VAULT_ALLOW_STALE:-0}"
[ "$VAULT_ALLOW_STALE" = '0' ] || [ "$VAULT_ALLOW_STALE" = '1' ] || { echo 'STOP: allow_stale inválido' >&2; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/new" "$TMP/old"
git fetch --no-tags origin main >/dev/null
git cat-file -e "${VAULT_EXPECTED_SHA}^{commit}" || { echo 'STOP: SHA original não existe no checkout' >&2; exit 1; }
git merge-base --is-ancestor "$VAULT_EXPECTED_SHA" origin/main || { echo 'STOP: SHA original não é ancestral da main' >&2; exit 1; }
MAIN="$(git rev-parse origin/main)"
if [ "$MAIN" != "$VAULT_EXPECTED_SHA" ]; then
  [ "$VAULT_ALLOW_STALE" = '1' ] && [ "${VAULT_APPROVED_STALE_SHA:-}" = "$VAULT_EXPECTED_SHA" ] || { echo 'STOP: main avançou e SHA anterior não foi explicitamente aprovado' >&2; exit 1; }
fi
gh api "repos/$REPO/actions/runs/$VAULT_SOURCE_RUN_ID" > "$TMP/run.json"
gh api "repos/$REPO/actions/runs/$VAULT_SOURCE_RUN_ID/artifacts?per_page=100" > "$TMP/artifacts.json"
gh api "repos/$REPO/releases/latest" > "$TMP/latest.json"
node scripts/vault-android-release-policy.cjs check "$TMP/run.json" "$TMP/artifacts.json" "$TMP/latest.json" \
  "$VAULT_SOURCE_RUN_ID" "$VAULT_EXPECTED_SHA" "$MAIN" "$VAULT_ALLOW_STALE" "${VAULT_APPROVED_STALE_SHA:-}" > "$TMP/policy.json"
field() { node -e 'const d=require(process.argv[1]); const keys=process.argv[2].split("."); let x=d; for(const k of keys)x=x[k]; console.log(x ?? "")' "$TMP/policy.json" "$1"; }
ARTIFACT_ID="$(field artifactId)"; BUILD="$(field build)"; TAG="$(field tag)"
ARCHIVE_SHA="$(field archiveSha256)"; LAST_TAG="$(field previous.tag)"
[ -n "$ARTIFACT_ID" ] && [ -n "$BUILD" ] && [ -n "$TAG" ] || exit 1
if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then echo 'STOP: release imutável já existe' >&2; exit 1; fi
# curl intentionally does not use --location-trusted: never send Authorization to a redirected storage host.
curl --fail --silent --show-error --location --retry 2 --max-time 180 \
  -H "Authorization: Bearer ${GH_TOKEN}" -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/$REPO/actions/artifacts/$ARTIFACT_ID/zip" -o "$TMP/action.zip"
[ "$(sha256sum "$TMP/action.zip" | cut -d' ' -f1)" = "$ARCHIVE_SHA" ] || { echo 'STOP: digest do ZIP diferente do publicado pelo GitHub' >&2; exit 1; }
[ "$(unzip -Z1 "$TMP/action.zip")" = 'app-debug.apk' ] || { echo 'STOP: ZIP não contém exatamente app-debug.apk' >&2; exit 1; }
unzip -p "$TMP/action.zip" app-debug.apk > "$TMP/new/Vault-App.apk"
[ -s "$TMP/new/Vault-App.apk" ] || exit 1
# Previous certified APK must be independently verified, not just its release metadata.
gh release download "$LAST_TAG" --repo "$REPO" --pattern 'Vault-App.apk' --dir "$TMP/old" --clobber >/dev/null
[ -s "$TMP/old/Vault-App.apk" ] || { echo 'STOP: release anterior sem binário' >&2; exit 1; }
[ "$(sha256sum "$TMP/old/Vault-App.apk" | cut -d' ' -f1)" = "$(field previous.checksum)" ] || { echo 'STOP: binário anterior diverge de sua release' >&2; exit 1; }
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -d "$SDK/build-tools" ] || { echo 'STOP: SDK Android ausente' >&2; exit 1; }
APKSIGNER="$(find "$SDK/build-tools" -type f -name apksigner | sort -V | tail -1)"
AAPT="$(find "$SDK/build-tools" -type f -name aapt | sort -V | tail -1)"
[ -x "$APKSIGNER" ] && [ -x "$AAPT" ] || { echo 'STOP: apksigner/aapt ausentes' >&2; exit 1; }
"$APKSIGNER" verify --print-certs "$TMP/new/Vault-App.apk" > "$TMP/new-cert.txt"
"$APKSIGNER" verify --print-certs "$TMP/old/Vault-App.apk" > "$TMP/old-cert.txt"
get_cert() { sed -nE 's/^Signer #1 certificate SHA-256 digest:[[:space:]]*([[:xdigit:]]{64}).*$/\1/p' "$1" | head -1 | tr '[:upper:]' '[:lower:]'; }
NEW_CERT="$(get_cert "$TMP/new-cert.txt")"; OLD_CERT="$(get_cert "$TMP/old-cert.txt")"
[[ "$NEW_CERT" =~ ^[0-9a-f]{64}$ ]] && [[ "$OLD_CERT" =~ ^[0-9a-f]{64}$ ]] || { echo 'STOP: assinatura não reconhecida' >&2; exit 1; }
[ "$NEW_CERT" = "$OLD_CERT" ] || { echo 'STOP: assinatura incompatível com release anterior' >&2; exit 1; }
PREV_CERT="$(field previous.certificate)"
[ -z "$PREV_CERT" ] || [ "$PREV_CERT" = "$OLD_CERT" ] || { echo 'STOP: metadado do certificado anterior inválido' >&2; exit 1; }
: "${VAULT_DEBUG_KEYSTORE_BASE64:?keystore permanente original obrigatória}"
printf '%s' "$VAULT_DEBUG_KEYSTORE_BASE64" | base64 -d > "$TMP/stable.keystore"
keytool -exportcert -keystore "$TMP/stable.keystore" -alias androiddebugkey -storepass android -file "$TMP/stable.der" >/dev/null 2>&1
EXPECTED_CERT="$(sha256sum "$TMP/stable.der" | cut -d' ' -f1)"
[ "$NEW_CERT" = "$EXPECTED_CERT" ] || { echo 'STOP: assinatura não é a do certificado permanente do VAULT' >&2; exit 1; }
BADGING="$("$AAPT" dump badging "$TMP/new/Vault-App.apk" | head -1)"
[[ "$BADGING" =~ ^package:\ name=\'com\.alefejohsefe\.vault\' ]] || { echo 'STOP: package ID inválido' >&2; exit 1; }
VERSION_CODE="$(printf '%s' "$BADGING" | sed -nE "s/.*versionCode='([0-9]+)'.*/\1/p")"
VERSION_NAME="$(printf '%s' "$BADGING" | sed -nE "s/.*versionName='([^']+)'.*/\1/p")"
VERSION_EXPECTED="$(git show "$VAULT_EXPECTED_SHA:package.json" | node -p 'JSON.parse(require("fs").readFileSync(0,"utf8")).version')"
[ "$VERSION_CODE" = "$BUILD" ] && [ "$VERSION_NAME" = "$VERSION_EXPECTED" ] || { echo 'STOP: versionCode/versionName não correspondem ao run original' >&2; exit 1; }
OLD_BADGING="$("$AAPT" dump badging "$TMP/old/Vault-App.apk" | head -1)"
OLD_CODE="$(printf '%s' "$OLD_BADGING" | sed -nE "s/.*versionCode='([0-9]+)'.*/\1/p")"
[ "$OLD_CODE" = "$(field previous.build)" ] && [ "$BUILD" -gt "$OLD_CODE" ] || { echo 'STOP: downgrade ou versão anterior inconsistente' >&2; exit 1; }
SHA256="$(sha256sum "$TMP/new/Vault-App.apk" | cut -d' ' -f1)"
{
  printf 'VAULT_VERSION=%s\nVAULT_BUILD=%s\nVAULT_COMMIT=%s\nVAULT_APK_SHA256=%s\nVAULT_APP_ID=com.alefejohsefe.vault\nVAULT_CERT_SHA256=%s\n' "$VERSION_NAME" "$BUILD" "$VAULT_EXPECTED_SHA" "$SHA256" "$NEW_CERT"
  printf '\n## Novidades\n'
  node scripts/generate-vault-release-notes-v34.cjs "$VAULT_EXPECTED_SHA" "$(field previous.sha)"
  printf '\n## Certificação de compilação\n- Gates do workflow original aprovados; ZIP de artefato conferido pelo digest GitHub.\n- Assinatura, pacote e versão conferidos novamente contra release anterior e keystore.\n- Homologação física Android não inferida.\n'
} > "$TMP/notes.md"
# Last race check, then GitHub refuses duplicate tags. Never delete/rewrite an existing release.
if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then echo 'STOP: tag ocupada' >&2; exit 1; fi
echo "VAULT RELEASE: origem run=$VAULT_SOURCE_RUN_ID build=$BUILD sha=$VAULT_EXPECTED_SHA; APK hash=$SHA256 (sem dados clínicos)."
gh release create "$TAG" "$TMP/new/Vault-App.apk#Vault-App.apk" --repo "$REPO" --target "$VAULT_EXPECTED_SHA" \
  --title "VAULT v${VERSION_NAME} · Build ${BUILD}" --notes-file "$TMP/notes.md" --latest
printf 'VAULT_RELEASE_PUBLISHED=%s SHA=%s BUILD=%s\n' "$TAG" "$VAULT_EXPECTED_SHA" "$BUILD"
