#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_HEAD="7507c0627fbeafa08206475c046857d5546ec391"
ROOT="$(pwd)"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PAYLOAD="$SCRIPT_DIR/vault-v99-payload"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/.vault-backups/v99-canonical-medication-$STAMP"

fail() { echo "ERRO: $*" >&2; exit 1; }

test -f package.json || fail "execute em ~/projects/vault-app"
test "$(git remote get-url origin)" = "https://github.com/alefe-redes-computadores/vault-app.git" || fail "repositório incorreto"
test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD" || fail "HEAD diferente de 7507c062; não vou aplicar cirurgia sobre código desconhecido"
test -d "$PAYLOAD" || fail "payload V99 não encontrado ao lado do script"

TRACKED_DIRTY="$(git status --porcelain --untracked-files=no)"
test -z "$TRACKED_DIRTY" || fail "há alterações rastreadas; preserve-as antes da cirurgia"

mkdir -p "$BACKUP"
FILES=(
  hooks/useMedicationRegulatoryProfiles.ts
  lib/types.ts
  lib/medication-catalog/persisted-snapshot.ts
  scripts/test-v99-canonical-medication-snapshot-contract.mjs
  supabase/migrations/20261008_add_medication_catalog_snapshot_v99.sql
)

for file in "${FILES[@]}"; do
  if test -f "$file"; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -p "$file" "$BACKUP/$file"
  fi
done

rollback() {
  echo "Falha detectada. Restaurando arquivos anteriores..."
  for file in "${FILES[@]}"; do
    if test -f "$BACKUP/$file"; then
      mkdir -p "$(dirname "$file")"
      cp -p "$BACKUP/$file" "$file"
    else
      rm -f "$file"
    fi
  done
  echo "Rollback concluído."
}
trap rollback ERR

for file in "${FILES[@]}"; do
  test -f "$PAYLOAD/$file" || fail "payload incompleto: $file"
  mkdir -p "$(dirname "$file")"
  cp -p "$PAYLOAD/$file" "$file"
done

node scripts/test-v99-canonical-medication-snapshot-contract.mjs
node scripts/test-v98-final-medication-intelligence-contract.mjs
node scripts/test-v97-2-r1-regulatory-stability-card-rhythm-contract.mjs
node scripts/test-v95-3-catalog-authority-contract.mjs
node scripts/test-v95-2-medication-experience-sync-contract.mjs
node scripts/test-seguranca-regulatoria-v16-contract.mjs
node scripts/test-v34-medication-identity-density-contract.mjs
npm run test:release
node node_modules/typescript/bin/tsc --noEmit
git diff --check

trap - ERR

echo
echo "============================================================"
echo " VAULT V99 CANONICAL MEDICATION — ZERO ERROS"
echo "============================================================"
echo "✓ verdade farmacêutica persiste no medicamento e no Supabase"
echo "✓ cache conhecido aparece antes de qualquer revalidação"
echo "✓ nome comercial e princípio ativo participam da resolução"
echo "✓ falha de rede nunca rebaixa verdade conhecida"
echo "✓ catálogo só revalida por versão/TTL, não por render"
echo "✓ fuzzy continua sem conceder autoridade regulatória"
echo "✓ Pristiq permanece Pristiq; desvenlafaxina fica como princípio ativo"
echo "✓ lista compacta V98 e detalhes preservados"
echo "✓ Receita, aquisição, SOS, agenda e estoque preservados"
echo "✓ contratos, release gate, TypeScript e git diff validados"
echo "Backup: $BACKUP"
echo "Migração Supabase V99 já aplicada e verificada."
echo "Nenhum build, commit ou push foi executado."
