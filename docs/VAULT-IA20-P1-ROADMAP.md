# VAULT 360 — IA 2.0 P1 · Decisão de arquitetura, integrações e roadmap

Referências: Relatório Mestre V10 (18/11/2026), matriz UX A01–A25, Relatório Mestre V7 e arquitetura R5 / M150 / P6. A IA 2.0 **reduz superfícies redundantes** sem desfazer as decisões de segurança e experiência já publicadas.

## Diagnóstico verificável

- A navegação inferior possui quatro destinos (`Início`, `Hoje`, `Documentos`, `Mais`), enquanto `Minha Saúde` é um hub sem lugar fixo. O novo quinto destino **Saúde** torna sua posição inequívoca; mantém `Hoje` separado, porque doses e tarefas do dia são atividades principais.
- `Minha Saúde` apresenta busca, favoritos, foco contextual e, em seguida, um segundo catálogo completo de módulos. O Explorar M150 já contém 31 destinos, favoritos compartilhados e busca; portanto o mural completo no Hub R5 é redundante, **não** as rotas.
- `Minha Rede de Saúde` aparece como segundo hub irmão. O novo `Profissionais e locais` preserva a rota `/saude/rede` e todas as funcionalidades, mas passa a ter **hierarquia de subseção**, sem alternador de hubs pares.
- CareFlow M2/M3 tem motores e oito áreas funcionais. Seu destino fica sob o nome humano `Acompanhamento clínico`, sem recriar consultas, exames, sintomas, pressão, dossiês, PDFs ou Brain.

## Decisões implementadas nesta P1

1. **Cinco abas persistentes:** Início · Hoje · Saúde · Documentos · Mais; 44dp mínimo tátil, marcador `aria-current` e estado ativo por família de rota. Compose M6 permanece existente, inclusive em `/saude/minha-saude` e `/saude/careflow` (mesmas ações de criação da Home), mas é deslocado para acima da navegação, deixando a quinta aba acessível. Quando há uma única ação, exibe o rótulo/ícone da entidade; quando há mais de uma, mantém a sheet original. `return_to` é preservado para voltar à origem. Conteúdo 320dp: rótulo de 9px apenas nessa largura, 10px a partir de 360dp; leitor de tela tem nome completo.
2. **Uma casa clínica:** `/saude` e a aba Saúde abrem `/saude/minha-saude`, sem criar um novo motor nem uma cópia da Home. Na primeira dobra, o hub passa a mostrar tarefas usuais: medicamentos, consultas, sintomas, exames, pressão e profissionais.
3. **Um catálogo completo:** `/saude/mapa` continua sendo Explorar e segue com **31 entradas**, cinco grupos, busca e favoritos persistidos R5. Seus IDs, rotas e `return_to` são preservados. No Hub Saúde, um único CTA leva ao catálogo; desaparece a grade completa duplicada.
4. **Um único lugar para rede e acompanhamento:** Rede vira `Profissionais e locais` com retorno explícito. CareFlow vira `Acompanhamento clínico` e passa origem nos links. As rotas antigas permanecem válidas, inclusive deep links e notificações.
5. **Microcopy sem ruído:** Nomes de navegação explicam o que a pessoa encontra: `Acompanhamento clínico`, `Conferência e bula`, `Profissionais e locais`, `PDFs clínicos`, `Pressão arterial`. O motor interno e os identificadores técnicos não mudam.
6. **Preservação rigorosa:** nenhuma mutação clínica, nenhuma segunda autoridade do Brain, nenhuma tabela nova, nenhuma exclusão de dados ou cards funcionais.

## Matriz de aceitação das 31 áreas

O contrato não depende de números estáticos de cards na Home. O catálogo `clinicalDirectoryM150` tem identificadores estáveis por destino; módulos com rotas distintas (ex.: **Exames registrados** e **Pedidos e exames**) continuam distinguíveis. A P1 não funde seus bancos nem decide que duas rotas são equivalentes. Uma fusão real só pode ocorrer quando todas as funcionalidades e vínculos forem auditados e cobertos por testes.

## QA obrigatória, sem atalhos

- Pré-gate e pós-gate `V63/V70` completos, TypeScript global e teste dirigido da nova navegação, com R5/UX360/QG1/V71/MACRO3. A aprovação é LOCAL, não publicação nem homologação física.
- Caso de retorno: Home → Saúde → Profissionais e locais → Médico → Voltar; Home → Explorar → Sintomas → Voltar; CareFlow → Pressão / Exames → Voltar; uso de Android Back e modal `+` pelo teclado e por toque.
- Caso de densidade: 320/360/393/430dp; cinco abas sem truncamento, `Documentos` sem corte, FAB sem sobreposição, Safe Area correta; sem barra sobre teclado quando formulário ativo.
- Caso de integridade: pessoa ativa em perfis diferentes; favoritos, recentes, busca, Fênix, notificações, histórico e PDF não perdem vínculo ou estado.

## Roadmap aprovado — sequência pós-P1

**P2 · Hierarquia visual por vídeo + auditoria de ações:** consolidar microcopy e overlays de todas as páginas, medir cards na dobra, melhorar `Explorar` e detalhes, harmonizar acessibilidade e feedback, confirmar Android Back/teclado sem mudanças cegas no bridge Capacitor; inspecionar os 25 achados. Cirurgia própria, com backup e gates.

**QG2 · Homologação real no Android:** fluxos do caso de consulta de 17/11, remédio temporário, pressão, documento/receita, retorno, leitor de PDFs e mudança entre pessoas. Revisar PWA versus APK. Não afirmar experiência validada sem executar no dispositivo.

**D4 · Tratamento temporário:** períodos, conclusão real, retomada contextual sem novas doses presumidas; **P4-D · curadoria da bula** com revisão humana de fontes oficiais e status de quarentena; **Android nativo / notificações** com consentimento e anti-fadiga; **Sync E2E** em dois aparelhos; **LGPD** e exportação FHIR opcional com mapeamento de conformidade (não apenas JSON similar).

**Bloqueadores:** alteração concomitante do HEAD, migração sem autorizar, ausência de evidência farmacológica, tipo de arquivo imprevisto, testes de origem falhando, stage existente, timestamps inválidos e qualquer alteração de dados clínicos fora do escopo.

## Contrato P2: migração segura do botão global `+` para ações por área

**Decisão aprovada pelo operador:** a P1 **não remove o `+`**. A P2 só poderá retirá-lo após prova de cobertura completa, incluindo áreas que hoje dependem exclusivamente de Compose M6. Não se trata de uma troca puramente estética.

1. **Inventário canônico** de todas as rotas relevantes (não só os 31 atalhos clínicos): `getComposeOptions`/`SAUDE_COMPOSE_OPTIONS`, catálogo por rota, navegação de documentos, cofre, família, Hoje, perfil e áreas administrativas. Para cada rota: operação, destino existente, visibilidade, permissão, rascunho, ID de origem, pessoa ativa e retorno. Incluir variantes `novo`, `nova`, `editar`, `detalhes` e lançamento a partir de uma consulta/documento.
2. **Matriz de cobertura bidirecional:** (a) cada ação atual do `+` tem CTA contextual real e testado; (b) cada CTA contextual abre formulário real com contexto correto e preserva seu `return_to`/histórico; (c) nenhuma ação ficou órfã nem foram criadas duplicidades. Exigir **100%** das entradas válidas da matriz, não amostragem visual. Mudanças não suportadas bloqueiam retirada.
3. **Ação por contexto:** em lista, CTA único `Adicionar` ou rótulo humano específico; em detalhes, só ações próprias daquela entidade; em seções com múltiplas ações, sheet acessível com foco gerenciado, cancelar/voltar e rótulos explícitos. Em telas com teclado/modal/foto, não cobrir campo nem CTA final. Não mostrar ação sem permissão ou sem formulário disponível.
4. **Política de cor:** mesma anatomia, altura/raio/posição, foco e comportamento para todo botão primário; o destaque **contextual e semântico**, nunca aleatório. Médicos/consultas: azul; farmácias/fornecimento: verde; documentos: violeta; medições/pressão: ciano; medicamentos: esmeralda. Âmbar somente para atenção, vermelho somente para ações destrutivas. Status sempre combina ícone, texto e cor; nunca usar cor isolada para significado.
5. **Ícones e movimento:** Lucide consistente por ação (`Plus`, `Pill`, `CalendarPlus`, `FilePlus2`, `Activity`, `Stethoscope`, `Building2` etc.), animação curta opcional, `prefers-reduced-motion` respeitado, haptics leves onde já existem, toque >=44px e rótulo acessível.
6. **Navegação/retorno:** verificar origem por aba, Explorar, busca, favoritos, Home, cartão clínico, consulta/medicamento, link de notificação, deep link e cold start. O botão `←` volta à origem permitida; Android Back fecha sheet/teclado, depois confirma saída de rascunho e só então navega. `return_to` sempre mesma origem e sem loops.
7. **Release em duas etapas:** primeira ativar todos os CTAs contextuais **mantendo `+` como fallback**; homologar Android 320/360/393/430dp, PWA e APK, 100% matriz, gates V63/V70, testes de acessibilidade/retorno; só então desativar `+` via cirurgia separada e reversível. Nunca remover por preferência visual antes da cobertura comprovada.

O teste da P2 deve emitir um **relatório por rota e operação** com `PASS/FAIL`, arquivos afetados e estado de rollback, para impedir afirmação genérica de que “todas as áreas estão cobertas”.

### Adendo P1 — criação sem botão central

A quinta aba ocupa o centro. Nenhuma operação é removida: o mesmo catálogo `bottom-nav-compose.ts` gera uma ação flutuante contextual com rótulo e Lucide da entidade; as cores por domínio seguem um mesmo formato premium. O diálogo Compose original continua acessível. O retorno para a origem é codificado por `return_to`; páginas com formulários nativos não exibem duplicação. Testes exigem 33 combinações de rota/aba reais.

Ações de leitura pura (Brain, dossiê, PDF) não recebem botões que simulem escrita clínica. A validação Android deve incluir teclados, safe area, toque, voltar e estados vazios.
