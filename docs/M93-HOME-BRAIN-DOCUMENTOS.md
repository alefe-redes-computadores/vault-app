# VAULT M93 — Home, Brain e Documentos

Base: M92 (6ab91a4a9fa6c4c3f4feee859df60e385e4905f2).

## Escopo

- Home: discriminação entre compromissos de hoje e retiradas vencidas; breakdown em uma coluna, sem half-width para uma única seção; navegação preservada.
- Brain: projeção exclusiva do insight clínico **já existente** `quantidade-confirmada-*`, com consulta futura da mesma pessoa, acesso ao histórico e feedback idempotente da autoridade atual. Não calcula dose segura, não diagnostica, não modifica doses ou estoque.
- Cofre: retira ação de adicionar duplicada no cabeçalho, mantém o FAB e estados vazios.
- PDF: estado de exportação de largura fixa, mensagens fora da toolbar; exportação nativa via Filesystem Cache + Share Sheet; PWA via jsPDF save; fallback textual honesto quando captura visual não estiver disponível.
- Acervo: mês atual por padrão; meses futuros com dados documentais continuam acessíveis mas vão ao final e recebem sinalização de data futura.
- Testes: contrato próprio M93, suíte V176 e gate global `npm run test:release`, TypeScript, verificação do stage, HEAD e assinatura do pacote.

## Limites

- A confirmação do registro é somente 'conferi as informações', nunca confirmação de segurança clínica.
- PDF de resumo visual/textual não incorpora automaticamente o conteúdo binário dos anexos.
- Download/salvamento é controlado pelo chooser Android; não instala ou altera outros aplicativos.
- Homologação manual PWA e APK permanece necessária.
