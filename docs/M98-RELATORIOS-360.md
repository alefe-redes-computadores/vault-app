# VAULT M98 — Central de Relatórios 360

## Objetivo

Permitir exportação **consciente, local, por conta e pessoa**, de período e conteúdos selecionados. A M98 mantém o PDF mensal M95 e o relatório clínico legado, acrescentando uma Central 360 em `Saúde → Linha de Cuidado`, no relatório clínico e nos detalhes do médico.

## Funcionalidades entregues

- Períodos: 7/30/90 dias, mês atual e intervalo livre de no máximo 367 dias; filtro por pessoa ativa com verificação de propriedade.
- Seções: medicamentos (cadastro atual, não reconstrução histórica), doses confirmadas e ignoradas explicitamente, sintomas/humor, medições e hábitos, consultas, metadados de documentos de saúde com consentimento específico.
- Modos: **Factual** não inclui Brain; **Factual + Brain** inclui apenas snapshots reais já persistidos com data de primeira detecção, gravidade original, fontes internas, evidências, ocorrências e limites; **Resumo para consulta** inclui síntese inicial e anexos completos.
- Formatos: PDF paginado, CSV com proteção contra fórmulas e escaping, JSON versionado. Gerados localmente; não há API para envio de relatório nem gravação de dados clínicos.
- Médico: busca opcional nos médicos pertencentes à conta; deep link com ID de médico, e-mail apenas como sugestão editável no app de destino. O usuário pode copiar o e-mail e abrir share sheet Android ou baixar no PWA. O VAULT **não** envia, garante recebimento, nem anexa automaticamente o PDF ao e-mail.
- Documentos: **somente título, tipo e data de cadastro** quando marcados; nenhuma senha, cartão, imagem, metadados internos ou anexo é incluído.

## Autoridade e limites

1. `DoseLog` é a verdade de tomada/ignorada. Um evento sem marcação não entra no arquivo; estoque e agenda não viram dose perdida.
2. Não há Brain retrospectivo: `brain_v5_alert_ledger` é filtrado pela pessoa e pela data efetiva de detecção do snapshot original.
3. Consultas conservam `status` original; o cadastro atual do medicamento é explicitamente marcado como cadastro atual, não histórico.
4. Registros de Health Connect mantêm etiqueta de origem. Relatos manuais nunca são convertidos em medição objetiva, e sensor não equivale a precisão clínica garantida.
5. O usuário deve revisar pessoas, período, seções, destinatário e conteúdo antes de compartilhar. O botão para PDF no Android abre o seletor nativo (não é envio automático).
6. Não altera Dexie, Supabase, notificações, cache clínico, dose, estoque, permissão, compartilhamento persistido, esquema ou versionCode do Android.

## Testes e release gate

O instalador verifica base Git M97 exata, origin/main, stage limpo, allowlist, integridade do pacote, simulação das alterações em repositório Git temporário incluindo **todos os novos arquivos e `git diff --cached --check`**, execução hermética da suíte M98 no espelho, teste M98 no projeto, TypeScript global, regressões M97/M96/M95/M94/V214, suíte de release, confirmação do origin, stage estrito e publicação somente com todos os gates aprovados. Backup e rollback limitados aos arquivos M98; se houver commit local mas push falhar, o instalador não executa rollback e fornece comando explícito de recuperação.

## Homologação física necessária

Testar na prática o compartilhamento no Android (Share Sheet/FileProvider), destino de e-mail e permissões de arquivos, além do download PWA, paginação real do PDF com múltiplas páginas e caracteres especiais. Gates locais de código não substituem validação de envio real nem certificam compatibilidade de todos os aplicativos de e-mail.

## Próximas cirurgias

M99: notificações Android opcionais (suave/reforçada/persistente quando permitido). M100: dependentes e perfis familiares. M101: Health Connect ampliado. M102: Avatar + check-ins. M103: auditoria global e preparação pública. Sem alterar o nome VAULT nem cobrar por segurança essencial nesta etapa.
