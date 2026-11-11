# VAULT M123 — Fechamento global Android, recuperação e notificações

Escopo aditivo. Autoridades clínicas, dose logs, estoque, sincronização, Brain V5/6, Fênix/3D e atualizador M117 continuam intactos.

## Ensaio seguro de recuperação

A função `inspectEncryptedM123` abre a cópia M115 somente em memória, valida a frase por meio do motor M114 e usa a MESMA checagem de estrutura da importação M115. Retorna apenas contagens resumidas. Não escreve no localStorage, não importa e não substitui dados. Ao importar de fato, o fluxo M115 original continua exigindo cofre vazio e confirmação.

O controle de clipboard só limpa manualmente quando a cópia ainda é idêntica à exportada pelo Vault. Nunca remove conteúdo mais novo copiado por outro aplicativo. Limpeza de clipboard não revoga dados já lidos por aplicativos externos. O dispositivo pode conservar histórico de clipboard.

## Laboratório de notificações

Prévia exclusivamente local dos lembretes de saúde personalizados, com escopo de conta/pessoa e regras já existentes. Mostra títulos e corpos da mesma forma que o agendador M115, canal privado/normal, próxima ocorrência, horário de silêncio e permissões. Não dispara, agenda, limpa, salva ou muda permissões. É uma prévia de configuração, não uma garantia de recebimento ou captura fiel da tela bloqueada.

## Android, desempenho e gate

Script de prontidão estática protege contrato da assinatura APK, instalador nativo, export Capacitor e workflow. Não substitui compilação física, instalação real, monitoramento de ciclo de vida nem QA em dispositivo. `run-vault-impact-m123.cjs` roda suíte menor antes de TypeScript e do gate integral. O gate canônico continua intacto e recebe apenas o contrato M123. A compilação Android CI permanece acionada após publicação, sujeita às verificações do próprio workflow.

## QA manual pós-publicação

1. APK: bloquear plano e diário, suspender, alternar apps, voltar e confirmar nova solicitação da frase.
2. Testar cópia cifrada válida, frase incorreta e cofre com dados; ensaio não deve modificar nada.
3. Copiar backup, depois copiar texto em outro aplicativo e testar que o Vault não apaga o texto novo.
4. Prévia de notificação normal versus check-in privado, com permissão ativa/inativa e silêncio cruzando meia-noite.
5. Fontes Android 130%+, 320/360 px, leitor de tela, teclado, navegação com uma mão, safe area e rotação.
6. Verificar workflow Compilar APK Vault, buildCode/versionName/assinatura/sha, download, cancelamento, permissão de instalar e retorno do sistema.
7. Reiniciar offline/online; nenhuma alteração de dado clínico, sincronização inesperada ou compartilhamento automático.

Sem Keystore obrigatório nesta cirurgia: a chave por senha/recuperação cifrada continua como autoridade. Um wrapper Keystore futuro depende de ensaio nativo em dispositivo e recuperação entre reinstalações.
