# VAULT CI360 — M3 P3 | Modo Médico Premium + Fênix/Android

## Autoridades preservadas
- Base mínima `7a16a318` (M3 P2 publicada sobre UI360 R5). A aplicação valida o ancestral da P2, sem sobrescrever arquivos inteiros de HEAD atualizado.
- Relatório canônico M98 `buildClinicalReport360`: medicamentos atuais, doses confirmadas/ignoradas, sintomas, medições, consultas e documentos (títulos apenas).
- CareFlow M2: registros por tipo com pai/relacionamento explícito; não interpretar pedido como resultado.
- Retiradas, renovações, cirurgias, exames e tratamentos são lidos de `HealthInsightContext`, sem criar entidades ou atualizar estoque.
- PDFs: reutilizar jsPDF e a biblioteca M2 IndexedDB, nunca enviar automaticamente. Nenhuma migração SQL, alteração de Dexie ou mudança de sync nesta P3.

## Implementado neste pacote
1. Novo `/saude/careflow/modo-medico`: 12 seções opcionais, padrão conservador (consultas + CareFlow), períodos 7/30/90 e calendário Vault, busca por texto + filtro premium de área, prévia em cartões recolhíveis (40 por vez), resumo (30) e detalhado (até 6000), links de origem, rascunho temporário exclusivo da pessoa.
2. Projeção pura por `user_id + person_id` com vínculos por IDs reais exibidos com rótulos humanos (sem UUIDs visuais), distinção entre fatos registrados, relato e Brain opcional já persistido. Campos ausentes não são 0, SOS/planejado não viram tomado, foto atual de tratamento não é histórico reconstruído.
3. PDF A4 multipágina com cabeçalho/rodapé, origem, limitações e aviso de dados faltantes; controles de arquivar local e baixar voluntariamente. Revalidação de escopo após awaits e compensação por ID se pessoa muda durante `pdfLibraryM2.add`.
4. PharmaLens: limpar e esconder imagem, OCR e candidatos ao trocar medicamento/pessoa ou escolher nova imagem, invalidando operação OCR pendente no retorno assíncrono.
5. Fênix: cancelar frame GPU pendente quando aplicativo vai para background e remover listener na desmontagem, preservando lifecycle antigo, `dispose()` e fallback atuais.
6. Acesso na Home CareFlow e no Dossiê inicial. Protege V63, UI360 R5, R4 e M3 P2.

## Limites honestos
- PDF não embute anexos/imagens, exames e documentos são metadados, por privacidade. O relatório legado M98 mantém suas exportações.
- Pauta temporária na tela não é armazenada, nunca vira prescrição automaticamente.
- Não reconstrói versões históricas ausentes de posologia. Não corrige o P0 Metadona por ocultar CTA.
- O tratamento de WebGL já existia; esta P3 melhora o cancelamento de frames pendentes, mas não substitui teste físico em GPU Android.
- Antes de considerar a P3 integralmente homologada, executar CI360 P6 P3 com visual no APK, PDF longo, offline/online, troca de pessoa e segundo aparelho.

## Mapa de proteção
- `BASE 7a16a318` → R4 → R5 → P2; jamais usar `git add -A`, push force ou sobrescrita ampla.
- `APLICAR-VALIDAR.sh` só prepara worktree isolada. `PUBLICAR.sh` publica somente sessão selada e verifica o SHA remoto; eventual HEAD novo refaz testes.
- Gates: inventário de contratos V63; todos os contratos individualmente coletando falhas, V70, TypeScript global, git diff check, e V63 canônico somente após zero falhas.
