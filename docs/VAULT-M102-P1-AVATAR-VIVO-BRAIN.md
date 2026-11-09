# VAULT M102 P1 — Avatar Vivo e acompanhamento Brain V5.1

## Fontes de verdade
- `avatarBodyContext` segue dono da expressão do rosto: humor **explicitamente registrado** em 3+ dias, predominância de 2/3. Nenhum wearable determina o humor e a M102 não altera essa regra.
- `projectAvatarPresenceM102` comunica quando o último relato de humor foi feito, qual a cobertura nos últimos 7 dias e que a representação é ilustrativa. Não é detecção facial nem leitura emocional contínua.
- O Avatar 3D existente permanece com GPU sob demanda e fallback 2D, sem nova animação obrigatória ou renderização em background.
- `BrainFollowUpM102` acompanha **somente um alerta Brain V5 existente** e uma escolha voluntária de voltar ao VAULT em 24 ou 48 horas. Não cria novo episódio clínico nem adia alertas, tratamentos, doses, receitas ou medicação.

## Privacidade e controle
- A preferência de revisitar guarda somente versão, hash técnico não criptográfico do alerta/episódio e timestamps. Não registra sintomas, relatos, resultado clínico, gravidade, medicação ou identificação do dispositivo. É armazenada no localStorage do navegador, dentro do contexto de conta e pessoa.
- Não é criptografia. A preferência não sincroniza entre dispositivos e não gera alarme/notification/botão de tomada; o usuário precisa **abrir a tela** para rever.
- Requisição inválida, dados corrompidos, episódio resolvido ou idade acima de 14 dias são ignorados. Cancelamento é explícito.
- Registro do estado de saúde é encaminhado ao formulário **já existente** de humor; Brain mantém evidências e prioridade próprias, sem manipulação.

## Exclusões intencionais
Não foram implementados: notificações de follow-up em background, compartilhamento familiar clínico, interpretação automática de emoções, terapia ou conduta, alterações visuais arbitrárias com HRV, fotos processadas, diagnóstico ou um novo banco clínico. A evolução posterior poderá avaliar follow-ups estruturados server-side, após RLS/consentimento e contrato de segurança.

## Gate
Validar TS global, test-vault-m102-p1-avatar-brain, regressões anteriores e `npm run test:release`. Se falhar antes do commit, rollback de apenas 4 arquivos rastreados e 6 novos. Se falhar o GitHub depois do commit, preservar commit local e repetir somente `publicar.sh`.
