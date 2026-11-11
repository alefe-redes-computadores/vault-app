# VAULT M116 — Ajustes prioritários do cuidado, sem reconstruir M114/M115

Base obrigatória: `25893e7f21de2826ff3874938571e30c05e5fc42`.

## Entregue nesta cirurgia

1. Retira o valor presumido de `14:00` do campo de horário da unidade SUS; o usuário escolhe explicitamente hora e fonte. Nenhuma regra regional inferida ou sincronização falsa.
2. Contato de apoio rápido no plano de segurança, mesmo quando o plano cifrado está bloqueado. **Só** contato previamente cadastrado, com telefone válido, seleção e consentimento expresso para uma cópia **não criptografada** de nome e telefone, separada por conta/pessoa, salva apenas no dispositivo. Link `tel:` abre o discador; não liga automaticamente. Desativar apaga a cópia; mudanças no contato original são identificadas quando o plano é desbloqueado.
3. Após salvar explicitamente um registro de humor *muito triste*, apresenta uma escolha discreta de acompanhamento (ir aos lembretes), acesso ao plano de apoio e conclusão. A tela só aparece depois do sucesso da gravação e **não** cria lembrete automaticamente, não classifica risco e não lê relatos privados.
4. Testes dedicados de isolamento, consentimento, normalização de telefone, regressão de 14h e contrato do pós-salvamento, integrados ao gate existente.

## Limites e homologação real

- O telefone de acesso rápido fica legível no armazenamento local **porque o usuário autorizou esta exceção de privacidade**. Não confundir com a criptografia do restante do plano. Aparelho desbloqueado e código malicioso continuam fora do modelo de proteção.
- Contato de confiança só funciona se estiver registrado previamente. O app não contata terceiros, monitora crises ou sugere doses.
- A M115 ainda precisa de teste físico no Android: suspensão/reabertura, permissão/canais, deep links, biometria, offline e cofre. Esta cirurgia não certifica isso.
- Revisão por ID exato do registro de origem de cada insight Brain exige contrato distinto por tipo de evidência. Não inventar ID/rota. A aba de contexto anterior permanece inalterada.
- Janelas SUS continuam locais e sem alertas únicos nem sincronização; comparações estruturadas de atividades e refinamentos da UI antiga permanecem em QA/roadmap.
- Não escrever dados reais em testes; o gate usa fixtures sintéticas.

## Aceite

HEAD/`origin/main` exatos, árvore limpa, SHA de blobs da base, backup e rollback seletivos, `git diff --check`, contrato M116, TypeScript `--noEmit`, gate global e checagem de versões. Publicar em etapa separada somente após `VALIDADA LOCALMENTE`.
