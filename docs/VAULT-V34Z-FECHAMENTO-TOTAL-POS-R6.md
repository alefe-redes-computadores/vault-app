# VAULT V34Z — Fechamento total pós-R6

**Data da consolidação:** 22/11/2026

**Base pública auditada:** `e6e5ee1eadf767e1e268041ae569390c4b69d152`

**Estado:** aprovado localmente, sem commit e sem push

## Por que esta substitui as correções anteriores

As entregas R2, R3, R4 e R5 foram comparadas entre si. R2, R4 e R5 carregavam o mesmo conteúdo funcional; as revisões alteravam principalmente o instalador, a allowlist e o isolamento. A R6B acrescentou coleta, mas ainda dependia de testes textuais que podiam anunciar aprovação mesmo acumulando falhas. A V34Z recompõe a cirurgia sobre a `main` pública atual, incorpora o conteúdo funcional válido, faz o teste V34Y falhar de verdade diante de qualquer bloqueador e acrescenta contratos para as lacunas visuais e semânticas observadas no APK.

## Rastreabilidade preservada

- `7d595c2`: Update 360, preservada.
- `28dec96`: A8 Vacinação 360, preservada.
- `e6e5ee1`: A8 Premium Final + A9 Clínica 360 integral, base efetiva desta cirurgia.
- Nenhuma migração SQL, novo escritor clínico ou alteração de schema integra a V34Z.
- A cirurgia não depende apenas de relatórios antigos: foi reaplicada e testada contra os arquivos reais dessa base.

## Fechamento por área

### Medicamentos e detalhes

- Área neutra do cartão abre Detalhes por ID; Gaveta 360 fica restrita ao nome/seta e ao menu dedicado.
- Princípio ativo e situação de receita ficam legíveis fora do alvo da Gaveta.
- OTOCIRIAX usa identidade confirmada disponível, sem inventar dado; estoque desconhecido aparece como `Estoque não registrado`.
- Receita, suspensão, fabricante, aquisições, evidências e continuidade deixam de usar violeta indiscriminadamente e passam a cores de domínio.
- Receita declarada não vira evento de prescrição e anexo ausente não prova falta de emissão.
- Filtros continuam acessíveis durante a rolagem e controles tocados mantêm alvo mínimo.

### Sintomas e componente de hora

- Dia e horário têm geometria equivalente.
- Horário mantém rascunho durante digitação e normaliza no commit, sem trocar dígitos nem saltar foco.
- Salvamento tem trava síncrona anti-duplo toque, toast somente após persistência, erro sem apagar dados e recolhimento/limpeza somente no sucesso.
- Pessoa, consulta e medicamento permanecem vinculados; reparo de vínculo fica acessível fora do editor sem duplicar o registro.
- CTA primário esmeralda; violeta não é usado como ação clínica genérica.

### Pressão arterial

- Uma única autoridade visual decide entre plano, medição ou formulário fechado.
- Parâmetros conflitantes priorizam a medição explícita, impedindo dois formulários concorrentes.
- Parser de horário é compartilhado e o fluxo mantém plano e medição como fatos distintos.

### Home, tratamentos e CareFlow

- Ação de tratamento usa tipo e ID reais, ícone relacional e CTA esmeralda; quando falta vínculo, oferece relação explícita sem inventá-la.
- A Home não reserva um bloco vazio artificial de 520 px.
- Grade ímpar de Consulta e Documentos expande o último cartão, eliminando o órfão de PDFs clínicos.
- Relações preservam cores e destinos por domínio.

### Modo Médico, Dossiê e PDF

- Datas ISO em textos e chips são humanizadas para data civil pt-BR; a exportação aplica a mesma regra.
- Itens relacionados recebem ícones por contexto sem inferir URLs inexistentes.
- PDF principal usa esmeralda; arquivamento usa ação secundária âmbar.
- Dossiê mantém uma ação principal clara, controles secundários compactos e alvos tocáveis.
- Fontes A4, M5, A5, A7 e pressão manual permanecem cobertas pelos contratos anteriores; esta cirurgia não remove seus projetores.

### Update 360, A8 e A9

- A Central Update 360 original permanece intacta, incluindo versão instalada, release certificada, Actions, artefato temporário e changelog verificado.
- A8 e A9 permanecem na árvore e seus 266 testes dirigidos (59 + 207) passaram dentro do release gate.

## Evidência automatizada

| Camada | Resultado local |
|---|---:|
| V34 fechamento | 9/9 |
| V34X substituta | 39/39 |
| V34Y integridade real | 18/18 |
| V34Z lacunas finais | 11/11 |
| A8 Vacinação | 59 verificações |
| A8/A9 integrado | 207 verificações |
| V63 release gate | 551 contratos |
| V70 Super Integrity + UX | OK |
| V70 Final | OK |
| TypeScript integral | OK |
| `git diff --check` | OK |

Nenhum teste foi removido. Expectativas legadas foram atualizadas apenas quando exigiam texto ou espaçamento que a correção substituiu deliberadamente; as garantias funcionais correspondentes foram mantidas ou reforçadas.

## Separação obrigatória de evidências

- **Código e testes locais:** comprovados nesta preparação e novamente executados pelo instalador.
- **CI/build por SHA:** só pode ser declarado após commit/push e conclusão da Action desse novo SHA.
- **APK físico/A11:** continua sendo a etapa que comprova geometria em 320–430 dp, teclado Android, Safe Area, gesto Voltar e toque real.
- **A10/PharmaLens:** cronologia longitudinal total e correlação observacional continuam na fase própria; não foram simuladas aqui.

## Critério de aceite

A aplicação só termina em `V34Z_APROVADA_LOCALMENTE` se a integridade do pacote, a base Git, a aplicação isolada, os testes dirigidos, o release gate integral e o `git diff --check` passarem. Em falha após escrita, o instalador reverte o patch e informa o backup. Não há commit, push ou instalação de APK automática.
