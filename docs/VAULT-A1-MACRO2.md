# VAULT A1 — MACRO2 | Engenharia Clínica 360

**Escopo da macro grande:** Rede Multiprofissional (IDs históricos preservados), livro de fatos de evolução de Tratamentos, ligação explícita de duas receitas já existentes e histórico datado de local de fornecimento. Os registros são vinculados ao usuário/pessoa e sobrevivem offline→fila→pull.

## Mudanças funcionais

- Profissionais de Saúde: `medicos` continua sendo a entidade canônica e preserva os IDs/FKs; categorias multidisciplinares e conselho genérico (CRM/CREFITO/CRP/CRN/COREN/CRFa/CRO/CREF/outro). CRM permanece legado/optativo. Uma revisão monotônica `a1_identity_revision` protege os novos campos contra APKs antigos sem impedir correção/limpeza intencional pelo editor atual. Nova/Editar/Lista/Detalhe usam vocabulário neutro. Sem título Dr(a) para profissional explicitamente não médico.
- Tratamentos: fases factuais com origem e data, sem alterar status canônico, dose, receita ou estoque; todas preservadas em `a1_treatment_phases`.
- Receitas: `a1_prescription_links` relaciona dois eventos **somente receita** da autoridade `renovacoes` sem duplicá-los; sem aquisição, gasto ou entrada no estoque.
- Fornecimento: `a1_supply_locations` registra local+data de vigência sem editar retiradas passadas; origem registrada.
- UI `/saude/engenharia-clinica`: 3 áreas com cadastro real, histórico, estados de sync, haptics e toast sincero; ícones Lucide e `bg-void` com padding inferior contido. Entrada no Hub Saúde/Explorar; nenhuma aba raiz extra.

## Fonte e limites

Baseado no Relatório Mestre V24/V22, auditoria real do GitHub HEAD A0 `1817f1df`, e estrutura Supabase pós-A0. M2 pode publicar novo HEAD: o instalador só exige preservação das âncoras e adapta Dexie ao próximo número, em worktree isolado. Não mexe nas stores M1 de Exames nem assume responsabilidade por M2/M3.

Esta entrega é funcional, mas não é a última etapa de Receitas/Tratamentos no plano integral: prescrição de múltiplos medicamentos e versionamento formal de documentos, compensação de alterações factuais e projeção Brain/PDF podem exigir coordenação com M3. **Não inventar conclusões, prescrições, doses ou uso automático.**

## Fluxo obrigatório

1. `bash INSTALAR-VALIDAR.sh`: fast check + V63 + `tsc --noEmit` uma vez em worktree; backup e aprovação local sem commit.
2. Enviar `A1_MACRO2_APROVADO_LOCALMENTE` no chat. A assistência aplica `sql/VAULT-A1-001-ENGENHARIA-CLINICA.sql` via Supabase e verifica `002` (sem usar Termux para isso).
3. Apenas após confirmação remota: `A1_SQL_VERIFICADO=1 bash PUBLICAR.sh`.
4. Conferir GitHub Action do mesmo SHA e teste APK físico. Testes E2E com duas contas/pessoas e falhas de rede continuam requisito de homologação final.

## Integridade relacional e exclusão segura

Os repositórios históricos de Profissionais, Tratamentos e Renovação bloqueiam exclusões que deixariam fases ou versões A1 órfãs. É bloqueio factual, não remoção visual de botões. Histórico é preservado; status, estoque, doses e retiradas existentes não são reescritos.

## Conflitos e rollback

O instalador bloqueia alterações rastreadas ou stage pré-existente; não executa `git add -A`, reset, force ou rebase. Usa `git fetch` e `git worktree` isolado. O HEAD pode avançar entre pacotes **desde que os anchors ainda sejam compatíveis**; bloqueia concorrência durante o gate. Backup tar.gz seletivo é criado antes de copiar os arquivos. Em falha de I/O, restaura MOD e remove NEW. SQL é **aditivo** e não apaga registros.

## Limitações explicitadas

- Validação local de UI depende do APK real; tests textuais/TypeScript não provam a geometria em 320/360/393/430dp.
- Não há atualização das FKs legadas `medicos.id`: por design elas continuam existentes.
- Como as tabelas A1 são append-only, corrigir um fato exige um evento de correção versionado futuro, não edição silenciosa.
- Histórico do local registra o local declarado desde uma data; não altera a origem das retiradas antigas nem presume qual farmácia realizou o recebimento.


## FIX1 — AUDITORIA EM LOTE (20/11/2026)

Este pacote substitui integralmente o A1 MACRO2 original e deve ser executado **no lugar dele** quando a tentativa anterior bloqueou em `pull missing a1_treatment_phases`.

Causas comprovadas e corrigidas:
1. O contrato original procurava a string literal `table:"..."`, mas o `processTable` da aplicação recebe `remoteTable: "..."`; agora valida `remoteTable`, `queueTable` e destino Dexie, tolerando somente whitespace.
2. `jsx: ts.JsxEmit.None` era enviado para `.ts`, opção inválida no TypeScript; agora `jsx` só é passado para `.tsx`.
3. O instalador parava na primeira reprovação; agora **executa todos os testes dirigidos, 4 regressões, TypeScript completo e patch sintético**, acumula falhas com lista única no log, e somente então decide executar o V63. `tsc --noEmit` é executado uma vez, V63 inteiro (incluindo os dois contratos V70) uma vez, acumulando todas as falhas sem parar na primeira.
4. O teste estrutural agrupa seus próprios achados (paridade, contrato, RLS, forms, datas, TS) e os apresenta em conjunto sem interromper na primeira asserção.

Não há migração nova neste FIX1, nem código de aplicação removido. O SQL original A1 permanece **não aplicado** até aprovação local, por exigência de integridade. Não publicar sem confirmação do Supabase.


### Homologação completa sem parada na primeira falha

`files/scripts/test-vault-a1-v63-sweep.cjs` lê a lista de contratos **da versão do próprio `scripts/test-v63-release-gate.mjs` no HEAD em validação**; roda todos uma única vez e inclui o fechamento V70, coletando nomes dos testes que falharem. A migração SQL **não** é aplicada automaticamente por este ZIP. Há uma verificação separada do TypeScript antes do V63, sem repetição do compilador no V63.

O registro `A1_PRE_FLIGHT_RESUMO` resume os testes dirigidos. O registro `A1_V63_SWEEP_COMPLETO` resume o gate completo, caso os dirigidos tenham passado. Um resultado negativo preserva a `main` e o backup existente.


## FIX2 — Ícone Lucide compatível após auditoria completa

A execução da FIX1 registrou 10 verificações dirigidas, com 9 aprovações e apenas
uma falha em `tsc --noEmit`: `IdCard` não é exportado pela versão do `lucide-react`
instalada no ambiente. O formulário continua com ícone Lucide, agora `CreditCard`,
ícone que já é utilizado no repositório. Não foi alterada qualquer operação clínica,
SQL, tabela, contrato, comportamento do formulário ou ordenação da sincronização.
O pré-flight continua verificando todos os dirigidos e fazendo V63 uma vez após
a aprovação do TypeScript.

**Este FIX2 é pacote integral substitutivo**: não executar a FIX1 original primeiro.
Não publicar sem `A1_MACRO2_APROVADO_LOCALMENTE` e migração A1 validada no Supabase.


## FIX3 — IdCard oficial do Lucide

O Lucide `id-card` foi introduzido em 0.418.0, enquanto o VAULT
usa `lucide-react` ^0.417.0. O FIX3 preserva package.json e lockfile
e instancia a **mesma geometria oficial** com `createLucideIcon`,
export existente no pacote instalado. É um ícone Lucide real e
continua obedecendo às propriedades de acessibilidade. Não utiliza
`CreditCard` e não adiciona dependências ou muda o Head da M2.

Este é um pacote substitutivo completo do FIX2. Não mesclar
pastas antigas nem executá-lo em paralelo a outra validação A1.


## FIX4 — Conformidade real com V112 (20/11/2026)

O sweep com 530 execuções identificou um único contrato reprovado:
`scripts/test-v112-lifestyle-insights.mjs`. A auditoria V112 examina `app/` e
`components/` e proíbe `select` e `input type=date/time` nativos visíveis.
A A1 introduzia 11 seletores e 2 datas nativas na central e 2 seletores
na identificação profissional. Não foi uma falha dos dados clínicos.

Substituímos **todos os controles novos** pelos componentes já existentes
`HealthRelationPicker` (modal com busca, seleção por ID e acessibilidade) e
`CustomDatePicker` (calendário em português, data civil ISO preservada).
A classificação continua com o `IdCard` Lucide real da FIX3.
O teste A1 dirigido agora verifica os controles antes do V63. Não alteramos
regras clínicas, estoque, fila, banco ou as 12 modificações originais.

**FIX4 substitui integralmente FIX3**: executar somente este pacote.
O sucesso depende de novo pré-flight, TypeScript e gate V63 completos
no worktree isolado do aparelho. Não presumimos homologação antecipadamente.
