# VAULT CareFlow 360 R2 — Contexto e Retorno Premium

Base auditada: R1 publicada no commit `7f5e700af9d5209b5c0d295f49eeaa799598aa14`.

## Escopo

- Pressão arterial: seleção explícita e opcional de consulta e sintoma da mesma pessoa, mantendo a medição canônica separada dos vínculos CareFlow. Não diagnosticar nem relacionar por coincidência de data.
- Se o vínculo contextual falhar depois da medição canônica, oferecer reparo com o mesmo ID de evento. Não registrar outra medição para reparar um vínculo.
- Dossiê: busca completa da projeção carregada, filtros 7/30/90 dias, agrupamento por dia, links apenas para IDs válidos da pessoa e PDF condizente com o filtro. Se houver mais de 500 eventos, pedir refinamento em vez de exportar PDF truncado silenciosamente.
- Atendimentos: voltar contextual com consulta e modo preservados, âncora da linha do tempo, ícones por categoria, contexto de pressão na jornada.
- Projeção CareFlow: traduz vínculo de pressão com dados reais, valida sintoma por owner/person e recusa inferir causalidade ou inventar informações ausentes.

## Fronteiras e validação

Nenhuma mudança em Home, Hoje, Medicamentos, Fênix, BottomNav, Dexie schema, Supabase, estoque, doses, notificações ou regras de diagnóstico. As únicas gravações seguem os repositórios canônicos existentes, mediante ação humana.

Executar diagnóstico isolado **focado**: R2 + R1 + M3 P3 + TypeScript global + `git diff --check`. O V63 recebe o novo contrato, mas **a lista integral de centenas de testes não é reexecutada nesta cirurgia**. Essa limitação é exposta na aprovação local.

Os testes estáticos e de projeção não substituem homologação manual do Android: 320/360/393/430dp, abrir pressão, associar um sintoma e consulta da mesma pessoa, testar retorno, exportar PDF filtrado, verificar teclado/Safe Area. Não realizar eventos fictícios nos dados reais do usuário.
