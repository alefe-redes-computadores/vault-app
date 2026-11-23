# VAULT 360 — Relatório Mestre Geral Integral | A11 MACRO1 + Work + Guardian

**Corte de evidências:** 22/11/2026 (horário de Brasília). **Último HEAD confirmado antes desta candidata:** `f393b06e317b0c2d722b77275d108038679529e2` — `feat(vault): A10 integral 360 e Guardian G2 fechamento clinico`. **Repositório:** `alefe-redes-computadores/vault-app`. **Pacote em elaboração:** `VAULT-A11-INTEGRAL-360-MACRO1-F393B06`. **Regra:** relatório não equivale à publicação, homologação física ou revisão independente.

## 1. Resumo executivo e decisão de segurança

A A11 não substitui as autoridades clínicas A0–A10, a sincronização do Vault, os escritores de DoseLogs, o motor de notificação ou o Avatar 3D. A MACRO1 é a **camada de instrumentação e bloqueio de certificação**: diagnóstico local por conta+pessoa, oráculos puros para conflito entre aparelhos, inventário de riscos do Storage legado, verificações de Android/reduced motion/notificações, suíte de regressão permanente, harness autenticado 2×2 com fixtures fictícias e analisador do OOM Vercel. Fornece ao Guardian um protocolo de STOP/GO por evidência, e nunca cria dados clínicos ou interpreta sucesso de contagem como paridade remota.

**Diferença vital:** implementação e testes de código são uma coisa; certificação física e produção web saudável são outra. A Action Android #2208, SHA `f393b06`, teve **conclusão `success`** em consulta externa. O deployment Vercel do **mesmo SHA** terminou **`ERROR: out_of_memory`**, `npm run build` finalizado com `SIGKILL`. Consequentemente, **A11 FINAL CERTIFIED = NÃO**. Não houve alteração de SQL, RLS, bucket, arquivo real ou deploy durante a elaboração desta candidata.

A arquitetura e esta MACRO1 são **aditivas e somente de leitura**, exceto a própria instalação local de código. A segurança só receberá mudanças de política ou cutover de Storage depois de compatibilidade e teste negativo com tokens reais. A idempotência global das sessões M5 **não está comprovada** sem dois aparelhos e concorrência remota.

## 2. Fonte de autoridade e estado cronológico

| Marco | Evidência | Estado no corte |
|---|---|---|
| V34ZF Work 360 | `8ff952f59a4f64971ee646489935f025b796a061` | Código publicado, experiência física não aprovada por inferência |
| A7/M5 + Guardian GA-01/GP2 | `941f82a042b0670d99fc2f08e21acabb59747e11` | Código publicado; histórico SQL A7/M5 reconciliado |
| Guardian GA-02…GA-07 | `2a950bd1415be7182275e4c9194bac492f01a830` | Código publicado; oito arquivos de fixes clínico/UX |
| A10 Integral 360 + Guardian³ G2 | `f393b06e317b0c2d722b77275d108038679529e2` | Código publicado; 27 caminhos, V63 com 556 contratos |
| Android #2208 | Action 45095890574, mesmo SHA `f393b06` | **success**, sem prova de instalação física |
| Vercel `dpl_DcdssQaRGoMq24AzEkhrqgTGgV1R` | mesmo SHA `f393b06` | **ERROR: out_of_memory**, PWA não confirmada READY |
| A11 MACRO1 (este pacote) | base congelada `f393b06` | **Candidata; teste local global e Guardian futuros, zero publicação** |

**Hierarquia de fontes:** HEAD/árvore Git e recibos prevalecem sobre textos antigos; migrações remotas exigem verificação própria; sucesso CI não equivale a APK físico; `BUILDING` da Vercel não vira `READY`; testes herméticos não viram segurança JWT real.

## 3. Governança entre frentes e atribuições

**Frente Clínica (A0–A10):** preserva autoridade de escrita, histórico versionado, relações por ID, eventos imutáveis, planejado vs realizado, fontes regulatórias candidatas e interpretação não diagnóstica. Internação A5, reabilitação M5, jornada A7, vacina A8 e A9 **já possuem implementações**, não recebem reimplementação na A11.

**Frente Work/UX:** responsável pelas telas e comportamentos específicos de Exames, Pressão, Home, tratamentos, seletores, navegação, Fênix premium, animação e ergonomia. A A11 não sobrescreve esses arquivos; adiciona entrada na Central de Diagnóstico apenas. Módulos Work devem ser reconciliados por hash se o HEAD avançar.

**Guardian² (auditoria anterior):** validou sequência dos commits, reconciliação de SQL histórico GA-01, proteção estrutural RLS A7/M5, locks A8/M5, seleção A9, GA-02 a GA-07. Apontou G2-01 (teste permanente), G2-02 (sucesso de atualização de exames), G2-03 (plurais), GP2 residuais, Vercel e testes externos faltantes. G2-01/G2-03 foram tratados pelo Guardian³ publicado; G2-02 continua como pendência do Work, a ser verificada por novo commit e gate.

**Guardian³ (fechamento clínico):** adicionou teste clínico GA-01 ao V63 e corrigiu `sessão(ões)`, `horário(s)`, `registro(s)`, sem alterar writer M5. A publicação `f393b06` inclui o fechamento. O teste dirigido G2 não vira contagem artificial de contrato V63.

**Guardian A11 (nova passagem independente, ainda por executar):** revisará a nova suíte, a ausência de mutações clínicas, o isolador de pessoa, os riscos de Storage, a matriz 2×2 e a correspondência de SHA/CI/Vercel. Deverá reprovar qualquer afirmação de paridade real inferida de snapshot sintético. Aceite de código e autorização final de release são decisões separadas.

## 4. Matriz A0–A11: autoridades existentes, reaproveitamento e pendências reais

| Área | Autoridade mantida | O que falta provar / concluir |
|---|---|---|
| A0 integridade | Supabase, Dexie, ownership, Storage | buckets legados públicos; RLS 2×2 JWT; migração compatível |
| A1 multiprofissional | profissionais, conselhos e vínculos por ID | seleção e isolamento 2×2 em aparelho |
| A2/Work UX360 | Home, Hoje, menus, Lucide, cores por entidade | compacto sem ícone, indicadores zerados, 320–430 dp |
| A3 Receitas/fornecimento | fatos de aquisição e retiradas | paridade offline e vínculo histórico, sem inferir estoque |
| A4 Tratamentos | fases A1/A4, DoseLogs | conflito e versões entre aparelhos, prescrição imutável |
| A5 Internações | `hospitalizations_a5`, eventos e vínculos | jornada no APK e links do PDF com cenário adversarial |
| A6/M5 Reabilitação | `rehab_*_m5`, recorrência autorizada | duplicação entre aparelhos antes de sincronizar |
| A7 cirurgia | eventos A7, intenções A7/M5, evidências | E2E e documentos privados; não inferir procedimento realizado |
| A8 vacinação | cursos, doses, retificação e comprovantes | RLS/Storage, sincronização e correção entre aparelhos |
| A9 procedimentos/reação | A9 e correções, fontes declaradas | testes de seleção cruzada e invalidade de vínculo |
| A10 longitudinal | fatos A0–A9, Brain V5/V7, PharmaLens P4-E, Fênix | performance, privacidade real, paridade PDF/aparelho |
| **A11** | nova instrumentação, Oracle e gates | **homologações externas/físicas + PWA READY** |

Nenhum módulo desta matriz é reescrito com um segundo writer. O histórico de publicação continua tendo prioridade sobre o cronograma que chamava A8 ou A9 de “futuro”.

## 5. A11.1 — Diagnóstico local por identidade e pessoa

**Nova rota:** `/diagnostico/a11`, acessível pela página `/diagnostico`, com ícones Lucide, alvos mínimos de 44 px, layout mobile-first, CTA esmeralda e zero violeta fora do Brain. Ela só é acionada depois de autenticação e seleção da pessoa. A leitura retorna **contagens**, não registros, nomes, datas de atendimento, documentos ou links de Storage.

**Fontes amostradas:** DoseLogs, vacinação A8, reabilitação M5, internações A5, jornada A7, procedimentos A9, fila Dexie por payload `(user_id,person_id)`. A coleta usa índice composto `(user_id,person_id)` e revalida `persons.get(personId)` após awaits. Fonte indisponível = `null/indisponível`, nunca contagem fabricada `0`.

**Isolamento de interface:** token monotônico e comparação do escopo antes de `setState`; troca de conta/pessoa reseta snapshots, checklist, erro, cópia e estado transitório. O botão de copiar expõe somente quantidade, cobertura `local_counts_only`, timestamp e observação de insuficiência. Nada sobe à nuvem automaticamente.

**Limitação:** mesmo contagens locais iguais entre dois aparelhos não atestam valores, histórico, tombstones, autoria nem fila do outro aparelho. O comparador P13 existente tem janela de 14 dias e limite de 30 mil doses explicitamente declarado; a A11 não se baseia nele para atestar histórico integral.

## 6. A11.2 — Oráculo determinístico de divergências

`lib/a11/parity-oracle.ts` compara snapshots sintéticos da mesma conta/pessoa entre A, B e nuvem usando **tipo + ID real**, estado de tombstone, fingerprint informado e indicador de pendência. Recusa pessoa/conta divergente, ID duplicado, evento sem ID ou fingerprint, e mantém categorias explícitas: igual, só A, só B, só nuvem, divergente, tombstone conflitante, pendente e leitura incompleta.

O resultado traz `coverage: incomplete` se uma origem não garantiu leitura exaustiva. Uma reexecução M5 com mesmo slot em dois caches independentes devolve `safeToClaimGlobalIdempotency=false`: ela **não corrige** concorrência entre aparelhos. Não existe reconciliador/writer adicional, merge automático, deduplicação remota fictícia, trigger ou migração nesta entrega.

## 7. A11.3 — Storage e documentação privada

**Consulta real Supabase (metadados somente):** `clinical-private` com `public=false`; `vault-attachments`, `saude`, `documents`, `avatars` com `public=true`. O código legado `lib/supabase/storage.ts` mantém upload clínico para bucket público e `getPublicUrl`; M3 utiliza `clinical-private` para novos assets. A existência de RLS para metadados e INSERT/UPDATE não torna o endpoint `/public/` privado.

`lib/a11/storage-compat.ts` classifica URLs por origem HTTPS exata e caminho reconhecido: público clínico, avatar público, candidato privado ou não reconhecido. Não verifica autorização, não baixa bytes e não expõe paths. O relatório `VAULT-A11-STORAGE-COMPATIBILIDADE.md` lista os consumidores reais, canário, URLs assinadas, hash dos bytes, redirecionamento, aparelhos antigos, migração e rollback. **STOP** para alternar buckets públicos ou mover arquivos antes do teste negativo real 2×2 e da prova de compatibilidade.

## 8. A11.4 — Android, notificações e energia

`lib/a11/android-observability.ts` lê observações explícitas: runtime web/Android/iOS, largura CSS, movimento reduzido, visibilidade e estado de rede, **sem requestAnimationFrame**, câmera, GPS ou permissão nova. Uma largura 320–430 px gera rótulo de alvo, **não** selo TalkBack ou GPU. A conferência física testa rolagem/teclado/Voltar, ícones compactos, safe area, redução de movimento do Avatar, bateria/GPU, biometria, permissões, Doze e atualização assinada.

`lib/a11/notification-oracle.ts` diferencia intenção, agendamento e entrega observada. `scheduled=true` nunca permite `ready=true`; a ausência de opt-in/permissão com agendamento é contradição. Sem um telefone físico e permissões reais não se declara que Doze, Local Notifications ou Health Connect foram homologados.

## 9. A11.5 — Testes RLS 2×2 autenticados, sem dados pessoais

`scripts/a11-rls-2x2-readonly.mjs` recebe por ambiente local **duas contas fictícias distintas**, quatro pessoas fictícias e quatro DoseLogs fictícios preexistentes. Autentica clientes independentes, confirma que cada titular lê seus próprios registros, consulta IDs do outro titular esperando **zero linhas**, e verifica filtros por pessoa da mesma conta. Se não existem fixtures, **bloqueia**. Nenhuma senha, email, ID clínico ou token é impresso no resultado; não usa `service_role`, SQL DDL ou mutação de dado.

O script não autentica RLS de Storage nem prova isolamento de pessoa pela RLS se a política por conta permite as duas pessoas: isso pertence ao teste separado de fixtures binárias e ao guard no cliente. Concluir a auditoria SQL (políticas, SECURITY DEFINER, Storage grants, views), mais ensaios de download, exige autoridade remota, revisão de migracões e aprovação do Guardian. Um SELECT sem erros não confirma todas as políticas do projeto.

## 10. A11.6 — Vercel, CI, release e diagnóstico operacional

**Android:** `.github/workflows/build-android.yml` usa Node 22, `npm ci`, V63 estrito, TypeScript, export Next/Capacitor, patch Android/Health Connect, assinatura debug estável e versionCode baseado no run. Action #2208 (SHA f393b06) **success**. APK físico, atualização instalada, assinatura, notificações e performance continuam pendentes.

**Vercel:** os deploys nos SHAs `8ff952f`, `941f82a`, `2a950bd` já falharam com `out_of_memory`/`SIGKILL`. O deploy do SHA `f393b06` também terminou `ERROR: out_of_memory` após iniciar `Creating an optimized production build ...`. Essa evidência aponta para saturação de memória do build; **não determina** se o fator primário é Next, Sentry, número de workers, número de páginas, cache ou plugin. Uma alteração especulativa de `next.config.js` pode apenas mascarar o sintoma ou introduzir regressões.

`scripts/a11-build-oom-diagnose.cjs` analisa um log fornecido localmente e indica sinais OOM/SIGKILL/estágio/Sentry sem alteração de configuração. Próximo experimento controlado: build isolado por SHA, aferir pico RSS e PID(s) de workers, flags explícitas, comparar cache frio/quente, Next 14.2.5 e custo de sourcemaps; manter a publicação PWA em **STOP** até um deployment `READY` do mesmo SHA. Não executar rede ou deploy só para obter selo.

**Certificação:** `scripts/a11-certification-gate.cjs` exige 14 provas, com SHA completo, tipo de fonte apropriado e referência externa. Ele valida estrutura, **não autentica** capturas; o Guardian faz revisão independente e concede autorização. `docs/VAULT-A11-EVIDENCE-TEMPLATE.json` começa com tudo `not_tested`, sem aprovações artificiais. Nenhum script gera release automaticamente.

## 11. Gate de regressão e engenharia anti-colisão

A MACRO1 introduz `scripts/test-vault-a11-integral-360.cjs` no V63. Esperado **557 contratos**: os 556 publicados mais uma suíte A11; nenhum teste existente é apagado, e o V70 Super Integrity + Final Completeness permanece no fechamento do gate. Testes A11 incluem escopo 2×2 sintético, falhas por duplicatas/tombstones/pendência, versão do protocolo, URL de Storage com origem incorreta, fontes de prova falsas, Android de 320/360/390/412/430, notificações, fluxo somente leitura e ausência de violeta no painel.

**Procedimento protegido:** pacote exige `HEAD=origin/main=f393b06` e hashes Git dos arquivos-base exatamente iguais aos da allowlist. Candidata isolada por `git archive`, `node_modules` reaproveitado, diretivos/TypeScript/V63/V70 e `git diff --check`; somente então backup e aplicação local dos arquivos. Nenhum `git add`, commit, push, SQL, bucket update, migração Dexie ou alteração da fila. Novos arquivos conflitantes ou arquivos modificados por Work impedem intervenção. Rollback atua só na allowlist e se o arquivo ainda corresponder ao SHA aplicado.

**Não alegar antecipadamente** que a suíte global passou: o teste dirigido isolado/sintaxe e o autoteste do pacote são provas de preparação; 557/557 no Termux, TypeScript integral e pós-validação precisarão do recibo real do usuário.

## 12. Segurança visual, mobile e privacidade como gates

- Cores de entidade mantidas, CTA esmeralda, violeta reservado a Brain; não inserir violeta no diagnóstico factual.
- Iconografia Lucide, modo compacto não perde sinal gráfico, textos PT-BR humanos, entradas/alvos pelo menos 44 px.
- Sem cards enormes vazios, indicadores zerados em primeira dobra, datas ISO ou chaves técnicas exibidas como evidência clínica.
- Um usuário sem pessoa ativa não vê detalhes e não realiza coleta; carregamento assíncrono de pessoa A não pode materializar após troca para pessoa B.
- Um relatório resumido não inclui nomes, IDs, URI de documentos, medicamentos, senhas, service role ou payloads. Contagens e labels são permitidas como diagnóstico local, com aviso de limitação.
- O modo Android não recebe loops GPU adicionais, chamadas Health Connect não autorizadas ou novas notificações pelo painel de diagnóstico.

## 13. Pendências não apagadas (Work e Guardian)

- G2-02: feedback pós-salvamento de atualização de Exames, atribuição Work; novo writer proibido.
- GP2-01: HomeQuickMetrics fixos/zerados e violeta residual SOS/extra; Work.
- GP2-02: ícone/chevron desaparece em `HealthRelationPicker` compacto; Work.
- GP2-03: profissional por ID no monitor_plan da pressão; requer contrato de sync, não inventar coluna.
- GP2-06: HealthMeasurementForm feedback e alvos táteis, verificar o componente pai antes de duplicar toast.
- GP2-07: violeta nos chips de tratamento da nova consulta.
- GP2-08: data técnica em `CareFlowRelationsR5`, PDF particular da Pressão ainda precisa auditoria.
- GP2-09: sombras/gestos/320–430 dp; verificar fisicamente.
- A11 P0: Storage público legado e falta de prova autenticada; não quebrar links antigos.
- A11 P0: sincronização concorrente e duplicação M5 entre aparelhos; não promover correção não demonstrada.
- A11 P0: Vercel `out_of_memory`; requer solução operacional comprovada, não apenas novo commit.
- A11 P0: Android 2 aparelhos, 2 contas×2 pessoas, RLS/Storage real, Doze, biometria, updates/assinatura, FPS e TalkBack.
- PharmaLens futuro: ingestão regulatória oficial e curadoria humana, sem OCR→registro confirmado automático.

## 14. Ordem recomendada após a candidata

1. **Rodar** `--selftest`, `--fast-preflight`, depois `--apply` na base verificada. Enviar recibo e falhas; sem publicar automaticamente.
2. **Guardian A11** revisa allowlist, 557 V63, V70, TS, `git diff --check` e prova de ausência de mutações. Pode aprovar **código** sem dar selo físico.
3. **Homologação física** preencher a matriz com duas contas/duas pessoas e dois aparelhos de teste. Simultaneamente medir recursos e resolver PWA OOM em canário com plano de rollback.
4. **Storage controlado** só após testes de URLs legadas e Android. Qualquer SQL deve ser indispensável, versionado, revisado e testado, sem `db push` cego.
5. **Certificação final** só com Action Android, instalação física, RLS e Storage negativas, dois aparelhos, Vercel READY e Guardian assinado no **mesmo commit**.
6. **Próxima frente funcional** poderá refinar Brain/PharmaLens/UX pós-homologação sem recriar A5–A9, Fênix ou o prontuário.

## 15. Legenda e vereditos

- **Publicado:** commit existente e verificado em `main`.
- **Preparado:** arquivos em pacote, sem validação no checkout do usuário.
- **Aprovado localmente:** recibo real com gates e hashes, sem implicar push.
- **CI aprovado:** Action do mesmo SHA com `success`, não significa instalado.
- **PWA READY:** deployment verificado com `READY` e SHA idêntico, atualmente **não** atendido.
- **Homologado:** execução real de procedimento documentado; não inferir de testes herméticos.
- **CERTIFIED/GO:** código + CI + aparelhos + segurança autenticada + PWA + Guardian independente, atualmente **não** atendido.

**Parecer final da preparação:** A11 MACRO1 implementa diagnósticos e ferramentas de prova sem interferir no modelo clínico. A aprovação de código depende dos gates do Termux. **A11 integral do produto permanece bloqueada nas dependências físicas e na Vercel**. A arquitetura exige dizer isso explicitamente para não repetir promessas técnicas não demonstradas.
