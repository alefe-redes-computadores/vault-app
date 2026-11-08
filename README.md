# Vault

Aplicativo pessoal de gestão de saúde e documentos, construído como PWA/Capacitor para Android. Centraliza medicamentos, médicos, farmácias, hospitais, tratamentos, consultas, cirurgias, exames, renovações de receita e documentos (RG, CPF, CNH, certidões etc.), com um motor de inteligência que cruza esses dados para gerar alertas e sugestões proativas.

## Stack

- **Framework:** Next.js (App Router)
- **Banco local:** Dexie (IndexedDB) — offline-first
- **Backend/Sync:** Supabase
- **Mobile:** Capacitor (build Android)
- **Notificações locais:** `@capacitor/local-notifications`
- **Desenvolvimento:** Termux + Acode (mobile-first, sem IDE desktop)
- **Deploy:** GitHub → Vercel

## Arquitetura

### Padrão de acesso a dados

```
components/páginas → hooks (useMedicamentos, useMedicos, ...) → repositories (lib/repositories/) → Dexie
```

- **Repository Pattern:** todo acesso a dados passa por `lib/repositories/`, um arquivo por entidade (`medicamentos.ts`, `medicos.ts`, `farmacias.ts`, `tratamentos.ts`, `hospitais.ts`, `locais.ts`, `renovacoes.ts`, `exames.ts`, `consultas.ts`, `cirurgias.ts`, `documents.ts`, `persons.ts`, `cids.ts`).
- **Hooks:** nenhum componente acessa `db` diretamente — sempre via hook (`useMedicamentos`, `useMedicos`, `useDoseLogs`, `useConsultas`, `useCirurgias`, `useRenovacoes`, `usePersons`, `useAuth`, `useSafeDb`, `useHapticFeedback`, `useRenovacaoInteligente`, etc.). Os hooks já injetam `user_id` internamente — nunca passar explicitamente nas chamadas.
- **Relacionamentos por ID:** todas as entidades se relacionam via IDs (`medico_id`, `farmacia_id`, `hospital_id`, `local_id`, `estabelecimento_id`, `person_id`, `tratamento_ids`). Não há mais texto livre para relacionamentos.
- **`tratamento_ids`:** relação medicamento↔tratamento é um array com índice MultiEntry no Dexie (`*tratamento_ids`), não uma tabela de junção. Ao excluir um tratamento, é necessário varrer `medicamentos` que o referenciam e remover o ID do array, gerando evento de sync por medicamento afetado.
- **`db.table()` eliminado:** todo acesso usa `db.[entidade]` diretamente.
- **Tipagem estrita:** zero `as any`. CRUD usa `Partial<T>` / `Omit<T, ...>`.

### Contexto por pessoa

Todas as entidades de saúde carregam `person_id?: string` (opcional, para compatibilidade com dados legados). Um `PersonContext` global expõe a pessoa ativa (`activePerson`) e aplica a cor associada via CSS custom property (`--person-accent`) no elemento raiz, evitando prop-drilling de cor pelos componentes. A pessoa padrão fica registrada numa tabela `settings` (chave-valor, espelhada no Supabase), não na tabela `persons`.

### Sync

Fila de sync (`syncQueue`) local no Dexie propaga alterações para o Supabase. Pontos de atenção conhecidos:
- Alterações em campos aninhados (ex.: estoque, `tipo_receita`) precisam ser explicitamente incluídas na fila — já houve gap nesse ponto e foi corrigido.
- Deleções em cascata (ex.: excluir tratamento) devem gerar evento de sync para cada entidade relacionada afetada, não apenas para a entidade excluída.
- CIDs são dado de referência estático, não devem ser tratados como registro sincronizado por usuário.

## Estrutura de rotas (`app/`)

```
app/
├── (app)/
│   ├── page.tsx              → Home / Dashboard (rotina + inteligência do dia)
│   ├── documentos/           → Acervo de documentos (RG, CPF, receitas, prontuários, exames)
│   └── saude/
│       ├── page.tsx          → Painel de saúde (seção secundária)
│       ├── hoje/             → Checklist diário de doses
│       ├── rede/             → Hub relacional por pessoa (médicos, farmácias, hospitais, tratamentos)
│       ├── medicamentos/
│       ├── medicos/
│       ├── farmacias/
│       ├── tratamentos/
│       ├── hospitais/
│       ├── locais/
│       ├── renovacao/
│       ├── exames/
│       ├── consultas/
│       └── cirurgias/
```

Cada entidade de saúde segue o mesmo padrão de subrotas: `page.tsx` (listagem), `detalhes/`, `novo|nova/`, `editar/`.

A rota raiz (`/`) é a Dashboard; `/saude` permanece como painel secundário (não como redirect quebrado) para não invalidar links salvos.

## Motor de inteligência (`lib/health-insights.ts` + `lib/health-utils.ts`)

Funções puras (sem JSX) que cruzam dados para gerar alertas e sugestões:

| Função | Propósito |
|---|---|
| `validarVinculoMedicoLocal` | Valida vínculo médico ↔ estabelecimento |
| `sugerirRenovacao` | Sugere renovação com base em estoque e receita |
| `analisarMelhorFarmacia` | Ranking de farmácias por preço médio |
| `calcularEconomia` | Economia na última compra |
| `sugerirHorarios` | Sugestão de horários para medicamentos |
| `isReceitaVencidaSegura` | Validação segura de receita vencida |
| `analisarComportamentoUso` | Alertas de adesão (uso de SOS, doses perdidas) |
| `analisarMedico` | Vigilância de retorno médico (ex.: +6 meses sem consulta) |
| `analisarFarmaciaDetalhada` | Insights de gasto e preço por farmácia |
| `gerarAlertasVisaoGeral` | Motor de alertas cruzados (estoque, receita, consulta, exame, cirurgia) |
| `analisarRotinaDiaria` | Assistente diário (jejum para exame/cirurgia, aproveitamento de consulta) |
| `analisarReceitaArquivada` | Evita alertas falsos de receitas já renovadas |

`health-utils.ts` contém os auxiliares (`getDaysUntil`, `computeEstoqueInfo`, `formatDateDisplay`, `getLocalTodayISO`, etc.) — atenção: são importados daqui, não de `health-insights.ts`.

## Identidade visual

Paleta teal/violeta (substituiu o sky-blue original). Sem emojis na UI — ícones via Lucide React. Cards com bordas arredondadas, modais fecham ao clicar fora do backdrop, feedback tátil (`trigger("vibrate")`) em ações relevantes.

## Decisões e convenções fixadas

- Botão "Cadastrar" não aparece em listagens/detalhes — cadastro é centralizado no menu inferior contextual (`BottomNav.tsx`).
- Listagens sempre ordenadas alfabeticamente por nome (ou por data, quando fizer mais sentido), com filtros por status/período/tipo e botão "Limpar".
- Loading: spinner flutuante (`FloatingSpinner.tsx`, Framer Motion) no lugar de skeletons pesados; Suspense boundary no nível de layout (`app/(app)/layout.tsx`), não por página.
- OCR de receitas: abordagem client-side com Tesseract.js (offline, sem custo, sem latência de rede), resultado sempre tratado como sugestão pré-preenchida que o usuário confirma — não como dado definitivo.

## Riscos conhecidos / pontos de atenção ativos

- Garantir que todo `useLiveQuery` usa `.where('index').equals()` indexado, e não full table scan via `.toArray().filter()`.
- Integridade referencial de `tratamento_ids` sem tabela de junção — depende da rotina de limpeza ao excluir um tratamento.
- Migração de registros legados sem `person_id`: tratada via função que roda no boot atribuindo ao `default_person_id`, não via script manual no Supabase.
- Consolidar queries compostas da Home (consultas + medicamentos + doses + exames do dia) em um único provider de contexto, evitando `useLiveQuery` redundante por componente.

## Roadmap

- [ ] Pessoa padrão + cor dinâmica aplicada globalmente via `PersonContext`
- [ ] Reorganização da página "Mais" (Documentos, Configurações, Exportar, Ajuda)
- [ ] Notificações nativas (push) via Supabase Edge Function + `notification_preferences`
- [ ] OCR de receitas (Tesseract.js client-side, com fallback futuro para Vision API se a precisão for insuficiente)
- [ ] Exportação de documentos (PDF) e miniaturas confiáveis
- [ ] Otimização geral de performance de carregamento

## M94 — Notificações, Lembretes e Atualizações

A rota `/saude/lembretes` é a Central de Notificações: categorias automáticas, regras personalizadas e acesso à Central de Atualizações em Mais. A configuração reutiliza `NotificationPreferencesPanel`, `NotificationBrainPanel` e o agendador canônico; não há agenda paralela. A opção rápida de Mais foi preservada, com link para personalização. O VAULT verifica releases Android assinadas e mantém os estados Action (em execução/erro), release aprovada e versão instalada separados. Ver [docs/M94-NOTIFICACOES-UPDATE.md](docs/M94-NOTIFICACOES-UPDATE.md).

## M98 — Central de Relatórios 360

- `Saúde → Linha de Cuidado → Central de Relatórios 360` e `Médicos → Detalhes` levam a uma exportação clínica local.
- 7/30/90 dias ou período livre; PDF/CSV/JSON, seleção de seções, pessoa e médico com e-mail apenas sugerido.
- Modos factual, Brain persistido e resumo para consulta. Nenhuma conclusão médica, alerta histórico retroativo ou envio automático.
- `lib/clinical-report-360.ts` é uma projeção read-only de entidades canônicas; veja `docs/M98-RELATORIOS-360.md`.

## M97 — Correlação documental e catálogo de evoluções

- Brain V5.1-B: três categorias de evento documentado (doses ignoradas/retirada não realizada, sintomas vinculados, SOS/extra) analisadas em 14 dias contra os 14 dias anteriores. Associação temporal não é diagnóstico.
- UI somente leitura na Central, mantendo os insights originais e o controle de notificações.
- Página **Inteligência → Evolução do Cérebro** com catálogo embarcado, exemplos e limitações.
- Documentação em `docs/M97-BRAIN-CORRELACAO-EVOLUCOES.md`; pesquisa e roadmap VAULT 360 arquivados em `docs/`.

## M95 — Histórico de quantidade e PDF mensal

- Na **Linha de Cuidado**, o mês escolhido pode ser exportado como PDF estruturado no PWA ou compartilhado pelo Android com os plugins já existentes.
- Doses, horários previstos, confirmações reais, motivos e registros de saúde vêm da fonte local canônica; nenhum horário é inventado.
- Episódios com avaliação originalmente preservada pelo Brain V5 acompanham a dose nos históricos. O observador global reconcilia esses episódios sem abrir a página de alertas.
- Snapshots de quantidade já salvos não são descartados pelo limite de retenção da memória geral. Registros antigos sem snapshot não recebem um falso alerta retrospectivo.
- A conferência da pessoa não equivale à avaliação profissional. A exportação ocorre somente por ação do usuário e não envia o relatório à nuvem.
- Consulte `docs/M95-HISTORICO-RELATORIO.md`.

## VAULT Update Center (M87–M90)

- **Android:** a Action `build-android.yml` publica uma release `vault-android-b<run_number>` apenas após validar assinatura, versão e upload do APK. O APK temporário do Actions mantém retenção de sete dias; a release certificada não tem essa expiração automática.
- **Mais → Atualizações:** identifica o `versionCode` instalado por `App.getInfo()`, consulta a release pública, mostra status, novidades, build e diagnóstico; nunca utiliza token GitHub no cliente.
- **PWA:** atualiza pelo fluxo web, distinto do pacote Android. Não afirma que o APK está atualizado a partir da versão web.
- **Notificações:** aviso local Android com opt-in, apenas após o app verificar a release em primeiro plano. Notificações remotas com aplicativo fechado exigem canal push próprio e ficam para evolução posterior.
- **Segurança:** links de APK restritos ao repositório oficial, sem instalação silenciosa ou acesso a dados clínicos. Consulte [docs/UPDATE-CENTER.md](docs/UPDATE-CENTER.md) e [CHANGELOG.md](CHANGELOG.md).

### M90 — fechamento de atualizações

- O prazo do arquivo temporário do Actions é mostrado **somente quando** a API pública informa `expires_at`; nunca é estimado a partir do horário de execução. A release certificada é independente desse prazo.
- Interface de Mais com Framer Motion, Lucide, movimentação reduzida e diagnóstico copiável; lembretes de prazo são opt-in, canceláveis e exclusivos do Android.
- Não há download automático, instalação silenciosa, percentual inventado, push remoto com app fechado nem alterações em dados clínicos. Ver [docs/UPDATE-CENTER.md](docs/UPDATE-CENTER.md).

## Desenvolvimento

Ambiente mobile-first via Termux + Acode. Deploy contínuo via GitHub → Vercel; build Android via Capacitor.

```bash
npm install
npm run dev
```

Para build Android:

```bash
npx cap sync android
npx cap open android
```
