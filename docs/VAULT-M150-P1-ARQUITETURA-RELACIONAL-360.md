# VAULT M150 — Arquitetura Relacional 360 / P1

**Base publicada verificada:** M149 `4948a2815fd2ffae8c7c0a2f27b4a9871e97b20f`.
**Referências:** gravação `1002615590.mp4`, inspeção `VAULT-AUDITORIA-VIDEO-0812-ROADMAP-M150.md`, reclamações de navegação em cascata, áreas difíceis de encontrar, repetição da Home e do Hoje.

## O que P1 entrega

1. **Mapa real pesquisável** em `/saude/mapa`, acessível diretamente pela primeira grade *Saúde e rotina* da Home e na primeira parte da aba *Mais*. Não cria uma nova fonte de dados, formulário ou algoritmo de inteligência; somente indexa páginas existentes verificadas no GitHub.
2. **Rótulos e ícones consistentes**, agrupados por tarefa: rotina, minha saúde, evidências, documentos e suporte. Termos Fênix / Visual Studio / Brain V7 / PharmaLens diferenciados por finalidade.
3. **Retorno contextual protegido**: um destino `return_to` é validado contra URL externa, não pode apontar para a própria página e não herda retornos aninhados. O mapa abre áreas com a origem `/saude/mapa`; a Central M144 usa esse helper e, se não houver origem, volta ao mapa.
4. **Barra inferior preservada no mapa** por inclusão explícita na allowlist de navegação.
5. **Escopo dos contadores explicado**: Home exibe somente doses dos medicamentos contínuos; Hoje resume o recorte da linha do tempo da data. Contadores não são recalculados e não registram/alteram tomadas.
6. **Teste de rotas e de retornos efetivos**: garante URLs existentes, unicidade, pesquisa sem acento, bloqueio de origem externa/circular e integração nos acessos principais.

## O que NÃO foi feito nem declarado resolvido

- Os fluxos de retorno de TODAS as páginas ainda precisam de contrato e prova E2E real. P1 previne cascata na Central M144 e no novo mapa; não muda todos os botões de voltar existentes.
- A M149 continua dependente de homologação do PWA e do APK no Android; GitHub não é prova de APK atualizado nem Vercel READY.
- A tela Hoje ainda precisa reduzir densidade sem esconder origem, horário, status, dose pendente/ignorada, SOS ou controles.
- Duplicação de retiradas em Home/Brain/Continuidade ainda exige deduplicação por evento e prioridade, preservando ações. Não ocultar evidências por heurística visual.
- `Anexar receita/documento` deverá sempre escolher documentos de **saúde**, manter ID da pessoa, medicamento e documento, confirmar vínculo real e retornar à ação de origem. Esse fluxo não é alterado na P1.
- Medicamentos e tratamentos em outras rotas ainda podem perder ícones/cores/dosagens. Exigir revisão de todas as entradas com IDs reais.
- Brain pode levantar hipótese clínica sem evidência explicitada, inclusive especialidade, tolerância, causalidade ou eficácia. Necessário rastrear origem de cada frase; nenhum dado novo é inferido em P1.
- Fênix / PillStudio / PharmaLens / Brain compartilham alguns dados mas ainda precisam de contrato explicável de período, fonte, escopo e diferença entre “0 registros” e “sem avaliação neste eixo”.
- Catálogo, ingrediente ativo, receita/regime, processos SUS, documentos e renovações, provas regulatórias, estoque desconhecido/negativo, conversão caixa/cartela/frasco/gotas, temporários, doses offline/idempotentes e sincronização continuam no roadmap.
- Animação/aparência do Fênix (câmera, boné, tênis, óculos, anatomia, wearables), safe area, toque, desempenho, e atualizações APK permanecem pendentes de homologação visual.

## Fases seguintes (condicionadas à transcrição e ao vídeo)

- **M150 P2:** matriz origem → destino → subação → retorno para medicamentos, tratamentos, retiradas, receitas, documentos e Central. Corrigir cascatas, links que mandam para Documentos Pessoais e perda da identidade do medicamento. Antes de modificar uma área, rastrear dados, props e `return_to` de ponta a ponta.
- **M150 P3:** arquitetura de Home e Hoje: cartões de prioridade únicos por evento e opção de ampliar, auditoria de contadores e agenda; preservar acessibilidade e funções essenciais.
- **M150 P4:** unificação de contexto e semântica entre Fênix, Brain V7, Visual Studio, PillStudio e PharmaLens; evidência, janela temporal, origem e não-certeza.
- **M150 fechamento:** comparação visual no Android/PWA/APK, alvos táteis e ícones Lucide, retorno físico Android, teclado, estado de abas, QA de abertura / atualização / offline / multi-pessoa.

## Aceites de P1

- `node scripts/test-vault-m150-p1.cjs` aprova mapa, rotas, pesquisas e retornos.
- Contratos M149, M148, M147, M144, M6 e P15 permanecem válidos no `npm run test:release` real com V63/V70/TS.
- Diferença `Home 0/5` vs `Hoje 2/8` tem rótulo visível de **escopo**, sem adulterar números ou datas.
- Exatamente 12 caminhos alterados/adicionados com `git add -- ...` seletivo; o checkout original permanece intocado.
- Não fazer diagnóstico ou promessa de APK publicado sem prova de atualização nativa.
