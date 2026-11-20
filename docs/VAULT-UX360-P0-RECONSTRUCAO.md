# VAULT 360 — UX360 P0 | Reconstrução premium de Medicamentos e Home

**Data:** 20/11/2026  • **Base auditada:** GitHub `2c8f61adc43a` (A1 após M2)  • **Referência principal:** Relatório Mestre V21, página 5, Compacto/Conforto; Relatório V24, C1/UX-01/H19/H20.

## Objetivo e limite

Corrigir os defeitos concretos mostrados pelo usuário em `1002665884.mp4` e nos comentários posteriores. **Não é uma cirurgia clínica ou de banco**. 20 arquivos rastreados modificados; 2 arquivos novos (este documento e teste P0), sem mudanças em `lib/db`, `hooks/useSyncQueue`, Storage, Supabase, medicamentos, doses, estoque ou receitas canônicas. Sem upgrade de dependências: Lucide já possui os ícones usados, e substituir o motor no meio de releases A1/M2 geraria risco sem benefício demonstrado.

**H19/H20 não estão automaticamente aprovados por compilação**: exigem evidência de comparação visual em APK físico Android e PWA em 320/360/393/430 dp. Regressão visual CI sintética não é evidência fotográfica do dispositivo.

## Achados e ações comprovadas

| Evidência relatada | Diagnóstico em fonte | Cirurgia |
|---|---|---|
| Compacto: ícone de DONAREN, título/ativo em um eixo, horário/estoque/tags à esquerda em outro; linhas pretas vazias | `ListCard` usava `medicationFlow` absoluto; linhas filhas compensavam com `pl-11` | Grid único com coluna regulatória externa preservada, ícone de 40 dp, bloco de texto adjacente. Ativo dentro do cabeçalho, sem `pl-11` no filho. Doses/estoque/CTA no mesmo eixo do nome. |
| Conforto: `PRISTIQ` e `VENVANSE` cortam `Documento vinculado` | `flex-nowrap overflow-x-auto` com chips longos `shrink-0` | `flex-wrap`, `break-words`, sem rolagem horizontal escondida. Todas as etiquetas continuam acionáveis e com ícones Lucide. |
| `Etiqueta: Eurofarma`, `Comprado · cadastrado`, `SUS · cadastrado` redundantes | Textos visíveis da lista e título no topo dos Detalhes | Mostrar `Eurofarma`, `Comprado`, `SUS`; manter ARIA, título de procedência e toque que abre Gaveta 360. `Documento vinculado` permanece completo. |
| Detalhes virou uma tripa de cards repetidos; Rotina/Estoque/Receita enterrados | Ordem de JSX de `app/saude/medicamentos/detalhes/page.tsx` após várias evoluções | Trazer Rotina, Estoque e Receita para o primeiro percurso; mover relações, conhecimentos, fabricante e navegação extensa para um único disclosure progressivo, mantidas rotas e eventos originais. |
| Um bloco diz 0 receitas, enquanto o cadastro traz receita datada | Contagem do hub considera somente eventos `renovacoes` classificados como receita, não `med.data_receita` | Quando há apenas `med.data_receita`, o hub apresenta `Receita informada no cadastro` e informa ausência de evento separado. Não cria contagem fictícia nem modifica documento. |
| `1 Prescrição` → `2 Aquisição` → `3 Primeira dose` apesar da dose datar antes da receita | `MedicationTreatmentJourneyD2` numerava etapas conceituais sem ordenar por data | Exibir `Datas documentadas`, com os fatos encontrados ordenados pela data registrada e sem sequencial causal. Componente mantido sob `Conferir datas documentais` na jornada de eventos. |
| Tela de Detalhes apresenta `AZUL` + `RECEITA AZUL` e `partido` | Duplicação de classificação e código interno da aparência do comprimido exposto como apresentação comercial | Suprimir badge redundante; traduzir `partido` como `Comprimido partido (formato visual)` em `Formato informado`; fonte oficial segue separada. |
| Home: card `Medicamentos` parece enorme com duas linhas pequenas | Grid `items-stretch` + `h-full` igualava altura do acompanhamento contextual | `items-start` e altura mínima ajustada com tipografia e ações intactas. Home Viva continua com regras contextuais próprias. |
| Home: FAB verde `Adicionar` cobre CareFlow e cartões | `BottomNav` posicionava Compose `absolute -top-12 right-2` inclusive na Home | Mesma ação global Compose integrada dentro do rodapé apenas na Home; mantém cinco abas, menu contextual, ícones, foco, haptics. Reserva Safe Area correspondente para a altura. |
| Episódio: vazio preto no fim; `BRAIN 360 · CONTINUIDADE` | `vault-adaptive-tail` e `pb-36` combinados com copy técnica | Reserva inferior específica menor e copy humana `Preparação para o retorno`; não altera evidências/relatórios/ações. |

### O que continua intacto

- Tarjas regulatórias textuais e clique que abre classificação, incluindo contraste e identidade de cores.
- Ícone visual do comprimido/cápsula, nome e dosagem, princípio ativo só quando há referência real; zero afirmações sobre dose segura ou fabricante físico confirmado.
- **Todas as etiquetas clicáveis**, com os mesmos ícones `ShoppingBag`, `Factory`, `FileCheck2` e os mesmos handlers para as abas da Gaveta 360; cores e hints de procedência completos em detalhes/ARIA.
- Interações `Tomar`, `Ver`, `SOS`, registrar estoque, atenção contextual, modo Compacto/Conforto e controles de filtros somente no BottomSheet.
- Contadores distintos de `receita informada`, eventos de receita, aquisições realizadas/futuras, retiradas, saldo, sintomas, calendário e histórico; nenhum dado criado ou contado sem evidência.
- Navegação por ID para tratamentos/profissionais/consultas/fornecimento; nenhuma mudança no repositório ou fila offline.
- Cinco raízes Início/Hoje/Saúde/Documentos/Mais, voltar do Android, toque/44 dp, layout mobile-first e Safe Area.

## Três níveis de verificação

**Primeiro:** parser TypeScript JSX + atributos duplicados; contrato novo de estrutura/UI; execução em memória da ordenação cronológica e do rótulo farmacêutico; testes dirigidos existentes (R5, R4, QG1, M148, D2, R4 Safe Area, A0/A1/M1 etc.); `tsc --noEmit`; `git diff --check`. A coleta registra **todas** as falhas dirigidas, não para no primeiro teste.

**Segundo:** executar **uma** varredura V63 pelo executor `scripts/test-vault-a1-v63-sweep.cjs` já publicado (lê a lista real, inclusive V70; relata todas falhas) **somente** depois de aprovação integral do pré-flight. Teste novo é independente, não altera V63 nem causa duplicação de execução.

**Terceiro — obrigatório no APK físico antes de declarar H19/H20 concluídos:** vídeo e capturas para DONAREN, BUP, METADONA, PRISTIQ, VENVANSE, CERUMIN, com Compacto/Conforto, texto aumentado, 320/360/393/430 dp. Verificar ícone/nome/ativo/rotina/horário/estoque/CTA no mesmo eixo, sem linhas vazias, sem clipping de `Documento vinculado`, sem `Etiqueta:` ou `· cadastrado` visíveis, tocando nos três chips para comprovar contexto, tocando na tarja para comprovar receita, e conferindo Detalhes (receita, estoque, cronologia, histórico, retorno). Verificar botão `+` da Home sem sobrepor cards e seções do CareFlow sem faixa preta sobrando, com aba Mais intacta. Preservar comprovação de dados clínicos.

## Publicação segura

- Rodar `INSTALAR-VALIDAR.sh` **uma vez**. Ele verifica `BASE_BLOBS.tsv`: 20 hashes **Git blobs reais**, bloqueando só se arquivos tocados divergem; exige main limpa e alinhada a `origin/main`. Usa worktree isolado e `node_modules` compartilhado; **sem build pesado**.
- Se tudo passar, cria backup `.tar.gz` seletivo com os 20 originais e aplica exatamente os 20 modificados e 2 novos. Gera marcador de aprovação com HEAD + checksums. **Não commita nem faz push**.
- Rodar `PUBLICAR.sh` somente depois de `UX360_P0_APROVADO_LOCALMENTE` e de conferir o diff. Faz stage exato, verifica checksums e HEAD, commit e push. Não usar `git add -A` ou `--force`.
- Havendo nova alteração A1/M2/M3 nos arquivos afetados, **bloquear** e reconciliar diferenças explicitamente, sem apagar nada. Falha de publicação preserva commit local, não repetir cegamente.
- **Sem SQL / nenhuma migration / sem atualização silenciosa de dependências.**

## Questões não marcadas como solucionadas sem evidência

Página Mais e outras áreas fora das telas demonstradas no vídeo precisam inspeção física antes de decisões estruturais amplas. Não atribuir a esta cirurgia a homologação integral das 19 listas, PDF A4, avatar ou Modo Médico que não foram modificados. O relatório V24 considera H19/H20/H22 dependentes de dispositivo; nenhum V63 verde substitui essa prova.


## FIX1 — contrato QG1 com altura responsiva
Mantém a altura mínima 76px exigida por QG1 nas quatro larguras Android, sem h-full quando Home Viva exibe o painel contextual de altura variável. Em pares sem Viva, h-full permanece. Testes QG1, R4 e UX360 verificam a transição visual. Não muda a autoridade de dados.


## FIX2 — QG1 e V63 sem expectativas obsoletas
Falha de QG1 diagnosticada: o FIX1 atualizou a asserção de altura, mas a asserção posterior ainda exigia `items-stretch`. Contratos M136, M139 e M141 repetiam o mesmo erro. Os quatro foram atualizados para `items-start` e preservam 76px, touch-manipulation, uma coluna em viewport estreito, h-auto quando Home Viva aparece e h-full sem Viva. O patcher continua sem SQL, sem dados clínicos e com âncoras fail-closed.


## FIX3 — Auditoria dos 531 contratos (20/11/2026)
Rastreamentos reais recebidos: 531 executados, 6 falhas: M138 (etiqueta curta), M60/M51/M12 (três verificações executáveis de categoria Receitas), V196 (className dinâmico com altura 76px), IA20 (Compose integrado na Home). Corrigimos o código de apresentação para preservar o rótulo Receitas, mas o detalhamento explica que o contador corresponde somente a eventos separados do cadastro. Contratos M138/V196/IA20 foram modernizados para a mesma acessibilidade, navegação e semântica, em vez de restaurar a interface problemática. Checks rápidos incluem todas as seis regressões identificadas, e V63 agrega o restante do gate. Sem alteração de dados, banco ou lógica de medicamentos.
