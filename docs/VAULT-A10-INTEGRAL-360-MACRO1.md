# VAULT 360 — A10 Integral MACRO1 · Longitudinal, Brain, PharmaLens e Fênix

**Base imutável:** `2a950bd1415be7182275e4c9194bac492f01a830`. **Natureza:** pacote candidato, `--apply` com gate fail-closed. **Não há publicação automática.**

## Constituição e limites

- Uma autoridade por domínio. O leitor A10 **não grava nenhum** novo registro clínico, dose, receita, pedido, plano ou calendário.
- A10 reutiliza A0–A9, M1–M5, Dexie e Supabase existentes; SQL e versão nova Dexie **não necessários** para o escopo implementado.
- Uma cirurgia planejada **não comprova procedimento**, internação planejada **não comprova admissão**, sessão agendada **não comprova execução**, dose prevista **não é tomada**, lote/registro de OCR **não é validação regulatória**.
- Leitura obrigatoriamente escopada por `(user_id, person_id)` e identidade da pessoa confirmada na tabela original. Respostas obsoletas após troca de pessoa não são exibidas.
- Uma coincidência temporal ou nominal nunca gera vínculo relacional; apenas IDs explícitos e relações canônicas.
- Correções são históricas; relatórios não apagam retificações nem se baseiam em fato substituído para decidir realização.

## Inventário de fontes

**Fontes/eventos:** consultas, cirurgias, fases A1/A4, hospitalizações e seus eventos A5, eventos cirúrgicos A7, intenções A7/M5, sessões e marcos M5, eventos A8, eventos A9, pedidos e itens M1, CareFlow M2, registros de saúde e DoseLogs.

**Contextos/arestas:** medicamentos, tratamentos, carteira de vacinação, programas M5, relações explícitas A5, origens M5, evidências A7/M5, vínculos e metadados privados M3. Nenhuma delas vira evento apenas por existir.

## A10.1 — Linha Clínica factual

- Rota: `/saude/linha-clinica`, leitura sob a mesma autenticação e perfil existente.
- Busca tolerante a acentos; filtros por domínio, data clínica e histórico de retificação; paginação progressiva com indicador de total.
- Eventos por ID e detalhes em `/saude/linha-clinica/detalhe?origem=...&id=...`, inclusive para registros cujo módulo original só possui tela genérica.
- Data clínica civil separada de instante UTC; sessões M5 usam o timezone explícito; nenhuma data de realização é deduzida de data agendada.
- Dose exibe nome/dosagem do **medicamento da mesma pessoa**, não rótulo anônimo.
- Apenas títulos, detalhes, origem humana, rótulo de sincronização local e relações explícitas. Não mostra caminho privado de Storage.
- Violeta só na seção separada de interpretação Brain; fatos e CTA são esmeralda/cores por domínio.

## A10.2 — Relações e paridade dos consumidores

- Grafo a partir de IDs já declarados em `hospitalization_relations_a5`, `rehab_origin_links_m5`, `surgery_evidence_links_a7m5` e `clinical_asset_links`.
- `unlink` e retificações da A7/M5 invalidam vínculos anteriores na projeção, sem mutação na fonte.
- Atalhos discretos na Home, Hoje, CareFlow, Modo Médico, PharmaLens e Minha Saúde/Fênix; preservam hubs originais.
- Modo Médico V3 recebe as lacunas A5, intenções A7/M5 e exames M1 no **mesmo objeto `MedicalDossierP3`** usado pela prévia e pelo PDF original. Adiciona a seção Internações sem criar novo PDF ou segundo writer.
- O modo detalhado mantém todas as linhas elegíveis até o limite explícito de segurança já existente; o resumo declara sua amostra e omissões.

## A10.3 — Brain observacional

- `explainBrainA10` cruza um alerta Brain V5 com fatos por **ID verificado no mesmo perfil**; não cria alerta, diagnóstico, causalidade ou prioridade nova.
- Sem ID resolvido, exibe incerteza; não suprime alerta nem conclui ausência de risco.
- Seção visual interpretativa separada dos registros factuais; violetas só nela.
- O Modo Médico/PDF segue com Brain exclusivamente por opt-in original.

## A10.4 — PharmaLens P4-E

- Reutiliza snapshots locais, cadastro e estrutura já existente de `medication_catalog_versions`/`medication_catalog_candidates`/`medication_regulatory_rules`.
- P4-E separa referência de versão/fonte e candidato documental. OCR, fabricante, lote, apresentação e registro regulatório precisam de revisão humana e confirmação na fonte oficial.
- Não há scraping, ingestão automática de catálogo, selo de Anvisa, comparação de eficácia, recomendação de dose, segundo catálogo ou edição de cadastro.

## A10.5 — Fênix e Avatar

- Entrada factual no perfil existente e links de retorno; sem outra Home, sem novo Avatar 3D e sem loop WebGL.
- Preserva `HealthAvatar`/`HealthAvatar3D` e seus mecanismos atuais de `reduced motion`, visibilidade, dispositivo com recursos limitados e montagem sob demanda.
- Homologação de FPS, bateria, GPU, zoom e cinco larguras Android **permanece A11**. Não é alegada por testes JS.

## Governança/Guardian

- Caso a main mude: pacote **bloqueia**. Outra frente modifica um dos nove arquivos: **bloqueia**. Demais worktrees ou arquivos não autorizados não são capturados.
- `--selftest` verifica a allowlist, os hashes e os planos de patch; `--fast-preflight` executa 221+ testes dirigidos, TS integral e os V70 isolados; `--apply` executa esses gates e todos os **555** testes V63 **antes** de copiar os arquivos.
- Após aplicar: `git diff --check`, hashes, TS integral, testes dirigidos, V70 duplo e rollback seletivo com preservação de colisões.
- Recibos/diagnósticos completos em `~/storage/downloads/vault-a10-integral-validation` e backup em `~/storage/downloads/vault-a10-integral-backups`.
- Zero `git add -A`, zero `reset --hard`, zero `push --force`, zero commit/push e zero migração remota no instalador.

## Estado documental honesto

Antes de receber um `A10_INTEGRAL_360_APPROVED_LOCAL` do Termux: **PREPARADA, NÃO APLICADA, NÃO PUBLICADA**. Testes herméticos locais não substituem `tsc --noEmit` integral no checkout, V63/V70 reais, CI do SHA, RLS negativa com duas contas nem teste físico Android.

**Frentes fora da allowlist:** GP2-03 Pressão/Plano (aguardar contrato Work), GA-02–GA-07 (responsabilidade da outra frente), A11: biometria, multiaparelho real, RLS/Storage com JWT, notificações Doze/quiet hours, bateria/FPS/320–430dp, PDF/compartilhamento Android e APK por SHA.


## Reconciliação obrigatória — A10 REBASE1 sobre Guardian GA-02–GA-07
- **Base original (não instalar):** `941f82a042b0670d99fc2f08e21acabb59747e11`; **base publicada atual:** `2a950bd1415be7182275e4c9194bac492f01a830`.
- `main` recebeu `fix(vault): Guardian GA02-GA07 fechamento clinico e UX`, com 8 arquivos alterados; 4 pertencem à allowlist A10.
- Nos quatro arquivos, todas as âncoras A10 foram conferidas contra o conteúdo publicado, com contagens corretas, antes da atualização dos hashes de base.
- A10 mantém 13 fontes novas, 9 existentes modificadas, 26 substituições ancoradas e 22 caminhos, com as mudanças clínicas/UX GA02–GA07 preservadas.
- V63 publicado tem **554** contratos (inclui `scripts/test-vault-ga02-ga07-guardian.cjs`); a candidata acrescenta exatamente um, totalizando **555**.
- O pré-teste agora chama a suíte dirigida Guardian GA02–GA07 além das suítes A10, TypeScript e V70, antes de aplicar qualquer arquivo.
- **Zero SQL, zero migração Dexie, zero commit e zero push**. O relatório só comprova compatibilidade das âncoras; TypeScript integral e gates globais exigem aprovação no Termux.
