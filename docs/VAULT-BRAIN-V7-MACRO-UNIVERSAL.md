# VAULT Brain V7 · Macrocirurgia Universal de Contexto

## Entrega funcional (sem alterações de dados, doses ou schema)

- **Stability Anchor**: usuário marca medicamentos contínuos como referência; 14 dias de doses confirmadas, ignoradas e falta de estoque explicitamente relatada. Retomada apenas documentada, sem relógio de plasma ou diagnóstico de abstinência.
- **Washout & Memory**: lista medicamentos descontinuados, motivos informados e substituições explícitas. Não calcula washout ou cross-tapering sem dados profissionais.
- **ChronoCircadian**: exibe registros de sono com início/fim reais. Não altera horários prescritos nem recalcula adesão automaticamente.
- **Quatro eixos**: dor somática, iniciativa/energia, humor, apetite; só há pontuação quando o registro `registros_saude.tipo` tem eixo correspondente e intensidade 0–10.
- **CareJourney**: contabiliza SUS/gratuidade e compras particulares realizadas por tipo explícito. Não confunde tratamento com vínculo em processo SUS, nem inventa valor de economia.
- **Tiered SOS**: quadro factual de logs `sos`/`extra` tomados nas últimas 24h; sem dose sugerida e sem diminuição de alertas de interação.
- **Lifestyle**: marcadores voluntários treino, cafeína, plantão e reabilitação apenas quando o registro estiver explícito. Não elimina alertas cardíacos ao detectar exercício.
- **Clinical Dossier Exporter**: documento de revisão pessoal com fonte, cobertura, tratamentos, transições, últimos fabricantes identificados por aquisição, quatro eixos, resgates e limitações; copiar texto e exportar PDF localmente.
- **Clinical Context Ledger**: notas pessoais ou referências a documentos, gravadas localmente por usuário/pessoa, identificadas como **não verificadas**, sem influência sobre limiares, avisos ou prescrição.

## Fronteiras éticas/clinicas

A legislação/bulário, máximos, interações e alertas de segurança não são ocultados por 'tolerância', 'justificativa médica' declarada ou bom HRV. O dossiê pessoal anexado nesta conversa é material de referência, não fixture nem conteúdo programático: **nenhum nome, remédio ou história individual foi codificado**. Medicamentos-âncora são opt-in e exigem tipo de uso contínuo. Nunca recomendar doses, resgate ou reinício automático. Para interromper/retomar opioides e outras medicações de alto risco, o app direciona à equipe responsável.

## Arquitetura e privacidade

Todas as consultas Dexie são indexadas por `user_id` e `person_id`; o motor repete o filtro. Não foi adicionada migração, API, endpoint nem escrita clínica. A escolha de âncora e as notas ficam no `localStorage` deste aparelho, não sincronizadas, e podem ser perdidas se limpar dados; o PDF e clipboard só são executados por ação do usuário.

## Dependências técnicas

Requer **PL7-P1/P2 publicadas** na main, Git limpo e gate global atualizado (incluindo M142). A rota `/saude/brain-v7` será aberta pelo novo link aditivo na central PharmaLens. Os outros chats mantêm autoridade exclusiva sobre Home, Hoje, fornecimento, cadastro e prescrição.

## Gates e release

Sintaxe, regressões comportamentais dedicadas, TypeScript completo e **gate global `npm run test:release`**, `git diff --check`, SHA256, backup e rollback. Sem build Android pesado no celular; Action depois do push certifica APK. Publicação exige comando separado com `git fetch`, `git add` allowlist e novo gate.

## Próximas camadas explícitas (não incluídas aqui)

Instrumentar a captura de check-in dos 4 eixos; dados horários de substâncias, washout confirmado por prescritor, protocolos SOS e validação documental/sincronização; variantes mais ricas do Dossiê e acabamento PillStudio + Fênix Studio. Não apresentar essas camadas como prontas.
