# VAULT A11 | Storage compatível, privado e legados

**Natureza:** parecer de arquitetura e plano de transição, sem DDL ou mudança remota. Em 22/11/2026, Supabase confirmou `clinical-private` como privado; `vault-attachments`, `saude`, `documents` e `avatars` como buckets públicos. RLS de metadados não anula o acesso público ao binário por URL de `/storage/v1/object/public/...`.

## Pontos reais de acoplamento encontrados

- `lib/supabase/storage.ts`: faz upload para `vault-attachments` (receitas, laudos, saúde e docs), constrói URL pública via `getPublicUrl` e deleta por caminho deduzido de URL. Não alterar sem contrato de consumidores.
- `lib/repositories/documents.ts`: descreve e consome a URL pública histórica.
- Telas de documentos, exames, medicamentos, renovações, consultas, CIDs e galerias possuem chamadas históricas a `uploadFile`, `deleteFile` ou verificação de URLs `vault-attachments`.
- M1/M3 novos utilizam `clinical-private` e `clinical_assets`/vínculos com armazenamento canônico e origem privada. Isso **não moveu automaticamente** os anexos legados.
- `docs/VAULT-A0-INTEGRIDADE360.md` e `docs/VAULT-M1-EXAMES-RELATORIO-CONTINUIDADE.md` já registram a pendência. A11 não deve reportá-la como descoberta inédita.

## Critérios STOP / plano sem surpresas

1. Inventariar **apenas metadados e contagens** dos objetos e referências legados por conta/pessoa, sem imprimir nomes/caminhos clínicos nos logs.
2. Identificar cada consumidor de URL, thumbnail, download, PDF, compartilhamento e cache offline; criar matriz de compatibilidade para APKs antigos e novas telas.
3. Criar fluxo canônico de download autenticado (`clinical-private`) com escopo `(user_id,person_id)`, expiração/renovação assinada, retirada de cache e link de retorno. URL assinada **não** é identidade/autorização permanente.
4. Migrar metadados e bytes com hash de integridade, idempotência, retry e tombstones; manter relação com autoridade única M3. Nenhuma promoção automática por OCR ou nome de arquivo.
5. Provar contas A/B, pessoas A1/A2/B1/B2 e acesso negativo a objetos **fictícios**, incluindo token expirado, revogado, link antigo e tentativa de listagem cruzada.
6. Validar download offline/restart e restauração de APK antigo antes do cutover. Se um cliente ainda espera URL pública, a operação permanece bloqueada para fechamento do bucket.
7. Fazer canário controlado, backup/rollback comprovado, retirar URLs públicas e finalmente alternar buckets **somente após** autorização explícita, migração completa e prova negativa remota.
8. Nunca dar `supabase db push` cego ou `UPDATE storage.buckets SET public=false` sem a prova da compatibilidade. SQL autorizado deve ser versionado no Git e reconciliado com `schema_migrations`.

## Entrega deste pacote

`lib/a11/storage-compat.ts` classifica referências por origem/bucket/visibilidade em memória, sem rede, sem logs de path, sem ler bytes. A página de diagnóstico avisa do risco sem expor links. O pacote **não** muda upload, armazenamento, buckets, migrações ou RLS. A implementação de uma migração real fica **STOP — aguardando fixtures e auditoria do Guardian**.
