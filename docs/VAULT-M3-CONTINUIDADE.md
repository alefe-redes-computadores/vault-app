## M3 FIX1 — Tipagem BlobPart / 20-11-2026

Após scanner integral dos 532 testes: V63 (529 contratos) e V70 aprovados; apenas TS2322 em `lib/clinical-exams-m3/cache.ts:28` na construção de `Blob` a partir de `Uint8Array<ArrayBufferLike>`. Corrigido com cópia de bytes para um `ArrayBuffer` concreto, que é aceito como `BlobPart`; sem casts inseguros, sem refatoração, sem mudança de schema/Storage. Dois contratos focados adicionados para impedir regressão. A M3 depende de novo gate real no Termux e CI.

# VAULT 360 — M3 | Laudos Privados e Vínculos Relacionais

Data: 20/11/2026. Base de preparo: `ddedac3a22a4e41a3f292f158e097c7778d361ce`, M2 publicada. **Não presumir Action/Android homologados.**

## Arquitetura auditada

- **Autoridades preexistentes:** `exam_orders`, `exam_order_items`, `exam_sessions`, `exam_session_items` (M1/M2), `consultas` (Consultas), `documents` (Acervo tradicional). Nenhum registro desses sistemas é duplicado na M3.
- **Arquivos novos:** `clinical_assets` + `clinical_asset_links` (M1, Dexie v49, fila e sincronização já existentes); bucket privado `clinical-private` já criado.
- **Supabase auditado READ_ONLY**: bucket `clinical-private` privado; 50 MB/objeto com MIME PDF/JPEG/PNG/WebP; políticas SELECT/INSERT/UPDATE por owner e pessoa; índice único ativo `clinical_assets_one_live_hash_per_person` e `clinical_asset_links_unique_live`; FK composta asset+owner+person.
- **Sem esquema Dexie novo e sem SQL em produção nesta cirurgia.** Os buckets legados `vault-attachments`, `saude`, `documents` permanecem operacionais. NÃO alterar `public` antes de uma migração com hash e testes de links no APK.

## M3 implementada

1. **Um binário, N vínculos manuais:** PDF ou imagem vinculados a pedido, sessão ou 1–120 itens; o cenário 1 PDF → 12 itens mantém um arquivo físico. SHA-256 deduplica por conta e pessoa; cópias de outras pessoas nunca são reutilizadas.
2. **Upload sem sobrescrita:** caminho `{user_id}/{person_id}/{asset_id}.{ext}`. Checagem de MIME + assinatura inicial do arquivo, 12 MB máximo, SHA-256, upload `upsert:false`, e recuperação de resposta perdida conferindo o conteúdo privado remoto antes de marcar sincronizado.
3. **Escrita local-first:** transação Dexie inclui asset/link e syncQueue; upload binário ocorre após salvar metadados, com estados `local_only/uploading/synced/failed`. Retentativa reaproveita mesma identidade. Sem registros fictícios de resultado clínico.
4. **APK offline:** arquivo binário selecionado fica no sandbox de aplicativo via `@capacitor/filesystem@6` (`Directory.Data`), separado do IndexedDB; pode ser reaberto offline quando cache válido. PWA mantém caminho online, mas **não promete cache binário offline** após recarga. Se a origem de arquivo PWA for perdida antes do upload, selecionar o original novamente.
5. **Consulta/Acervo:** estende telas existentes de Pedidos, Documentos e Consultas. Consulta mostra laudo de seu próprio vínculo ou de pedidos associados por relação explícita; não infere por data/título. Acervo lista esses assets sem copiar para `documents`.
6. **Desvincular:** marca somente `deleted_at` do link; não executa DELETE físico de asset nem remove Storage. GC físico intencionalmente adiado ao servidor até validação da contagem global de referências, carência e confirmação de todos os aparelhos.
7. **Privacidade de abertura:** download autenticado com JWT da sessão, verificação de SHA-256, URL `blob:` local e temporária, revogada na desmontagem. Nunca `getPublicUrl`/`createSignedUrl` no PDF; compartilhar externamente só via toque explícito.
8. **Logout e troca de conta:** limpeza de cache privado `vault/clinical-m3`, somente depois da hidratação de Auth. Não remove dados clínicos nem fila.

### Limitações honestas / tarefas condicionadas

- `Directory.Data` fornece sandbox interno do aplicativo, **não cifra os arquivos em repouso por si só**. Para proteção de nível forte contra extração do dispositivo, é necessária etapa posterior com chave de Keystore e testes reais do APK. O usuário continua protegido pelo Android/sessão/biometria do aplicativo, mas não se afirma criptografia adicional nesta M3.
- O visualizador embutido de PDF no Android pode variar conforme WebView; alternativa de compartilhar o arquivo via `@capacitor/share` é disponibilizada, mas precisa de ensaio físico.
- Para PWA offline binário durável, será necessário fluxo dedicado com cache criptografado validado. **Não armazenar PDFs clínicos pesados em Dexie** para simular durabilidade.
- A M3 não muda o PDF A4 nem substitui a Biblioteca já existente: o documento privado fica vinculado e pode ser consultado, sem inserir URL expirada em exportações. Inserção opcional de metadados selecionados no PDF A4 fica após homologação visual do exportador atual.
- A migração dos arquivos legados públicos para `clinical-private` exige inventário, checksum e revisão por pessoa; não foi realizada automaticamente. **Jamais desligar buckets legados neste deploy.**
- Ponto de hardening servidor: a FK composta de `clinical_asset_links` assegura vínculo com asset do mesmo owner/person. Para entidade de destino (`entity_type`+`entity_id`), o cliente M3 valida os dois; uma política/trigger de integridade de alvo no SQL ainda deverá ser revisada e homologada. Não afirmar teste adversarial E2E que não aconteceu.

## Gates técnicos e governança

- `scripts/test-vault-m3-clinical-assets.cjs`: sintaxe de arquivos novos, 1 PDF → 12 itens, dedupe por pessoa, seleção e confirmação manual, caminho privado, logout, tombstone e integração de telas.
- Pré-voo: **20 testes focados** inclusive M1/M2, V112, R1/R5/R6, consultas, acervo, sincronização, TypeScript e `git diff --check`.
- Gate oficial **sem substituição**: `npm run test:release` (V63/V70/TypeScript) em clone isolado do Git HEAD + novo código; exibe progresso no Termux; se falhar, coleta todos os contratos remanescentes, incluindo falhas dirigidas.
- **Compatibilidade concorrente:** hash dos blobs originais dos cinco arquivos modificados; novo HEAD independente permitido apenas sem alterar os arquivos afetados; quaisquer conflitos bloqueiam para revisão.
- Backups seletivos; rollback local por hashes; `git add --` apenas allowlist; sem push antes da aprovação local; Action real e APK necessários após publicação.

### Matriz de aceite essencial (não confundir sintético com real)

| Cenário | Expectativa |
|---|---|
| M3-01 | 1 PDF anexado aos 12 exames selecionados → 1 asset e 12 links |
| M3-02 | Desvincular 1 exame → 11 links, asset e Blob intactos |
| M3-03 | Mesmo SHA na mesma pessoa → reutilizar asset; outro perfil → isolado |
| M3-04 | PDF com MIME falso, HTML, >12MB ou assinatura não correspondente → rejeitar |
| M3-05 | Sem seleção humana/consentimento → não anexar laudo |
| M3-06 | Erro após binário chegar ao Storage → confirmar checksum remoto e fechar retry idempotente |
| M3-07 | Offline nativo → metadados e bytes preservados, reabertura sem rede; se cache perdido, não mentir que abriu |
| M3-08 | Logout e troca de owner → limpar cache de outra sessão; não apagar documentos remotos |
| M3-09 | Consulta relacionada exibe os PDFs do pedido sem criar outra consulta |
| M3-10 | Acervo clínico histórico intacto; assets privados aparecem como extensão |
| M3-11 | Sem DELETE no Storage, sem URLs públicas/signedUrl no PDF exportado |
| M3-12 | Negative real RLS entre contas/pessoas testado em ambiente controlado antes da homologação E2E |
| M3-13 | V63 + V70 + TypeScript e GitHub Action SHA exato verde |
| M3-14 | PDF aberto/compartilhado no Android físico; sem romper biometria e WebView |
| M3-15 | Inventário de legado/checksums antes de alterar privacidade de buckets antigos |

## Próximas frentes: não construir módulos concorrentes

- **M4 — Jornada Clínica Relacional 360:** auditoria dos módulos existentes de Consultas, Cirurgias, Tratamentos, CareFlow Episódios, Exames, Registros e Documentos. Criar **somente relações explícitas entre entidades já registradas**, sem consultas pré-operatórias duplicadas ou 'cirurgia 2'.
- **M5 — Reabilitação 360:** validar lacunas reais para sessões de fisioterapia, metas funcionais relatadas, avaliações e evolução, vinculando Consultas, Tratamentos, Registros e Cirurgias. `app/recuperacao` é recuperação técnica de dados, não módulo de fisioterapia.
- **Sem inventar fato clínico:** nem data planejada vira procedimento realizado, nem laudo anexado vira diagnóstico automático.

## Comandos Termux

```bash
cd ~/storage/downloads && base64 -d VAULT-M3-LAUDOS-360-FIX1-BASE64.txt > VAULT-M3-LAUDOS-360-FIX1.zip && unzip -t VAULT-M3-LAUDOS-360-FIX1.zip && unzip -o VAULT-M3-LAUDOS-360-FIX1.zip
bash ~/storage/downloads/VAULT-M3-LAUDOS-360/DIAGNOSTICAR-RAPIDO.sh && bash ~/storage/downloads/VAULT-M3-LAUDOS-360/APLICAR-VALIDAR.sh
# SOMENTE após M3_APROVADA_LOCALMENTE | ... V63_V70_TS_OK:
bash ~/storage/downloads/VAULT-M3-LAUDOS-360/PUBLICAR.sh
# Se houver erro:
bash ~/storage/downloads/VAULT-M3-LAUDOS-360/COPIAR-FALHAS.sh
```
