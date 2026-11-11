# VAULT M121 — Continuidade 360 + preparo para consulta

## Escopo
- Horizonte 7/14/30 dias derivado do **mesmo** `CareCommandSnapshot` do Brain, não de novas leituras Dexie.
- Eventos vencidos, próximos, sem data e exigências documentais explicitamente ausentes; estados desconhecidos NÃO são convertidos em pendências ou prazos.
- Ações de aquisição planejada/estoque projetado permanecem projeções, sem movimentar estoque ou marcar entrega.
- Painel de comparação factual desde consulta **realizada**, filtrado por conta e pessoa, usando doseLogs, registros e documentos de saúde do contexto atual; não faz inferência de mudança farmacológica nem inclui diário privado.
- Botão de preparo atualiza somente as escolhas locais do Relatório 360 (data e modo de consulta), que mantém prévia e exportação opt-in.
- Preserva M119, M120, Brain V5/6, Home, Hoje, autoridades de estoque, receitas, SUS, exportação e sincronização.

## Critérios de aceite
- Nenhum novo banco, ledger, mutação clínica, envio remoto ou regra SUS universal.
- Nenhuma relação ou tratamento criado automaticamente.
- Seleção por conta/pessoa; sem dados misturados.
- Datas ISO válidas; 7, 14 e 30 dias; acima de 30 não é exibido como evento próximo.
- Suítes M118/M119/M120 preservadas; suíte M121 adicionada ao gate.
- Aplicação só após M120 publicada e remote em sincronia.
- Gate completo e TypeScript antes de commit/push automático.

## QA físico pendente
- Android hardware: navegação e retorno, fontes ampliadas 320/360 px, offline/retomada e geração real de PDF. Não são certificados por testes puros.
- PWA READY e compilação APK são processos externos após o push.
