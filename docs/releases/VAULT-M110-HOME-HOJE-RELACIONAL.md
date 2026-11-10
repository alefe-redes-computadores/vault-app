# VAULT M110 — Home + Hoje relacional, leitura limpa

Base obrigatória: `a718360f8ecfcb71e2262ea9cf898e645ece3dd9` (M109 R2).

## Mudanças
- Home: quarto indicador mostra **Concluídas**, contando somente a rotina realmente confirmada; mantém quatro indicadores e API legada para outros consumidores.
- Home: data ISO da última aquisição exibida em `DD/MM/AAAA` sem escrever em banco ou interpretar fuso.
- Home: preserva o card «Ação agora», cards coloridos de Tratamentos, aviso de segurança e fila de prioridades já separada na M109.
- Acessos secundários: menor densidade vertical, cores por categorias e alvos táteis preservados.
- Hoje: agenda prévia usa os formatos e cores da própria medicação, vindos do modelo da timeline existente.
- Hoje: tocar no horário de uma dose leva ao grupo e aplica o filtro **Pendentes**, respeitando hora e pessoa.
- Hoje: link de `status=tomados` abre a lista no recorte de tomadas; chip deixa claro qual filtro está aplicado e permite limpar.
- Hoje: Brain posicionado depois do cabeçalho/filtros da rotina, porém antes da fila extensa de doses (contrato clínico legado preservado).
- Tratamentos: sem mudar vínculos, categorias visuais para médico (azul), hospital (rosa) e local de saúde (verde).

## Fora de escopo por segurança
Não altera dose, estoque, receita, retirada, CID, vinculação de tratamento, banco, Supabase, algoritmos do Brain ou notificações nativas.

## Pendências para homologação de uso real
- Confirmar no aparelho que o filtro Tomadas retorna todas as doses de 10:00 já marcadas.
- Confirmar PWA e APK no Hoje, incluindo abertura por notificação e troca de pessoa.
- Revisar casos de vínculo de tratamento zerado/medicamento ausente com registros observáveis; esta cirurgia não cria vínculos por semelhança.
- Conferir PDF pessoal da M108 em Android real.
- O gate completo e TypeScript devem passar antes de qualquer push; build Android ainda exige teste visual.
