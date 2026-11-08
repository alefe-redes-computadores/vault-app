# VAULT M92 — Medicamentos Premium 2.0

## Escopo
- A lista mantém seus dados, identidade regulatória, destinos de ação, operações de dose e fonte de estoque. Somente a projeção visual muda.
- Resumo do dia volta ao topo com percentual de doses *confirmadas*; SOS e ignoradas não contam como tomadas.
- A vista padrão mantém os grupos: Atenção, Em dia, Próximas etapas, SOS e Suspensos, com SOS aberto na primeira visita.
- Filtros avançados, panorama, modos de organização e navegação pelos grupos ficam sob expansão voluntária.
- Cards deixam de reservar altura fictícia no cabeçalho; indicadores e aviso de unidade ficam mais densos; ação única utiliza toda a largura sem trocar o handler.
- No formulário Editar, o botão de salvar fica visível nas telas de edição, desabilitado quando não há alterações pendentes. A seção inicial de escolha de assunto não finge oferecer salvamento.
- Formatos visuais adicionais: oblongo inteiro e oblongo com sulco. O sulco é apenas identificação visual e **não** orienta divisão, dose ou uso. O catálogo farmacêutico continua a classificar ambos como comprimido.

## Preservações obrigatórias
Sem mudanças em Dexie, Supabase, documentos, registros históricos, retiradas, doses, prescrição, cadastro clínico ou cálculo de estoque. Os testes M25, M71, M76, V165, P15, M77–M79 e o gate completo de release são mandatórios.

## Limites
A aprovação estática/TypeScript não substitui o teste visual no Android real. A publicação no GitHub não significa que o APK correspondente já tenha sido compilado. M93 (Home/Brain/Documentos) e M94 (Notificações/fechamento) continuam fora do escopo.
