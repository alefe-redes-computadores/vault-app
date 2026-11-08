# VAULT 360 — Roadmap consolidado e caderno de decisões

**Data da consolidação:** 08/11/2026

**Última base publicada verificada na pesquisa:** M96 — commit `8d7c52a7064e0bcdd9cae8a79bf86308f3dd9a30`.

**Status:** PLANEJAMENTO; nenhuma implementação ou publicação do M97 em diante é declarada neste documento.

**Fontes da consolidação:** pesquisa comparativa Medisafe/Pillo de 08/11/2026, inspeção do VAULT M96, diretrizes do usuário e proposta revisada Brain V5.1/CareEpisode. Consulte `VAULT-PESQUISA-MEDISAFE-PILLO-ROADMAP-2026-11-08.md` para as referências, URLs e detalhes das comparações.

## 1. Visão de produto

O VAULT nasceu como **cofre de documentos, cartões e credenciais** e amadureceu como ambiente **pessoal de saúde e cuidado**. Os dois núcleos devem coexistir com arquitetura e acesso claros. O futuro nome/marca permanece decisão aberta; **não renomear nem migrar identificadores agora**. O diferencial a conservar é a combinação de documentos + medicamentos + doses reais + receitas + acesso SUS/fornecimento + tratamento longitudinal + Brain auditável + PDF + Avatar + sensores, sem sacrificar os básicos: confiabilidade de lembretes, relatórios fáceis e gestão de pessoas.

Princípios obrigatórios:
1. Fonte da verdade de tomadas: `DoseLog` original; ausência de log ≠ dose ignorada; estoque zerado ≠ interrupção clínica confirmada.
2. Brain determinístico como autoridade dos alertas; LLM futura apenas para síntese restrita de fatos e alertas auditados, nunca diagnóstico ou dosagem.
3. Inferência clínica, relato pessoal, fato confirmado e ausência de dados têm rótulos diferentes; alerta urgente não é suprimido pela consolidação em episódios.
4. Android offline-first: Dexie e fila de sync, isolamento `user_id` + `person_id`, sem automatizar envio de dados médicos.
5. Samsung Health/Health Connect: origem e horário rastreáveis, frescor, permissões e limitações; **automático não significa 100% preciso**.
6. Mobile-first, dark premium, Lucide, safe-area, velocidade, compatibilidade PWA e APK, acessibilidade e degradação graciosa.
7. Cada cirurgia entrega testes comportamentais, `tsc --noEmit`, release gate, `git diff --check`, escopo allowlist, backup/rollback; commit e push apenas se aprovada.

## 2. Comparativo: o que aproveitar (sem copiar código proprietário)

**Medisafe:** inspiração para perfis dependentes separados de acompanhantes, agenda organizada, compartilhamento por e-mail e relatórios, exportação tabular e fluxo de preparação para consulta. O cadastro de médico já guarda e-mail no VAULT; falta integração do destino com o exportador. O Medisafe e seu catálogo são proprietários: só usar comportamento/documentação pública como referência.

**Pillo:** inspiração para lembretes muito perceptíveis, confirmação rápida, adiamento, opções de som/privacidade e métricas de bem-estar. Não copiar mascote/arte. Alarmes exatos, tela cheia, Doze e otimização de bateria têm limites próprios do Android, exigindo homologação **em aparelho físico**, nunca promessa de alarme infalível.

**VAULT M96 já tem:** doses/SOS/estoque/tratamentos, Pessoas por perfil, Brain V5.1 com projeção conservadora de episódios, M95 PDF mensal, `Medico.email`, `deliverPdf` com Share nativo, `ReportShareComposer` textual, Health Connect Samsung read-only (sono, peso, pressão, frequência cardíaca média diária, oxigenação, caminhada; leitura até 28 dias). Não possui ainda compartilhamento médico integrado, CSV/JSON clínico, papéis clínicos completos de dependentes, alarme persistente equivalente ao Pillo nem catálogo completo de sinais vitais.

## 3. Sequência definitiva de macrocirurgias

### M97 — Brain V5.1-B + catálogo de evoluções (P0)
**Escopo:** camada de correlação cruzada conservadora para episódios multi-sinais (somente evidências documentadas: fornecimento/doses ignoradas + sintomas + mudança SOS); sem diagnosticar causa. Qualificação `documented_fact`, `unconfirmed_gap`, `user_reported_state`, `pharmacological_risk_hypothesis`. Manter sinais atômicos e rotas. Criar catálogo local versionado de capacidades do VAULT/Brain com `título`, `versão`, `o que mudou`, `o que faz`, `evidências necessárias`, `limitações`, `exemplo`, `área`, `status homologado`. Colocar entrada compacta em Inteligência; catálogo só revela versões que estão efetivamente instaladas/publicadas.
**Gates:** omissões não viram interrupção; relações temporais não viram causalidade; mesma pessoa/conta; duplicatas; idempotência; não suprimir interação urgente; regressão M95/M96.
**Dependências:** M96 publicada — CONFIRMADA.

### M98 — Central de relatórios e envio consciente ao médico (P0)
**Escopo:** central única acessível em Linha de Cuidado, Relatórios e Médicos; período livre e presets 7/30/90 dias/mês; escolher pessoa, medicamentos, doses, medições, sintomas, consultas e documentos opcionais. Três modos:
- **Factual:** eventos e horários realmente registrados (planejado vs confirmado), sem inferências.
- **Factual + Brain:** alertas persistidos com severidade, evidência, fonte, momento de detecção, recorrência e limitações, sem criar retrospectivos.
- **Resumo para consulta:** primeira página de leitura rápida seguida do anexo detalhado.
Exportar PDF, CSV e JSON estruturado; usar e-mail já cadastrado no médico como **sugestão editável**, nunca enviar automaticamente; share sheet ou app de e-mail com confirmação explícita. Versão pública sanitizada do documento só por ação voluntária.
**Gates:** dados isolados por pessoa; CSV com escaping/injection safety e fuso; PDF paginado; conteúdo e filtros correspondentes; funcionamento offline; nenhum envio alegado sem confirmação do cliente de e-mail; campos sensíveis omitidos por padrão.
**Dependências:** M95, M97 catálogo/snapshots quando Brain selecionado.

### M99 — Lembretes Android premium, opcionais e auditáveis (P0)
**Escopo:** 3 comportamentos configuráveis (`suave`, `reforçado`, `persistente` quando o Android permitir); UX de ação `Tomar`, `Adiar`, `Ignorar` usando slot canônico e guarda de quantidade da M94; visibilidade de alarmes, som, vibração, privacidade em bloqueio, hora quieta/dirigindo, diagnóstico de permissões e economia de bateria. Não reusar alarmes para criar doses novas.
**Gates:** testes com tela bloqueada, Doze, reboot, mudança de hora/fuso, permissões ausentes, Android 14+, APK real; fallback transparente; não emitir confirmação de ingestão só por abrir notificação; evitar repetições agressivas e proteger uso de tecnologia assistiva. **Não prometer toque infinito ou bypass de restrições do sistema.**
**Dependências:** M94 central de avisos, V277 slots isolados; evitar build pesado no Termux.

### M100 — Pessoas, dependentes e cuidado compartilhado seguro (P1)
**Escopo:** melhorar cadastro/edição e hierarquia de Pessoas. Distinguir titular, dependente gerenciado e acompanhante/contato de apoio; vínculo de parentesco/relação opcional, permissões declarativas e fluxo de revogação. No primeiro passo, organização local e UX de troca de perfil. Compartilhamento remoto apenas com autorização explícita, convite auditado, RLS testada, isolamento por conta/pessoa e revisão de regras para menores.
**Gates:** nenhum vazamento entre pessoas; cofre (`VaultMember`) não concede permissão clínica; remover acesso revoga de fato; apagar e exportar por perfil; cadastro básico não fica mais complexo para uso individual.
**Dependências:** modelo `Person`, `PersonContext` existentes; migração backward-compatible.

### M101 — Samsung Health / Health Connect 2.0 + medições (P1)
**Escopo:** auditoria funcional dos tipos disponíveis por permissão e dispositivo (sem presumir que relógio/anel disponibilize tudo); ampliar gradualmente passos, HRV, estágios de sono, atividade e glicemia **somente quando houver fonte suportada**; complementar registro manual. Identificar origem Samsung, tipo de importação, aparelho quando possível, frequência de atualização, janela de cobertura e recência. Criar histórico de sync e tratamento de lacunas/duplicações; 28 dias atuais como limite de base a rever com permissão explícita.
**Gates:** unidades, fusos, dedupe, granularidade (média diária ≠ leitura pontual), permissões revogadas, dados ausentes, fallback PWA, orçamento de CPU/bateria e testes com relógio/anel reais.
**Dependências:** atual `health-connect` read-only e `HealthMetric` (6 métricas).

### M102 — Avatar Vivo + Brain acompanhamento seguro (P1)
**Escopo:** melhorar olhos/face/pele/proporções/expressões do Avatar com renderização sob demanda e fallback 2D; humor somente por registro e com frescor identificado; corpo/equipamentos/cirurgias só com evidências e consentimento. Brain V5.1: follow-ups opcionais 24–48h vinculados ao episódio e a respostas estruturadas, SEM reutilizar `feedback` simples como armazenamento de sintomas. Check-in sensível oferece contato de apoio/192/188 sem presumir intenção. Notas de reações adversas pessoais separadas de contraindicações clínicas.
**Gates:** memória e snapshots versionados, privacidade, sem diagnósticos, cooldown e opt-out, performance em Galaxy Android, acessibilidade/reduzir movimento, dados do wearable não alteram arbitrariamente a aparência.
**Dependências:** episódios M97, dados M101, calendário e histórico M95.

### M103 — Fechamento, qualidade e preparação comercial (P2)
**Escopo:** auditoria UX global com cenários realistas de primeira utilização, fluxo de emergência, histórico/relatórios, perfil familiar, lembretes, docs/cofre, Android/PWA, sincronização e recuperação; catálogo de novidades separado de release do APK. Avaliar nome, posicionamento, onboarding, suporte, política de privacidade, portabilidade LGPD, termos e assinatura futura.
**Monetização futura (não agora):** Avatar/temas opcionais, templates e relatórios avançados, armazenamento adicional ou colaboração segura; **não bloquear alertas críticos ou segurança essencial por assinatura**. Não utilizar publicidade segmentada por informações clínicas.
**Gates:** homologação APK físico, PWA, offline/reconexão, integridade, RLS, LGPD e políticas Google Play. Nenhuma publicação comercial automática sem etapa própria de aprovação.

## 4. Backlog básico não deixar escapar

- Cadastro/edição de médicos: e-mail já existe, CTA de relatório direcionado e histórico de consultas relacionadas.
- Pessoas: relação, responsável/contato, hierarquia compreensível sem excesso de abas; default não misturar dados.
- Medicamentos: semântica contínuo/SOS/curso temporário, lembretes configuráveis, sintomas/reação adversa registrada e explicação de quantidade de referência (não 'dose segura').
- Medições: unidades, origem manual/automática, intervalos de referência meramente descritivos, proveniência e histórico visual.
- Relatórios: filtros claros, preview, seleção de campos, resumo de um página, PDF detalhado e exportação crua.
- Notificações: diagnosticar motivo de falha, configurar por medicamento, não piorar a segurança com repetição assustadora.
- Documentos e credenciais: preservar como núcleo independente e seguro; separar dados de saúde de segredos e cofre em exportação.
- Evoluções: `CHANGELOG.md` técnico + catálogo de capacidades em linguagem comum; status publicado somente após gate.

## 5. Estratégia de execução e versionamento

1. Uma macrocirurgia por vez, com escopo explícito e minimização de arquivos sobrepostos. Não iniciar outra se `main` divergiu ou houver stage/tracked edits não previstos.
2. Antes de cada intervenção: verificar SHA HEAD local/remoto, histórico de migrações, código vivo e gates antigos. Testes herméticos de recursos sensíveis e `tsc --noEmit` são obrigatórios.
3. Alterações de banco: migração idempotente, compatibilidade com dados anteriores, rollback conservador (sem apagar registros), RLS e sync offline.
4. Entrega: ZIP em Downloads, SHA256, LEIA-ME, instalador e backup. Publicar apenas após gate verde; nunca `git add -A`.
5. Depois de publicar: registrar no `CHANGELOG.md`, `README.md`, docs/ da versão e catálogo de capacidades (somente homologadas). Anexar ao relatório o HEAD e o status PWA/APK, **não presumir que APK atualizado porque `main` mudou**.
6. No hardware real: comparar layout APK/PWA, abertura da notificação, baterias, Health Connect real e compartilhamento de PDF; só depois marcar como homologado.

## 6. Estado, decisões e próximo passo

| Item | Estado (08/11/2026) |
|---|---|
| M95 — histórico dose + relatório mensal | PUBLICADA (verificada) |
| M96 — CareEpisode Core conservador | PUBLICADA (verificada) |
| Pesquisa Medisafe/Pillo + Samsung | CONCLUÍDA, com relatório de fontes |
| M97–M103 | PLANEJADAS, sem código/deploy |
| Nome/marca comercial do VAULT | ABERTO, sem mudança imediata |
| MVP de monetização | ADIADO até confiabilidade Android, privacidade e UX |

**Próxima cirurgia autorizável quando o usuário pedir:** M97 — Brain V5.1-B + catálogo de evoluções. Ao implementar, revalidar `main` e ajustes surgidos desde 08/11/2026; este plano não substitui auditoria do código atual.

## 7. Referências

Fontes e URLs detalhados em `VAULT-PESQUISA-MEDISAFE-PILLO-ROADMAP-2026-11-08.md`. Este documento distingue requisitos e desejos dos usuários, funcionalidades confirmadas no M96, recursos dos concorrentes conforme suas páginas públicas, e decisões de roadmap **ainda não implementadas**.
