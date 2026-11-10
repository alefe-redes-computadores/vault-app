# VAULT M114 C — fechamento de privacidade

- Reconcilia diretamente o commit publicado `ac82040c`; não reaplica M114 A/B.
- Textos do diário e do plano refletem o estado aberto ou cifrado real.
- Sessões cifradas bloqueiam ao ocultar/encerrar o aplicativo e também possuem ação manual.
- Conteúdo descriptografado, frase e rascunhos saem do estado da tela ao bloquear.
- Envelope persistido é reaberto após nova sessão somente com a mesma frase e escopo conta+pessoa.
- Frase incorreta não altera nem remove o envelope.

Não existe recuperação de frase esquecida. O VAULT não envia chaves ou conteúdo a servidores.
