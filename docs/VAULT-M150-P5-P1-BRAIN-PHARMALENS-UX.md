# VAULT M150 P5 P1 — Coerência do Brain, PharmaLens e transições Android

**Base imutável:** `b1a0bc03626730ca8661f9a8a506721f4a66f38f` (M150 P4 R3 publicada). **Entrega:** somente branch Fast Lane candidata; a `main` não é alterada automaticamente.

## Correções incluídas
1. `PageTransition`: mantém conteúdo visível no primeiro frame. Evita que o envelope de página zere opacidade, fenômeno compatível com o relato de flash escuro Android. Não promete resolver outros flashes na camada nativa; requer aceite visual.
2. Modal de explicações: backdrop escuro 95%, sem fase inicial invisível; preserva diálogos, close, fontes e recibos de evidência.
3. PharmaLens / Brain / Visual Studio: títulos e atalhos de produto claros, sem números internos V7/V8 na UX principal. Caminhos, modelos e contratos anteriores continuam ativos.
4. PharmaLens e Brain: concordância pt-BR nos resumos de janela (dia/dias, relato(s), registro(s), melhora(s)/piora(s)) sem mudar números ou fontes.
5. Teste histórico Brain V7 revisado para conferir destino real **e nome público correto**, em vez de apenas procurar o token interno `Brain V7`.

## Restrições mandatórias
- Nenhuma alteração de dose, estoque, prescrição, aquisição, identificação pessoal, cálculo clínico, alerta, classificação regulatória, consentimento, sincronização, banco, Supabase, Dexie ou notificações.
- As versões técnicas continuam nos nomes de arquivos, rotas e diagnósticos; remove-se apenas texto de navegação para o usuário.
- A correção de flash e a opacidade exigem validação visual e acessibilidade no APK; testes de código não são homologação Android.

## Próximos pacotes — não declarar concluídos
- P5 P2: auditoria do SOS confirmado e dos alertas de risco versus prazo burocrático, com exemplos fictícios e políticas clínicas fundamentadas.
- P5 P3: detalhes em três domínios, Fênix, PharmaLens evidências/tempo e integração M152B sob opt-in, sem inventar uso de lote ou wearable.
- Acessibilidade global BottomNav/retorno/primeira dobra e revisão completa de outras telas com `(s)` permanecem abertas.
