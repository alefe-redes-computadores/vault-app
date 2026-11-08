# VAULT — Benchmark Medisafe, Pillo e roadmap 360
**Pesquisa:** 08/11/2026 · **Base de código verificada:** M96, commit `8d7c52a7064e0bcdd9cae8a79bf86308f3dd9a30`

## Sumário executivo
O VAULT começou como cofre de documentos e credenciais, e hoje é um sistema pessoal de saúde com doses canônicas, tratamentos, receitas, SUS/fornecimento, histórico, Brain V5.1, PDF mensal, Avatar e ponte Samsung Health/Health Connect. A comparação mostra que o diferencial não é apenas ter mais módulos: é conseguir **dados confiáveis + ação simples + continuidade clínica + apresentação clara**.

- **Medisafe:** referência em organização familiar, compartilhamento com médicos, relatórios, horários, gerenciamento de dependentes e acompanhantes. Fora dos EUA passou a exigir assinatura em 01/01/2026, com teste de 14 dias e preços anunciados de US$ 4,99/mês ou US$ 39,99/ano. Seu Help Center declara que relatórios por e-mail suportam intervalos do último ano e, naquele momento, apenas CSV.
- **Pillo (pitcrew Inc., app Android `xyz.rtrvr.pillo`):** referência em lembrete persistente, personagem, confirmação/adiação, variedade de alarmes e rastreadores de pressão/glicose/peso/hidratação/humor. Há controle de apresentação, privacidade na tela bloqueada, ajuste de horários por dia da semana, adiamento em direção e espaçamento opcional de doses. É gratuito para medicamentos ilimitados com anúncios; gestão de dependentes e verificadores premium ficam no plano pago.
- **VAULT:** diferenciação em documentos, prescrições, retiradas, tratamentos, fonte da informação, eventos de estoque, Brain evidenciável, episódio de cuidado, PDFs clínicos e histórico offline. Faltam principalmente **compartilhamento direcionado ao médico, exportação estruturada CSV/JSON, UX clara de dependente/cuidador, diagnóstico robusto de alarmes e mais métricas Health Connect**.

## Comparação do produto versus código atual
| Área | Medisafe | Pillo | VAULT M96 verificado | Decisão |
|---|---|---|---|---|
| Agenda de medicamentos, SOS, estoque | Sim | Sim | Sim | Refinar fluxo e precisão, não refazer |
| Alarmes persistentes e ação na tela | Alertas de dose | Destaque forte, Time-Box, sons, adiamentos | Notificações isoladas e central de preferências; não há garantia equivalente ao Pillo | Prioridade alta: modo opcional persistente, nativo, fallback, segurança de Android |
| Dependentes | Perfil de dependente (gerenciar) e Medfriend (acompanhar) | Gestão de dependentes premium | `Person` e seleção de pessoa; não há vínculo de parentesco/responsável no tipo `Person` | Separar paciente, responsável e acompanhante, sem herdar automaticamente permissão clínica |
| E-mail do médico + envio | Fluxo de relatório por e-mail | Relatórios/trackers | `Medico.email` existe e PDF/Share nativo existe; falta destino e seletor de dados integrados | Entrega rápida: preparar relatório, selecionar destino, compartilhar explicitamente |
| Relatório estruturado | CSV até 1 ano no Help Center | Histórico e relatórios | PDF mensal M95, relatório 7/30/90, texto para consulta | Incluir CSV e JSON por intervalo, modo factual versus com Brain |
| Saúde longitudinal | >20 tipos de medições no Premium, segundo loja Google | Pressão, glicose, peso, água, humor | `HealthMetric`: sono, peso, pressão, pulso, oxigenação, caminhada | Expandir catálogo e UI de medições manual/automática com proveniência |
| Integração relógio/anel | Varia por plataforma | Não confirmado no site pesquisado | Health Connect Android/Samsung, leitura por origem Samsung | Ampliar com permissão e device metadata, sem alegar 100% de precisão |
| Análise evidenciada | Interações farmacológicas | Checkers de segurança | Brain V5.1 com episódios, alertas e evidências | Diferencial do VAULT, conservar regras auditáveis e limites |
| Cofre de documentos/credenciais | Não é foco principal | Não é foco principal | Já existe | Preservar como módulo separado; discutir nome/branding sem refatoração arriscada |

## Código VAULT inspecionado
- `lib/types.ts`: `Person` tem `id,user_id,name,email,phone,avatar_url,color,isDefault,created_at,updated_at,synced`; **não possui** `relationship`, `dependent_of`, `guardian_id` ou perfil de cuidadores. `Medico` inclui `email`. Há `VaultMember.permission` (`view`,`edit`,`admin`) no cofre, o que **não** cria automaticamente autorização para tratar dados clínicos de dependentes.
- `components/saude/ReportShareComposer.tsx`: compartilha resumo textual pela Web Share API / clipboard. `lib/pdfExport.ts` já oferece `deliverPdf` via Capacitor Share, que não é envio automático de e-mail. `lib/clinical-month-report.ts` e `lib/clinical-month-pdf.ts`: base do PDF M95; `app/saude/registros/page.tsx` oferece exportação mensal.
- `lib/health-profile/types.ts`: métricas canônicas atuais `sono`, `peso`, `pressao_arterial`, `frequencia_cardiaca`, `oxigenacao`, `caminhada`.
- `lib/health-connect/types.ts` define exatamente os seis tipos, origem Samsung `com.sec.android.app.shealth`; `native/health-connect/VaultHealthConnectPlugin.kt` usa leitura **read-only** de dados Samsung, até 28 dias. Importa duração do sono, peso, PA, SpO2, sessões de caminhada e **média diária** de frequência cardíaca — não passos ou HRV. `lib/health-connect/normalize.ts` limita a 31 dias de antiguidade e preserva origem/ID. `HealthConnectPanel` exige confirmação do usuário e recomenda não atribuir a um relógio/anel uma medição cuja origem individual seja desconhecida.
- `lib/health-intelligence/version.ts`: versão do Brain tem trilha própria (`6.11` na base inspecionada); não confundir com M96 ou versionCode Android.
- `lib/updates/release-registry.ts`, `components/updates/VaultUpdateCenter.tsx`: novidades de releases Android, com estado da Action separado da versão certificada; diferenciar do novo catálogo de **capacidades do Cérebro**.

## Itens novos prioritários
### 1. Central de exportação e compartilhamento clínico
Um único ponto de entrada, acessível por Relatórios, Médicos e Linha de Cuidado. Compositor inclui período livre, seleção de perfil, medicamento(s), medições e registros, anexos opcionais, status e destinatário **pré-preenchido** do `Medico.email` cadastrado (mas editável e confirmado). Modos:
- **Factual:** cronologia de tomadas/ignoradas, horário planejado versus real, quantidade, medicamentos, sintomas, medições e informação ausente. CSV/JSON e PDF;
- **Com Brain:** mesmo conteúdo factual + alertas realmente persistidos, severidade, evidências, janelas de comparação, limitações, feedback, fonte regulatória, revisão e resumo explicável. Não tratar inferência como fato nem exportar alerta retrospectivo falso.
- **Para consulta:** resumo 1–2 páginas antes do anexo detalhado. Para o Android, preparar PDF local, acionar share sheet, pré-selecionar e-mail quando o sistema suportar; não confirmar envio sem retorno do aplicativo de e-mail, nem permitir envio automático sem autorização.
- Registro de compartilhamento opcional, sem copiar indevidamente anexo médico para o histórico remoto.

### 2. Alarmes à la Pillo, mas com segurança e controle
Reaproveitar IDs de slot canônico, dose e notificações existentes. Modo opcional `suave | reforçado | persistente`, jamais obrigatório; preferências por medicamento, perfil e hora; ação explícita `Tomar / Adiar / Ignorar`, sem transformar abertura da tela em confirmação de ingestão. Disponibilizar silencioso/modo direção, respeitar políticas do Android e controles de privacidade. Persistência até ação **sem prometer tocar indefinidamente**: Android 14+ restringe alarmes exatos e full-screen intents; requer checagem de permissão especial e fallback. Diagnóstico por usuário: permissão, canal Android, economia de bateria, boot, fuso, último disparo, próximas doses, testes do canal. Nunca usar dose extra como forma de silenciar alarme; considerar erro/quantidade atípica no fluxo.

### 3. Pessoas, dependentes e acompanhantes
Separar `Pessoa do perfil` versus `Responsável por administrar medicação` versus `Acompanhante/Medfriend` com autorização e revogação. Inicialmente evolução de UX do perfil local e da relação familiar; **não habilitar compartilhamento remoto** sem RLS, consentimento, convites auditados, perfis de menor, provas de autorização, matriz de permissões e isolamento por pessoa. Acesso `view-only` do acompanhante não concede marcar doses. O modelo de cofre (`VaultMember`) não deve ser reaproveitado de forma automática como permissão clínica.

### 4. Saúde conectada 2.0
Expandir painel de sinais vitais e hábitos gradualmente: passos, HRV se disponível, estágios do sono, energia/atividade, glicose medida por dispositivo compatível ou entrada manual, nutrição básica e observações. Para cada valor: fonte do app, identificador único, device metadata **se fornecido**, tipo manual vs automático vs desconhecido, horário de medição, atualização, intervalo de cobertura e prioridade da fonte. Não inferir que toda origem Samsung veio do Galaxy Ring; Samsung Health consolida fontes. Health Connect tem permissões explícitas por métrica; leitura histórica e em background dependem de permissão específica. Sem reescrever dados lidos no Health Connect, sem duplicação, sem assumir precisão clínica.

### 5. Evolução e aprendizado das capacidades do Brain
Criar um catálogo offline versionado `BrainCapabilityRelease` para mostrar `o que mudou`, `o que já detecta`, `evidência exigida`, `exemplo demonstrativo`, `limitação`, `quando ficou disponível`; distinto do `CHANGELOG.md` (técnico) e do `VaultUpdateCenter` (versão de APK). Habilitar status público apenas depois de gate e commit aprovados, não a partir de M97 só planejada.

## Roadmap recomendado após M96
- **M97 — Brain V5.1-B + Catálogo de capacidades:** correlação cruzada documentada, filtro epistemológico, comparações explicáveis; catálogo de evolução, sem alterar a autoridade dos detectores nem silenciar alertas urgentes.
- **M98 — Relatório 360 + médico:** central de exportação, PDF factual/com Brain, CSV/JSON estruturados, seletor de intervalo/perfil, compartilhar via app de e-mail e WhatsApp explicitamente; política de dados e testes de isolamento.
- **M99 — Lembrete persistente opcional:** investigação Android nativa (AlarmManager, permissão exata/full-screen quando cabível, canais, bateria, reboot/fuso), novo UX de tomar/adiar/ignorar, teste de bloqueio/tela apagada/doze, nunca falsear entrega.
- **M100 — Pessoas, medições e Health Connect 2.0:** papéis de pessoa local, relações e consentimento preparatório; expansão progressiva de métricas; proveniência e freshness. O acesso remoto de cuidadores exige etapa própria de segurança antes de ir ao público.
- **M101 — Avatar Vivo + Brain follow-up:** voltar à evolução facial e de expressão baseada em registros, sem diagnósticos; check-ins estruturados opt-in e relatórios longitudinais. M100/M101 podem ser reorganizadas para preservar a prioridade do Avatar.
- **Gate final:** regressões legadas, TypeScript, pacote Android real, testes de alarmes em aparelho com economia de bateria, testes offline, RLS e compartilhamento de dados, reentrada, sincronização e exclusão/portabilidade LGPD.

## Segurança e distribuição comercial
- **Não cobrar por alertas críticos nem colocar continuidade clínica essencial atrás de paywall.** Monetização futura opcional: temas/Avatar, templates premium, backup criptografado, colaboração familiar autorizada, relatórios profissionais avançados. Não monetizar por publicidade baseada em dados de saúde.
- **Medições vestíveis não são 100% precisas por serem automáticas.** A Anvisa alertou em 2026 contra o uso de anéis inteligentes para diagnosticar doenças; a Samsung ressalva uso de bem-estar. Health Connect transporta dados, não atesta qualidade clínica.
- Google Play exige declaração de apps de saúde e política de privacidade acessível; dados de saúde são sensíveis sob LGPD. Se o produto evoluir para recomendações médicas ou diagnósticos, avaliar enquadramento sanitário/regulatório antes de distribuir.
- **Código-fonte:** Medisafe é comercial/proprietário; não foi encontrado repositório oficial completo do Pillo. Documentação de ambos é pública, mas isso não autoriza copiar implementação. Projetos abertos como OpenVitals (AGPL-3.0-or-later) são referência arquitetural; reutilização de código requer análise específica da licença, especialmente se VAULT for comercial.

## Fontes principais (consultadas em 08/11/2026)
1. Medisafe download e recursos: https://medisafe.com/download-the-app
2. Medisafe Google Play e Premium: https://play.google.com/store/apps/details?id=com.medisafe.android.client
3. Medisafe assinatura fora EUA: https://help-center.medisafe.com/en/articles/13052285-medisafe-is-now-a-fully-paid-app-for-users-outside-the-u-s
4. Medisafe dependentes vs Medfriend: https://help-center.medisafe.com/en/articles/9708717-what-is-the-difference-between-medfriend-and-dependent-profiles
5. Medisafe relatório e email: https://help-center.medisafe.com/en/articles/8103174-how-can-i-share-a-report-of-my-medication-history
6. Medisafe report + trackers: https://help-center.medisafe.com/en/articles/8102533-how-can-i-send-a-report-of-my-tracker-history
7. Pillo oficial: https://pillo.care/about
8. Pillo FAQ (alarme, privacidade, direção, tempos): https://pillo.care/faqs
9. Pillo Time-Box: https://pillo.care/blog/discover-pillo-pill-timer
10. Pillo Google Play: https://play.google.com/store/apps/details?id=xyz.rtrvr.pillo
11. Android 14 alarmes exatos: https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
12. Android 14 full-screen: https://developer.android.com/about/versions/14/behavior-changes-14
13. Samsung Health ↔ Health Connect: https://developer.samsung.com/health/health-connect-faq.html
14. Samsung Health Data SDK, distribuição com aprovação: https://developer.samsung.com/health/data/process.html
15. Google Health Connect tipos de dados: https://developer.android.com/health-and-fitness/health-connect/data-types
16. Health Connect metadata e origem: https://developer.android.com/health-and-fitness/health-connect/metadata
17. ANVISA, anéis inteligentes (27/08/2026): https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/aneis-inteligentes-nao-devem-ser-usados-para-diagnosticar-doencas
18. Google Play política apps de saúde: https://support.google.com/googleplay/android-developer/answer/16679511?hl=pt-br
19. LGPD direitos do titular: https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd
20. OpenVitals AGPL: https://github.com/OpenVitals-mtu/OpenVitals/blob/main/README.md

**Nota de evidência:** itens baseados no código são confirmados na `main` M96 inspecionada; funcionalidades de competidores são verificadas em páginas públicas deles; o roadmap é proposta e **não** implementação nem homologação.
