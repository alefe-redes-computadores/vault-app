# VAULT M129 — Inteligência de fabricantes 360

## Objetivo

1. Expandir os 10 fabricantes previamente reconhecidos para um diretório curado de 70+ nomes e aliases. A lista é uma ajuda de cadastro, **não certificação de registro, nem autorização de substituição**.
2. Etiquetas preservam o nome correto e usam cores consistentes de alto contraste; cores são aproximações visuais, **não identidade oficial nem logomarca**.
3. Identificar troca somente em aquisições da mesma conta, pessoa e medicamento, e **somente com datas reais de aquisição explícitas e fabricantes conhecidos**. Não atribuir uso à data de compra.
4. Relato voluntário com início efetivo, quatro opções de percepção, notas e histórico revisável no mesmo evento. Sem envio automático, diagnósticos ou afirmações de causalidade.
5. Se a aparência for diferente, permitir abrir o editor de formato/cores existente. Guardar a aparência atual pré-editor como referência declarada; nenhuma mudança automática em dose, estoque, prescrição, concentração ou histórico clínico.
6. Leitura Fênix **contextual na aquisição**, explicitamente não um alerta integrado da Central do Brain. Integração longitudinal à Central é fase futura após revisão clínica e privacidade.

## Fontes de referência

- Anvisa — Consulta a registro de medicamentos: https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos
- Anvisa — Conceitos e definições: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/conceitos-e-definicoes
- Anvisa — Medicamentos similares e intercambialidade: https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/similares

## Escopo / proteção

- Sem alteração de schema ou sync, sem envio de relatórios, sem coleta automática e sem efeito em posologia.
- M129 exige **M128 previamente publicada**, com validação estrita da linhagem Git M127 → M128.
- `MANUFACTURER_TRANSITION_PREFIX_M129` é armazenado em observações do próprio evento, com preservação pelos helpers M128 e sem aparecer em notas editáveis.
- M128 mantém todas as garantias de check-ins D1/D3/D7/D30, com fabricante original auditável.
- Sem seletor HTML nativo, alvos táteis de pelo menos 44px.
- Proteção de acesso pela única consulta reativa V313, sem novo hook global; filtros adicionais no motor puro para conta, pessoa e medicamento.

## Homologação Android sugerida

1. Criar uma aquisição com fabricante, mantendo o estoque real; confirmar etiqueta.
2. Criar a segunda aquisição válida do mesmo medicamento com fabricante diferente; verificar troca contextual.
3. Declarar **ainda não comecei a usar** e salvar; verificar que não apareceu melhora/piora inventada.
4. Registrar uma data real de início (não anterior à aquisição), escolher experiência voluntária, salvar e reabrir.
5. Abrir o editor de aparência e alterar o visual **somente se confirmado**; verificar histórico anterior.
6. Editar/limpar observações da aquisição; verificar preservação de relatos antigos e do registro da troca.
7. Alternar pessoa e conta: não misturar históricos; verificar tratamento de laboratório desconhecido.

OBS: A simulação local nesta conversa valida apenas o código puro e o fluxo seletivo. TypeScript global, `test:release`, `check:versions` e experiência real de Android exigem execução no Termux.
