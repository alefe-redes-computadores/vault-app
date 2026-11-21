# VAULT 360 · A5 Internações 360 + V28 — Macrocirurgia auditável

**Data de preparação:** 21/11/2026
**Baseline inspecionada:** `957934184d7135b8e754194f3320484137a77977` (`feat(vault): M5 macro2 rehabilitacao premium longitudinal`).
**Status do pacote:** código preparado, **ainda não instalado/homologado**. SQL do banco já aplicada e verificada; não confundir com a publicação do aplicativo.

## 1. Autoridades e âmbito

- **Uma entidade canônica:** `hospitalizations_a5`; episódios planejados ≠ admissões ocorridas. Nenhuma admissão, data, diagnóstico ou alta se infere de horários ou cadastros de hospital.
- **Seis tabelas A5:** `hospitalizations_a5`, `hospitalization_stays_a5`, `hospitalization_team_a5`, `hospitalization_events_a5`, `hospitalization_relations_a5`, `hospitalization_discharge_a5`.
- **Um mecanismo de sincronização:** a fila `syncQueue` já usada no VAULT. Novo namespace A5 com ordem de dependências explícitas e compare-and-swap para impedir sobrescritas silenciosas.
- **Isolamento:** `user_id` e `person_id` tanto nas leituras Dexie quanto no SQL com RLS, FK compostas e sem DELETE físico pelo usuário.
- **Documentos:** única autoridade M3 `clinical_assets`/`clinical_asset_links`, com novos destinos A5. Sem segundo storage, URL pública ou cópia do arquivo.
- **Limites clínicos:** alta não movimenta estoque, doses, medicamentos, prescrições nem termina cirurgias ou reabilitações automaticamente. Uma situação desconhecida permanece desconhecida.

## 2. Entrega funcional preparada

1. Lista Internações 360: resumo derivado da própria lista, filtro e densidade compacta, criação pela rota canônica.
2. Registro de internação prevista ou admissão declarada (não são o mesmo estado); edição com validação.
3. Setor/leito, datas realmente informadas, encerramento explícito da permanência.
4. Equipe multiprofissional com IDs de profissionais já cadastrados.
5. Diário factual *append-only* com correção que aponta para o evento original, sem sobrescrever o histórico.
6. Vínculos reais por IDs: cirurgia, consulta, pedido de exame, tratamento, programa M5, medicamento. Reversos em cirurgia, consulta e M5.
7. Alta/saída documentada, destino, orientações e seguimento declarados, revisão de medicamentos **somente como estado informativo**.
8. Documentos privados M3: episódio, fato/diário e alta.
9. Home/Hoje: somente avisos de previsão de internação, sem duplicar tarefa concluível ou atribuir admissão ocorrida.

## 3. Acabamento V28 realizado neste pacote

- A4 Tratamentos: neutralização do violeta fora do Brain; CTA esmeralda; toast de confirmação/erro; fechamento do formulário após salvar; data efetiva inicialmente vazia (não inventada), com validação explícita.
- Modo Médico: filtro de áreas exibe **todas** as seções disponíveis, separa prévia detalhada de seleção do PDF. O PDF mantém modo escolhido e não é alterado pela busca na prévia. O Brain conserva sua identidade violeta.
- A5: sem `<select>` visível ou `<input type="date|time|datetime-local">`; componentes canônicos `HealthRelationPicker`/`CustomDatePicker`; datas em formato brasileiro; não inventa prontuário; ícones Lucide, contraste neutro e CTA esmeralda.
- Roteamento: CareFlow, Home e Hoje, reversos explícitos em Cirurgias, Consultas e Reabilitação.

## 4. O que NÃO é considerado automaticamente homologado

- Teste visual físico do Android nas larguras de 320, 360, 390 e 430dp; safe areas, teclado, FAB e rolagem exigem teste em aparelho.
- Integração E2E real com múltiplos dispositivos, ambientes offline e disputa remota; testes herméticos não são prova de execução ponta a ponta.
- Correções V28 de áreas **não tocadas** (PharmaLens, todos os resumos de Home, sensores, pressões, os demais formulários); não prometer fechamento geral sem testá-las.
- Componente canônico de horário está sendo trabalhado pelo Work em paralelo; esta cirurgia evita tocá-lo.
- Nenhuma etapa da A5 foi aplicada ao repositório pelo produtor do pacote. A instalação local depende de testes no Termux, e a publicação depende de comando separado e validação de SHA.

## 5. Banco real (executado)

- `20261121135709` — `vault_a5_internacoes_360_relational_foundation`.
- `20261121135803` — `vault_a5_internacoes_360_preflight_factual_hardening`.
- `20261121135903` — `vault_a5_internacoes_360_fk_sync_indexes`.
- `20261121153021` — `vault_a5_documentos_clinicos_multivinculo`: acrescenta `hospitalization`, `hospitalization_event`, `hospitalization_discharge` aos destinos M3, preservando os anteriores e verificação exata de pessoa/conta. SQL correspondente incluída no pacote, com ordem de replay `20261121170000`, posterior à M5 MACRO2 `20261121160000`: isso evita que a restrição de documentos volte a remover os tipos A5 numa reconstrução do zero. A versão registrada no Supabase vivo é `20261121153021`; não há reaplicação automática.

A aplicação da SQL foi confirmada por consultas de leitura ao histórico de migrações, à restrição de tipos e às contagens (zero linhas de internação/documentos criados nessa operação).

## 6. Pré-publicação segura

`APLICAR-VALIDAR.sh` deve verificar blobs, campos novos livres, aplicação em **worktree isolado**, testes focados V28+A5+M5+A4+M3+V112, `tsc --noEmit`, conjunto completo de contratos V63 **coletando todas as reprovações**, V70 e `git diff --check`. Somente após aprovação integral aplica cópia **exata** dos arquivos testados ao checkout local; cria backup do allowlist, jamais executa commit ou push por conta própria.

`PUBLICAR.sh` só atua após aprovação local, verificando HEAD/hashes e staging limpo. Nenhum `git add -A`, `reset --hard`, `push --force` ou substituição cega de trabalho paralelo.
