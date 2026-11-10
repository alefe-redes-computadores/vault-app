# VAULT M112 — Brain V5.2 · continuidade, correlação e segurança

Base prevista: `864032bb8a386849091dc09a974036e1ea99464f` (M111 publicada). Implementação aditiva; nenhum tratamento, dose ou dado clínico é escrito.

## Inclusões
- Alerta **condicional** de revisão em manutenção com ≥3 dias anteriores consecutivos de doses programadas *explicitamente marcadas como ignoradas*, sem tomada registrada nesses dias. Esse padrão não prova interrupção real. Sem histórico completo ou horário cadastrado, não gera evento.
- Motivos de dificuldade de acesso apenas quando constam explicitamente em `DoseLog.motivo` por enum estrito. Estado de retirada `agendada` é apenas compromisso; não é entrega nem retomada comprovada.
- Observação de sintomas vinculados a desvenlafaxina/Pristiq quando coincidem com dia(s) de doses programadas explicitamente ignoradas. Não diagnostica descontinuação, crise ou causa do sintoma.
- Correlações de dose extra/SOS de estimulante com uma lacuna **documental** de manutenção, ou registro de sedativo em 24h. Não infere intenção de compensação, bloqueio de recompensa, intensidade, tóxicos, pico ou crash.
- Identidades estáveis do Brain V5 e sinais independentes por associação. `material_fingerprint` existente preservado. Evidências limitadas/constantes para evitar alterações a cada minuto ou novo dia sem mudança material de categoria.

## Segurança e escopo
- Observações clínicas usam usuário autenticado `user_id`, `person_id` e IDs reais de medicamento. Dados sem proprietário completo não geram novos insights.
- Relatos livres **não** são usados para inferir ideação suicida ou descrever abstinência. Qualquer regra futura de crise deve exigir estado estruturado, consentimento, auditoria clínica e acesso humano.
- As mensagens recomendam buscar prescritor e atendimento de urgência se sinais importantes, sem prescrever/retomar/alterar dose.
- Os alertas aparecem nas telas existentes do Brain, sem novo modal intrusivo, novo tipo de notificação, novo armazenamento ou rede.
- O módulo só atua no dia local atual. Replays históricos e projeções futuras não geram alertas de urgência presentes.
- Sem mudanças em `DoseLog`, `reconcileBrainV5`, `brain_v5_alert_ledger`, Firestore, Supabase, Health Connect, mensagens e sincronização.

## Limitações intencionais
- Não inclui estimativa de concentração, meia-vida individual, `Tmax` pessoal nem janela de crash; esses valores não demonstram o estado clínico nem autorizam decisões automáticas.
- Não transforma sintomas em diagnóstico, não classifica barreira administrativa com base em processos não concluídos e não pressupõe o efeito ou motivo de uma dose extra.
- Contagens de episódios V5 só mudam quando há novos sinais ou mudanças reais na regra, não por progresso do relógio.

## Homologação
1. Confirmar casos sem logs; com três dias explicitamente ignorados; com tomada no mesmo dia; ausência de horário; outra pessoa/conta; replay antigo; motivos desconhecidos.
2. Confirmar sintomas vinculados e não vinculados, medicação extra e sedativo com tomada comprovada.
3. Conferir comportamento real no Android: latência, estado offline, duplicações do ledger, resumo do Brain e segurança da cópia clínica.
4. Verificar se um relato real sem DoseLogs não aparece como interrupção confirmada: o aplicativo deve pedir revisão do registro, não inventar eventos.

## Fontes para revisão
- SAMHSA TIP 63, methadone missed dosing and clinical reassessment: https://www.samhsa.gov/sites/default/files/pep21-02-01-002.pdf
- FDA / DailyMed desvenlafaxine discontinuation warnings: https://www.dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=56c9e8ee-1460-4a4c-8033-65d9afb358c8&type=display
- FDA Vyvanse label cardiovascular symptoms: https://www.fda.gov/media/142073/download
