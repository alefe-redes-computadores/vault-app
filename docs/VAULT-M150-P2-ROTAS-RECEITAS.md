# VAULT M150 P2 — Correções de rotas clínicas e vínculos

**Base única publicada:** M150 P1 `a7c2a8dee6ee250ad73b436aa0ff42187d67aa21`. **Responsabilidade:** Frente A (correções). Work fica exclusivamente com arquitetura de novas evoluções, sem modificar `main`.

## Escopo implementado

1. BottomNav visível nas páginas exploratórias **Minha Saúde, Brain V7, Visual Studio, PharmaLens, Supply Shield, plano de segurança e relatório longitudinal**. Formulários `/novo`, `/nova`, `/editar` continuam sem barra global.
2. Retorno contextual seguro em **detalhes de retirada, detalhes de medicamento e cadastro de receita clínica**, rejeitando URL externa, retorno para a própria rota e `return_to` aninhados. Preserva `return_to` válido e a ação anterior.
3. No **Hoje**, tocar na dose (inclusive via teclado) abre o medicamento original com `return_to` contendo o dia/filtros. A lista de receitas planejadas abre o formulário clínico **existente** e faz o formulário retornar ao Hoje com a data selecionada.
4. Sem novo banco, endpoint, campo clínico, motor de receita, cálculo de estoque ou inferência. O formulário `/saude/renovacao/nova-receita` já associa `medicamento_id`, faz upload na categoria `receitas` e cria documento de saúde; reutilizamos esse fluxo.
5. Novo contrato M150 P2 e suites legadas protegidas no V63. Executar V63/V70/TS completo antes de publicar.

## Limites e pendências

- A gravação do **APK #2099** mostrou uma entrada que chegava ao Cofre Pessoal. O código da M150 P1 consultado para o caminho canônico do Hoje já aponta a `/saude/renovacao/nova-receita`; **a reprodução do botão exato do vídeo em APK atualizado permanece pendente**. Não é prova que todas as ações antigas estão corrigidas. Auditar todas as portas nas próximas cirurgias.
- A navegação em cascata entre Brain → Visual Studio → Fênix ainda exige auditoria por fluxo específico; esta P2 protege 3 retornos principais e o Today, mas não promete resolver todos os loops.
- Visual completo dos cards padrão Venvanse, etiquetas, filtros, tarjas Anvisa e autoridade declarada/confirmada ficam na **M150 P3**.
- Deduplicação Home/Hoje/Mais, alertas, análise SOS recente, Fênix e Brain atual ficam em cirurgias subsequentes. Novas perguntas contextuais do Brain pertencem ao Work (sem implementação na `main` durante estas correções).

## Homologação manual Android (não substituída por testes)

1. Abrir **Hoje** em data selecionada → dose → detalhes medicamento → Voltar: retorna ao **Hoje na mesma data**, sem cascata.
2. Hoje → receita planejada → formulário de **Receita Clínica** com medicamento real pré-selecionado → Cancelar/Salvar: retornar ao Hoje, sem abrir Cofre Pessoal.
3. Home → retirada identificada → detalhes → Voltar: retorno direto à Home (quando `return_to=/`), não listagem genérica.
4. Minha Saúde → PharmaLens / Brain / Visual Studio: menu inferior persistente; teclado e safe area corretos; sem loops durante exploração.
5. Validar rotas com URL externa ou `return_to` aninhado: não podem redirecionar externamente nem ciclar.
6. Revalidar usuário/pessoa ativa no anexo, especialmente ao mudar perfis entre abrir formulário e salvar. Nenhum documento de outra pessoa deve aparecer.

**Publicação do GitHub não equivale a Vercel READY nem APK atualizado.** Não declarar homologado até comparar build/aparelho e repetir esses cenários.
