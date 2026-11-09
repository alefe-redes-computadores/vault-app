# VAULT M103 P1 — Auditoria de privacidade e recuperação (09/11/2026)

Base exigida: `db6d2650041fd404f2312c942e5737147c4b7c3a` (M102 P4).

## O que mudou

1. **Plano de segurança pessoal**: chave nova por conta + pessoa, sem migração silenciosa do formato antigo que não registrava conta. Existe importação manual em duas etapas e somente quando não existe plano da conta ativa. O sistema grava e verifica o novo conteúdo *antes* de remover a chave anterior. Não apaga um plano antigo em caso de falha de importação. Nenhuma informação é enviada automaticamente a serviços de emergência, familiares, Brain ou servidores.
2. **Exportação**: o backup JSON de saúde e credenciais agora é identificado com precisão como arquivo **não criptografado**. O navegador apenas recebe um pedido de download; o app não afirma poder comprovar a presença do arquivo no dispositivo.
3. **Offline PWA/React**: avisos não presumem que todas as rotas/documentos/anexos foram armazenados; não declaram a fila sincronizada apenas por estarem sem conexão.
4. **Prontidão em Mais**: resumo recolhível de conta ativa, pessoa ativa, conexão e fila, com acesso a recuperação, plano de segurança e relatórios. Sem mais leituras da base de dados nem rede.
5. **Regressões**: V329 reforçada para testar a identificação da conta (não removida), V22–V24 preservadas; novo teste hermético dedicado.

## Limites e validação real

- **Não criptografa** `localStorage` nem JSON; separação por chave não substitui criptografia ou autenticação. O plano antigo só pode ser atribuído à nova conta com confirmação manual do usuário; não há como verificar de quem era uma chave legada.
- Não há alteração de Supabase, migração SQL, doses, sincronia ou notificações nativas.
- Compilar e rodar `npm run test:release` no Termux. Em aparelho, testar troca de conta e pessoa, importação legada, exportação real no Chrome/Android e PWA offline/reconexão.
- Publicação de código no GitHub não homologa o APK nem autoriza publicação comercial/Google Play.
- Recuperação offline e exportação não equivalem a backup íntegro verificado.
