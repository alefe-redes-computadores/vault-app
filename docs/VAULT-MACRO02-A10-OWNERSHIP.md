# Macro02 — incorporação reconciliada A10 (QA07, laboratório)

Ownership transferido à Evolution Macro02 pelo Guardian. Não aplicar o delta histórico A10-DOSE-ORIGIN-REVIEW na Stability residual nem instalar sua vacina histórica. O ZIP é somente evidência.

- SHA-256 da evidência original: `aa07b8a88af2b6af88fda53d7c50f9e15abbee1264e1ea687689ffdf23b7a14e` (29 hashes internos verificados).
- Pré-imagem A10 (QA06): Git `9f012c81d72b6e13eaa641de714c899c1cbd3169`, SHA-256 `e4de0e6dfc82195d520eeb0aded7663ccf335d447f3906bd47c27afb944fc831`.
- Pós-imagem histórica NÃO aplicada: Git `823293913c01e29ff0163ac8a93912495825a2ac`.
- Pós-imagem reconciliada em laboratório: Git `48c037bad9f69cfb2d549c566a754481ea5ac924`, SHA-256 `ea9afe092dc561b3cd81b0e4e002bcbf3ffa86b9aa909de117ae58cf0b080988`.
- Gate permanente: `scripts/test-vault-macro02-a10-dose-origin.cjs` (57 verificações em três TZ); extensão do teste transacional `scripts/macro02-tests/dormant-dexie.cjs`. V63: 562 históricos + Vital + 18 Macro02 = 581, sem duplicação da vacina residual.

Origem (`dose_kind`) é independente da realização. Confirmação única válida, com fuso explícito: tomada ou ignorada, inclusive planned. Pendência scheduled é rotina; planned sem confirmação é previsão. Dupla marcação é conflito; timestamp inválido ou ambíguo não é fato confirmado. A data da rotina e o instante efetivo são distintos. O leitor canônico é `lib/dose-slot-authority.ts`; não há outro escritor ou motor concorrente.

Este documento é recibo de INCORPORAÇÃO LOCAL, não de publicação. Main observada: `1c01cd49f721cc416e1752a8cb56fe8b3d91ed29`. Base QA06: `8fcc8e24804546659407ef57543207db6d5ce908`. A QA07 exige CI cumulativo e QA física, incluindo a transição do escritor real e revisão de paridade. Não há autorização de replay por ausência de recibo. Restauração isolada não equivale à restauração clínica ativa. Migration 03 LOCKED. Não executar DDL/DML/backfill. Nenhum outro delta residual incorporado. A frente residual deve verificar a semântica e o HEAD exato após eventual publicação, sem reaplicar a pós-imagem antiga.
