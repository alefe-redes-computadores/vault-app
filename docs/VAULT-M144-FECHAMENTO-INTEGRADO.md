# VAULT M144 — Fechamento Integrado, release adaptativa

## Entrega real deste ZIP
- Predicados únicos SOS / ciclo curto / contingência, origem de aquisição independente e pluralização.
- Conciliador de referências documentais por conta/pessoa e por tripla de IDs: **somente projeção**, sem apagar ou dar validade automática.
- Resolver puro de prioridade operacional, data e horário; prioridade unificada pelo patch M146 já publicado na lista e rótulo neutro para doses futuras.
- Central móvel com relatos de contingência e balanço observado × preocupações, e entradas voluntárias de vacina/procedimento, salvos no Diário canônico por repositório já autenticado e com histórico imutável pela macro. Integração de links em Home, Hoje, Medicamentos e Detalhes.
- Prévia de documentos com zoom por botões, rotação de imagens, PDF no visualizador do dispositivo e abertura do original. PDF com pinch dependerá do visualizador nativo (não certificado).
- Ciclos temporários e pontes observacionais podem aparecer como histórico por data na central sem excluir/reativar medicação. Alterar status ou regime de uso é proibido nesta cirurgia.
- Gates M144 cumulativos, TypeScript, release global, diff check, rollback, SHA256 e publicação com recibo local de conteúdo/dependências idênticos.

## Proteções e limites explícitos
- **Não é um motor de prescrição nem um relógio de retomada segura.** Sem recomendação de combinação, doses, titulação ou prazo farmacocinético a partir de meias-vidas; exibe alertas sem silenciar informações regulatórias.
- Não cria tabela nem altera migração Dexie; registros voluntários seguem o Diary repository canônico.
- Não sincroniza `laboratorio_etiqueta` silenciosamente; a projeção separa etiqueta declarada de última aquisição observada. Integração automática física de fabricante **não faz parte** deste ZIP para não comprometer o PharmaLens/histórico.
- Não foi possível incorporar o conteúdo exato da árvore local M143 P1–P3 no ambiente de autoria. A instalação **exige** que M143 P3 esteja publicada antes de integrar o código e não aplica nenhuma alteração no checkout principal.
- Home/Hoje oferecem acesso direto à central, mas o algoritmo de prioridade unificada é integrado especificamente à lista de medicamentos. Reorganização total de blocos e homologação APK dependem de inspeção real no aparelho.
- A documentação e os testes NÃO provam interações farmacológicas específicas, validade de receitas ou situação real de compras SUS/particulares de um paciente.

## Política de HEAD dinâmico
O pacote **não fixa hash remoto**. `PREPARAR-ISOLADO.sh` e o instalador consultam `origin/main` e atualizam somente por `git merge --ff-only`. Os 5 arquivos integrados usam âncoras semânticas controladas. Se outro chat alterou essas âncoras, bloqueia em vez de sobrescrever sua implementação.

## Fluxo
```bash
cd ~/storage/downloads
unzip -oq VAULT-M144-FECHAMENTO-INTEGRADO.zip
bash VAULT-M144-FECHAMENTO-INTEGRADO/PREPARAR-ISOLADO.sh
bash VAULT-M144-FECHAMENTO-INTEGRADO/INSTALAR-VALIDAR.sh
# Depois de resultado APROVADA LOCALMENTE:
bash VAULT-M144-FECHAMENTO-INTEGRADO/PUBLICAR-APOS-GATES.sh
```

A publicação valida SHA256 de todas as entradas e saídas, conteúdo, toolchain, package files e base. Gates completos não se repetem se o recibo for idêntico. GitHub Actions certifica o commit após a publicação.


## FIX1 — integração com HEAD M143 P3 (81ff6027)
- Aproveita o relógio, motivos e cartão de dose futura da M143 P3, sem segundo temporizador.
- A M146 agora usa a mesma regra executiva nos dois locais. A M144 preserva ambos, sem novo predicado nem temporizador.
- Mantém visualizador `PrescriptionAttachmentViewerM143` (pinch/zoom); não instala outro visualizador.
- O PATCHER exige as âncoras M143 P3 e bloqueia se elas mudarem; o avanço da main não é travado por commit fixo.
- Cuidado: a central é observacional e não recomenda períodos de retorno seguro de medicamentos.

## FIX3 — compatibilidade com M145 publicada e cobertura ampliada
- Base dinâmica com M145 (`8e73ab59` na autoria), preservando M143 P1/P2/P3, V8 P2 e os contratos V198/V70 da M145. O instalador avança por fast-forward e detecta conflitos antes de alterar.
- A central passa a registrar e projetar **ciclos curtos** com Dia X/Y inclusivo e arquivamento apenas visual por data, sem alterar posologia nem status clínico.
- Imunização/procedimento ganha **data efetiva declarada**, lote, data de reforço e contexto; não presume aplicação hoje nem valida esquemas vacinais.
- Última aquisição real distingue `tipo_aquisicao='comprado'` de SUS e só reconhece conclusão se `data_aquisicao` existir; vínculo com processo SUS não infere retirada futura.
- Registros anteriores separados em episódios e imunizações; link para plano SOS. Não realiza avaliação automatizada de interações, nem define horário seguro para retomar tratamentos.
- Preserva o componente M143 de visualização de anexos, zoom/pinch e a lógica M143 de doses futuras.

### Pendências não declaradas concluídas
A unificação visual completa das três seções na página de Detalhes, visualização/edição vinculada de toda a documentação, atualização automática do fabricante, prioridades em todas as quatro telas e testes visuais no APK real exigem inspeção e integração adicional. Este pacote implementa a M144 com isolamento e registra essas lacunas explicitamente, sem simular segurança clínica.

## FIX5 + M146 — reconciliação segura
- M146 publicada após M145 unificou a lógica dos grupos e do filtro Atenção. A M144 mantém esses blocos intactos para satisfazer o contrato M146.
- V112 passou a exigir campo de data/hora não nativo em todas as páginas. A central M144 usa 6 máscaras de entrada AAAA-MM-DD.
- A M144 acrescenta apenas atalho para sua central; não modifica o raciocínio de prioridade do Brain M146.
