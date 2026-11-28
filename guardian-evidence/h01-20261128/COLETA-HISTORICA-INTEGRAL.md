# Coleta diagnóstica integral dos contratos históricos
Main 49c3aabde83bf0b2480a84bb5e967922e41975f2 versus candidata 6216a3dcf80d8d4fc94f74fa9bee7ceb8d105b2a. Após a execução original (seis scripts FAIL/FAIL), uma coleta diagnóstica separada instrumentou somente os wrappers de assertions em memória / stdin, mantendo retorno não zero quando qualquer assert falhava. Não alterou os contratos em Git, não é gate de release e não transforma FAIL em PASS.
| Script | Falhas coletadas idênticas main/candidata |
|---|---|
| M106 | M105: ausente; literal de preferências da página Mais ausente; condição literal Nuvem/</details> |
| V16 | literal cards consomem registro regulatório compartilhado |
| V34/V98 | literal de estoque não informado |
| V95.2 | literal Receita n/c |
| G4 | retorno à linha clínica aninhada; filtro domínio nesse segundo nível |
| R3 | condição literal microbanner; literal setSelectedRegulatory(regulatoryProfile) no tratamento/tarja |
Total 10 assertions FAIL nas duas árvores, nenhuma diferença no conjunto coletado. Os dois diagnósticos adicionais de Mais/Nuvem são fora da H01; código dessas superfícies não foi alterado. O G4 contradiz a regra canônica atual de retorno imediato sem encadeamento; encaminhamento Work. No R3, o setter antigo foi substituído antes da H01 por seleção regulatória escopada a conta/pessoa/medicamento. Não reintroduzir setter sem escopo para satisfazer literal. Logs e código do coletor diagnóstico: /tmp/h01-evidence/final-attempt/historical-collect. O V16 já realiza coleta própria e mostrou uma falha em cada árvore.
