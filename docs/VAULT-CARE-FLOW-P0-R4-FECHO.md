# VAULT CI360 — CareFlow P0 + Medicamentos R4 | Fechamento Premium

**Corte de código:** 18/11/2026. **Base ancestral GitHub:** `1e37a371ac5a888fe27d38f13971e6523f23873f` (P4-A publicada após D1). A D2 pode avançar; conferir diferenças antes de aplicar. **Pacote NÃO publicado.** Sem migração SQL ou mutação de dados clínicos pelo instalador.

## Fontes e autoridade

Deriva da auditoria `VAULT-360-AUDITORIA-CARE-FLOW-ANDROID-P0-2026-11-18.md` (20 achados, vídeo de 05:29) e V7 pós-consulta, mais os mockups aprovados de Medicamentos Conforto Executivo e Compacto Premium. Implementação atua na **apresentação e nos read-models existentes**, nunca em banco paralelo.

## Matriz de escopo — B1/B2/B3/B4

| ID | Frente | Entrega desta candidata / verificação restante |
|---|---|---|
| P0-01 | Hora | `HealthTimePicker` HH:mm numérico 24h; sem `HealthRelationPicker` e suas 84 opções. Testar Android teclado/foco. |
| P0-02 | Datas | Datas brasileiras em sintomas, pressão, exames, dossiê, PDF CareFlow e seletores; persistência ISO preservada. Auditar demais superfícies na homologação. |
| P0-03 | Jargão | Brain, CareFlow e Modo Médico removem códigos de versão nos cabeçalhos e nos fatos conhecidos. Outras superfícies exigem revisão física. |
| P0-04 | Sintomas feedback | Estado acessível próximo de Guardar relato, sem mensagem perdida no fim da página. Haptic discreto. |
| P0-05 | Sintomas reset | Limpa formulário apenas depois de criação confirmada. Se evento de vínculo falhar, permite reparação via ID, não recria sintoma. |
| P0-06 | Históricos | Sintomas agrupados por dia, com data e intensidade visíveis; melhorar hierarquia na homologação. |
| P0-07 | Gráfico | Uma curva por nome de sintoma; uma amostra não constitui tendência. |
| P0-08 | Ícones Brain | Ícones de categoria distintos, preservando semântica de fatos e doses. |
| P0-09 | Origem Brain | `monitor_note` encontra o sintoma via related_id + owner e liga ao registro original; sem inferir por data ou nome. |
| P0-10 | Exames | Área tradicional passa a apresentar pedidos CareFlow por ID original, sem criar Exame duplicado. |
| P0-11 | Pedido exames | Entrada unitária, Enter/Adicionar e marcação individual preservada; OCR continua candidato até revisão. Edição direta do nome adicionado invalida a confirmação antiga e exige nova revisão. |
| P0-12 | Dados etapa | Laboratório informado passa para seção opcional, identificado como declaração, sem deduzir coleta; fonte original ainda preservada. |
| P0-13 | Seletor | Ícone próprio para consulta, sintoma e status; escolha por ID com validação por pessoa nas páginas. |
| P0-14 | Voltar | Novo componente para recuperar `return_to` interno válido ou histórico Next; seis áreas CareFlow adotam. Teste de gesto Android segue pendente. |
| P0-15 | Pressão | Medição canônica continua separada e aparece no dossiê contextual; não fabrica relação quando não confirmada. Navegação para Sintomas é oferecida sem inferir vínculo ou causalidade. Uma relação clínica explícita segue dependente de autoridade original. |
| P0-16 | Pressão plano | Diferencia plano e medições, datas BR, esclarece horários apenas sugeridos; sem criar valores medidos. |
| P0-17 | Modo Médico | Remove cabeçalho técnico, consulta contextual e descrição orientada à consulta; PDF A4 existente preservado. Revisar layout 320px e seções. |
| P0-18 | Anexo exame | CTA premium de foto/anexo com nome de arquivo e preview existente; sem upload implícito ou resultado fictício. |
| P0-19 | Dossiê | Resolver nome, intensidade, data clínica e observação do sintoma quando related_id é de uma pessoa válida. |
| P0-20 | Cores | Mantém tons por entidades onde já existem (sintomas violeta, pressão céu, exames esmeralda) e evita misturar com classificação regulatória. Homologação visual transversal segue necessária. |
| B4-01 | Compacto/Conforto | Remover altura mínima artificial e diminuir ritmos; manter ficha e princípio ativo no Conforto e informações acessíveis no Compacto. |
| B4-02 | Tarja | Mantém classificação regulatória lateral original, sem fazer nova inferência. |
| B4-03 | `+1` | O `+1` do print era **contagem de ações secundárias** e NÃO de regulações; reposicionado para o menu `...`, sem falsificar classe. |
| B4-04 | Regime/tratamento | Chips informativos e não clicáveis na lista, com cores do vínculo real; nome/menu preservam Gaveta 360. |
| B4-05 | Filtros | Barra canônica visível no topo; mantém a gaveta de filtro avançado. |
| B4-06 | Gaveta | Aba ativa com contraste; 5 abas originais; apresentações do catálogo em chips e descrição técnica original expansível. |
| B4-07 | Proveniência | Uma nota curta sem reduzir fonte/autoridade; aquisição não vira fabricante confirmado. |
| B4-08 | D2 | Não criar segunda autoridade para temporários. A D2 precisa ser reconciliada na `main`; estados, horários e estoque reais são propriedade dela. |

**Importante:** a matriz distingue código candidato de comportamento comprovado no APK. Não declarar resolvidos pontos não cobertos integralmente (P0-15 relação explícita e P0-20 semântica global de cores) apenas porque os gates passaram.

## Engenharia de instalação

- `patch_p0.py --check` verifica todas as âncoras **antes de tocar em qualquer arquivo de produção**. PATCH seletivo, sem `git add -A`.
- `release_p0.py prepare` exige repositório correto, main, remote origin, base P4-A ancestral, árvore rastreada limpa, checksums e arquivos novos ausentes; faz fast-forward seguro quando possível, nunca reset nem rebase.
- Todos os patches são produzidos em pasta temporária, backup seletivo da árvore anterior, instalação de arquivos explícitos e gates direcionados, globais V63, dois V70, TS noEmit, diff --check.
- Se um gate falhar, restaurar apenas arquivos alterados desta cirurgia, deixando os novos removidos; sessão bloqueada não permite publicar. Não limpar dados do app e nem alterar Supabase.
- `PUBLICAR.sh` só publica se sessão local aprovada, manifest SHA válido, HEAD/remote iguais à base dos testes, sem staging inesperado; commit/push normal. Se a D2 avançar a main, **não publicar** sem reconciliação.
- `ROLLBACK-LOCAL.sh` exige mesmo HEAD e que os arquivos ainda sejam exatamente os de nossa sessão; se outra frente os modificou, bloqueia para não destruir alterações.

## Homologação Android indispensável

1. 320/360/393/430 dp, fonte ampliada, scroll, teclado HH:mm e botão Android Back.
2. Sintoma novo + consulta existente; provocar falha parcial de vínculo em fixture, confirmar que nova tentativa não duplica fato.
3. Evolução separada por categoria; histórico de dias diferentes, documentos e seleção de consulta.
4. Pedido de exames com OCR manual, seleção de itens, laboratório opcional e navegação Exames ↔ Pedido CareFlow.
5. Plano de pressão com horário sugerido mas não confirmado; medição só se aferida e sem zero inventado.
6. Modo Médico/PDF: fonte, consulta, sintomas, tempos, documentação de lacunas, não mostrar conteúdo íntimo não selecionado.
7. Medicamentos real: imagens PillStudio, regulação acessível, Conforto vs Compacto, +1 de ações no menu, microaviso abre a aba correta, apresentação técnica verificável.
8. Temporários D2: prescrito/obtido/iniciado/finalizado quando os dados sustentarem; fim sem atrasos falsos ou lembrete nativo extra.
9. P0 Metadona: retirada concluída por ID, sem segunda movimentação e com saldo real preservado.
10. Isolamento conta/pessoa, offline, nova sessão, Vercel, APK e device homologados separadamente.

## Status

**CANDIDATA PARA VALIDAÇÃO NO TERMUX, NÃO HOMOLOGADA.** O projeto original não está clonável no ambiente de criação; compilação TypeScript e suíte real obrigatoriamente executadas pelo instalador no checkout do operador. Nenhum commit/push neste pacote.

## FIX4 — compatibilidade de contratos historicos

Alem dos 19 arquivos originais, quatro testes preexistentes agora sao atualizados cirurgicamente, totalizando **23 arquivos alterados e 3 novos**. Os testes P6, M109, M148, M150 e P7 R3 foram revisados para exigir o **Compacto executivo atual**, preservando os contratos de cronologia, CTA canonica, classificacao regulatoria, tratamentos e estoque. O preflight executa dez contratos de regressao em um espelho temporario de somente leitura. Não exige alteracao retrograda do layout. A aprovacao real depende dos gates locais e da homologacao visual no Android.


## FIX5 — Diagnóstico hermético 507 suites (18/11/2026)

Base D2 `d07f524b7e6e4f720519c1730a09c2b0d3666f1d` comprovada por relatório enviado do clone isolado.
502 suites aprovaram; 5 falharam por 3 causas independentes:

- M150 P3: inspecionava `setSecondaryActionSheetR4`, mas os controles são enviados
  por `setMedicationSheet360({ ..., controls })` e exibidos na aba **Ações**. Novo
  teste verifica os controles de dose, cuidado, estoque e histórico, sem reintroduzir
  o indicador flutuante que a interface aprovada aboliu.
- M3 P1 e TypeScript: variável `linked` foi usada antes da declaração pelo patch de
  hidratação do dossiê. Declaração reordenada, origem da data ligada explicitamente
  ao registro da mesma pessoa/conta.
- M3 P2: teste exigia string técnica `DoseLog`; novo contrato exige fonte amigável
  `Registro de dose`, registro de dose confirmada e **não** confirma dose sem evidência.
- git diff --check: linhas de espaços finais surgidas de JSX apagado. Removidas
  apenas na candidata, sem mudar os handlers de medicamentos.

A opção `DIAGNOSTICAR-TUDO.sh` não escreve no checkout e continua todos os 507
contratos mesmo com falhas, registrando todos os resultados. A instalação exige
pré-voo com 13 suítes de regressão, AST TypeScript e inspeção de whitespace.

Nenhum dado clínico, estoque, receituário, consulta ou documento é alterado na
aplicação do patch; só código de interface, testes e documentação.

- Regressão M3 P1 ampliada com caso executável: data vinculada à pessoa certa e isolamento entre contas.
