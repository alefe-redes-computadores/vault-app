# VAULT M106 — Primeira dobra premium

Base exata: M105 `55405cc430559f9c5290a0df32e8cf3e7f8d4d88`.

## Melhoria visual

- **Início:** quatro indicadores simultâneos e compactos no mobile; hero e progresso ocupam menos espaço. Mantém contagens reais e SOS separado da rotina programada.
- **Hoje:** prévia de agenda horária recolhida por padrão. Retiradas atrasadas, doses pendentes e acesso ao próximo horário ficam sempre visíveis. Filtros e rotina mantidos.
- **Medicamentos:** menos espaço perdido no progresso, lista, botões e faixa de estoque/tomada; ações de Tomar, Registrar, SOS, informar saldo e continuidade preservadas.
- **Mais:** biometria, lembretes, central de notificações e atualizações ficam na seção expansível. Perfil, pessoa ativa, diagnóstico e sincronização permanecem acessíveis fora da expansão.

## Proteções

- Alterações **somente de JSX, Tailwind e apresentação**; nenhum schema, dose, estoque, sincronização, Supabase, Dexie, Brain ou notificação nativa alterados.
- Anchors exatos, verificação de HEAD remoto e local, allowlist de dez arquivos, backup e rollback apenas desses arquivos.
- `git diff --check`, teste M106, testes direcionados existentes e `npm run test:release` antes de publicar.
- Não executar `git add -A`, `reset --hard`, exclusão de dados locais ou substituição de mudanças concorrentes.

**Estado da entrega:** pacote local preparado, **ainda não validado no Termux nem publicado**.
