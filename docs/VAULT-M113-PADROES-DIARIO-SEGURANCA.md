# VAULT M113 · Padrões, Proteção Humana e Expressão Emocional

Base exigida: `c4baa2af354ff267618c9dfdb14b5a0de9027575` — M112 publicada.

## Contratos e limites

1. O `buildPatternTimelineM113` é uma projeção `readOnly` de registros existentes. Inclui doses explicitamente tomadas/ignoradas, retiradas com status conhecido, sintomas, sono e humor informados. Exige owner/person e IDs; nunca interpreta ausência de DoseLog como falha de adesão. Não acessa rede, Dexie, IA, notificações ou banco. Não altera o ledger Brain V5.
2. A tendência descritiva só é mostrada para o mesmo sintoma, com pelo menos dois **dias distintos** com intensidade válida em cada metade dos últimos 14 dias, diferença de pelo menos 2 pontos. Isso não é triagem de suicídio, diagnóstico, causalidade, prognóstico nem indicação de medicamento. Nenhuma análise de pensamentos íntimos por palavra-chave é realizada.
3. A Central de Inteligência recebe a projeção do mesmo `HealthInsightContext` autenticado usado pelos episódios M96 e correlações M97, sem leitura adicional nem nova autoridade clínica. O painel oferece acesso explícito ao plano de segurança existente, sem ler seu conteúdo.
4. A nova página do diário tem texto livre e notas opcionais para ajudar a conversar com terapeuta. O armazenamento **é localStorage não criptografado**, só é acionado depois que a pessoa confirma expressamente o risco de salvar neste aparelho. Não há sincronização, backup automático, envio ou interpretação pelo Brain. Excluir notas é possível. O rascunho não é salvo sem consentimento.
5. O resumo para terapia depende de **seleção individual** das notas e opção separada para incluir a cronologia. A prévia vem antes do botão Copiar; nenhum contato recebe mensagem automaticamente. Compartilhamento posterior é responsabilidade da pessoa, que deve revisar a prévia.
6. O plano de segurança já existente (`/saude/plano-seguranca`) preserva seus próprios dados. Em urgência, a UI indica atendimento humano; não há classificação automática de risco, falsa garantia de segurança nem sugestão de mudança de dose.
7. Não há alterações nos contratos M112/M111, assinaturas Android, autenticação, Supabase, doses, sincronização, notificações, receitas ou relatórios existentes.

## Homologação

- Termux: cirurgia valida hashes, isolação de contas/pessoas, regressões comportamentais, TS e gate canônico. Não publica.
- PWA/APK: checar navegação Central → painel → diário/plano; troca de conta/pessoa; salvamento somente após consentimento; exclusão; cópia seletiva; funcionamento offline; impressão de data em pt-BR; limitações legíveis.
- Aviso: a nota salva em localStorage pode ser acessada por quem tiver acesso ao armazenamento do aparelho desbloqueado. Esta etapa não implementa criptografia. Para relatos especialmente sensíveis, não salvar sem avaliar essa limitação.
