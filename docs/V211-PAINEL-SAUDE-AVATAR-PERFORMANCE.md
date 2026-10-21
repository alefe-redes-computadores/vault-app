# V211 — painel de saúde, Avatar e performance

- Uma projeção isolada por conta/pessoa indexa registros recentes e aparelhos.
- O último registro de cada métrica e cada aparelho passam a ter consulta O(1).
- Registros futuros, métricas fora do painel e dados estrangeiros não entram no resumo.
- Aparelhos ativos e arquivados são separados uma única vez.
- A navegação para a rede de saúde usa verde relacional; a água preserva sua identidade própria.
- O Avatar ilustrado usa os tokens do tema, alinhado ao modo 3D e sem cinzas fixos nos controles.

O contrato V211 cobre isolamento, ordenação temporal, mapas, arquivos ativos/arquivados, integração da página e fallback visual.
