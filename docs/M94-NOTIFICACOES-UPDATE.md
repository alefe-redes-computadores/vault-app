# VAULT M94 — Central de Avisos e Paridade de Atualização

## Escopo

- A tela `/saude/lembretes` apresenta três famílias de avisos: categorias automáticas, regras personalizadas e atualizações Android.
- Categorias e horários usam os controladores existentes. A M94 **não** adiciona tabela de saúde, agenda remota, gatilho clínico ou duplicata de notificação.
- O painel de configuração é deslocado para perto da entrada da página; o painel de antecedências continua recolhível para limitar a altura.
- A aba Mais conserva o comando rápido legado de habilitar avisos e ganha link explícito para personalização.
- A Central de Atualizações existente permanece a autoridade única, com estados da Action, Release certificada, APK instalado, validade `expires_at` quando presente e código diagnóstico. Não há instalação silenciosa.

## Alerta de quantidade atípica

O alerta da dose rápida continua calculado por `assessDoseQuantitySafety`. A M94 mostra valor informado e referência lado a lado, mantendo a referência como dado do cadastro/histórico, nunca indicação clínica. A ação de revisão pode preencher essa referência no formulário, mas **não grava uma dose sem confirmação**. Contatos de urgência e confirmação reforçada permanecem acessíveis.

## Autoridade, privacidade e expectativas

1. **Preferência** é diferente de **permissão**: os seletores da categoria salvam escolhas locais; o Android pode negar avisos mesmo quando a preferência está ligada.
2. Avisos automáticos e regras personalizadas são distintos. Uma dose agendada não precisa aparecer na lista de lembretes manuais.
3. GitHub Actions pode gerar o APK, mas só uma Release certificada autoriza exibir um download pronto. O artefato temporário expira; a Release oficial tem disponibilidade independente.
4. O PWA segue seu próprio processo de atualização. A central não instala APK Android diretamente.
5. As mudanças desta cirurgia são de apresentação e navegação; agendamentos permanecem nas rotinas oficiais do VAULT.

## Homologação manual após publicação

- Abrir Mais > Central de notificações; conferir estados ligado/desligado e regras pessoais.
- Desligar e religar uma categoria, reiniciar a tela e verificar persistência sem duplicação.
- Abrir Central de Atualizações, comparar build instalado, Release e Action; verificar estado com internet e offline.
- Testar permissão Android e retorno do PWA. Nenhuma ausência de permissão deve ser apresentada como sucesso.
- Confirmar o recebimento de um aviso real sem concluir dose ou compromisso automaticamente.
