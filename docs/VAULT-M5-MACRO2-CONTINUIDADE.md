# VAULT 360 — M5 MACRO2 · Reabilitação Premium 360

**Base canônica:** GitHub `cee9c07d9ea0a5c3d16d514c37becba5005764cf` (M5 MACRO1 já publicada). **Escopo:** M5 MACRO2 sobre as seis tabelas M5 existentes; **não** cria outro motor de sessões, reabilitação, documentos ou sincronização.

## Fechamento funcional

- **Programa:** modalidade declarada, profissional principal do diretório `medicos`, clínica principal `locais`, região do corpo/lateralidade, objetivos, status documentado. Alta e interrupção são eventos humanos distintos, com data/razão. Não presumir alta por ter acabado o calendário.
- **Sessão:** unidade/profissional próprios e equipe existente; exercícios/condutas, evolução funcional, dor antes/depois (0–10 **opcional**), presença, faltas, cancelamentos, remarcações preservadas. Uma sessão realizada não significa melhora clínica.
- **Marcos:** reavaliação, evolução referida, liberação declarada por profissional, encaminhamento a exame, alta funcional relatada, com proveniência explícita, texto e relações opcionais a sessão/consulta/pedido de exame por **ID**. Marcos imutáveis, salvo desativação lógica.
- **Vínculos bidirecionais:** Cirurgias, Consultas, Hospitais, Locais e Rede Multiprofissional mostram programas relacionados por IDs registrados. A5 Internações não existe ainda: a ligação com Internações fica reservada para a autoridade canônica futura, sem criar coluna órfã prematuramente. Relações entre ciclos podem ser N:1, sem dependência da data em comum.
- **Arquivos clínicos:** amplia o modelo M3 já existente `clinical_assets` + `clinical_asset_links` / bucket privado `clinical-private`, com deduplicação por SHA-256, sem URL pública e sem segunda autoridade. Tipos adicionais de vínculo `rehab_program` / `rehab_session` precisam existir no TS, validação local, SQL check/trigger e fila antes do uso.
- **Android:** Home/Hoje exibem apenas sessões agendadas/confirmadas para o dia civil correto. Alarmes nativos somente opt-in, faixa int32 1.890.000.000–1.949.999.999, Quiet Hours e limpeza seletiva dos alertas próprios. Nenhuma alegação de entrega baseada apenas em agendamento.
- **Inteligência e documentos:** Brain longitudinal, Modo Médico e PDF A4 recebem a **mesma projeção factual**, nunca escrevem um segundo evento paralelo. Cores: teal para Reabilitação, Lucide, cartões responsivos, retorno `return_to`, haptics/toasts conforme contratos existentes.

## Banco e sincronização

A migração **`20261121160000_m5_reabilitacao_macro2_premium.sql`** é aditiva, amplia `rehab_programs_m5` / `rehab_sessions_m5`, cria **uma tabela canônica** `rehab_milestones_m5`, amplia os tipos permitidos de vínculos de documentos privados e seu trigger de titularidade. Não executa UPDATE em fatos antigos, não move dados de outras autoridades. Dexie v53 é aditiva e preenche apenas campos ausentes em registros M5 v52, preservando seus fatos, filas e identidades. Supabase deve receber a SQL **após o gate local** e **antes do push**. O instalador bloqueia publicação se SQL não for confirmada.

## Matriz de riscos e aceite

1. Código M5 MACRO1 e A3 já publicados preservados por hash de blob; alterações externas causam bloqueio e reconciliação, não rebase automático destrutivo.
2. Validar `npm run test:release`, TypeScript e teste M5/M5 MACRO2 e A3; verificar `git diff --check` e allowlist. Testes sintáticos/fixture **não** são homologação Android nem RLS real.
3. RLS negativa com duas contas e duas pessoas, inclusive equipe, laudo e milestone; validar o trigger com IDs cruzados. Verificar acesso a anexos após troca de pessoa/logout.
4. Criar ciclo, mudar equipe/local, agendar sessão e remarcá-la mantendo auditoria, marcar realização explicitamente, registrar evolução sem conclusão automática, realizar alta/interrupção com prova humana.
5. Criar/sincronizar/reabrir milestone, teste offline/retry, conflito CAS, tombstone, sync pull de sete tabelas M5; validar legado v52 e zero perda de dados antigos.
6. Documentos: mesmo PDF associado a mais de um registro sem duplicar binário, desvincular sem apagar outro uso, reabrir offline com cache M3.
7. Em 320/360/393/430dp verificar cartão, listas, datas civis, 44px, navegação Android Back, CTA único, `return_to`, sem jargão ou código interno na UI.
8. Alarmes opt-in: concessão e revogação, remarcação/cancelamento, reboot/Doze/permissões/exatidão, sem inferir entrega.
9. Modo Médico + PDF A4, Brain e Hoje devem ter contagens e fatos coerentes, sem números divergentes nem duplicações.
10. GitHub CI e APK físicos do SHA exato após publicar.

## Dependências fora do domínio

- **A4 Tratamentos Versionados:** outra frente; não colidir nem substituir prescrição/estoque/posição de dose.
- **A5 Internações / A7 Jornada Cirúrgica:** adicionar vínculos de internação assim que existir sua autoridade canônica, não criar hoje uma tabela concorrente.
- **H01–H28 (V23), H25–H40 (V24), AP-01–AP-12, CF-01–27, A01–25, SEC/DATA** são matrizes de regressão e prova, não declaração de bugs ativos.
- **D4/HealthReminderReconciler:** integração com mesmo motor e faixa de IDs separada, sem ativar notificação sem consentimento.

**Estado na preparação do pacote:** patch e testes herméticos preparados sobre a base `cee9c07d`; TypeScript integral e gate oficial devem ser executados no Termux. SQL MACRO2, CI, APK e E2E ainda não foram homologados; não confundir com a migração já aplicada da MACRO1.

## Rebase FIX1 (A4 em paralelo)
A4 commit `89716d5d`: manter controles de data e seleção visuais, termos por extenso, gate A4 já registrado no V63. Não substituir por inputs nativos.
