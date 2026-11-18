# VAULT 360 — RELATÓRIO MESTRE V8 | Continuidade de desenvolvimento
**Corte:** 18/11/2026 (America/Sao_Paulo). Repositório `alefe-redes-computadores/vault-app`, Android/Termux `~/projects/vault-app`, entrega em `~/storage/downloads`. Este relatório é a base para retomar o VAULT em outro chat.

## 1. Estado observado e níveis de evidência
**Último commit confirmado diretamente no GitHub durante a preparação P4-B:** `3608f9124284bcbf12a9d162f58b89612dfa1e94`, assunto `feat(vault): CI360 P6 P3 D3 Brain e cartao de retorno por episodio`.

**UX360 R3 QG1:** o operador informou **510/510 verificações aprovadas** e que estava iniciando a publicação. **A publicação de R3 não estava confirmada pelo GitHub na verificação realizada durante a criação do pacote P4-B**. Sua confirmação dependerá do novo commit na `main`. Não confundir aprovação local com push, deploy Vercel, APK instalado ou homologação visual.

A **P6 P4-B** deste ZIP é candidata: gerada e verificada localmente quanto a integridade e sintaxe, mas a bateria global V63 só pode ser executada no Termux sobre o HEAD real com R3 publicada. Nenhum P4-B deve ser chamado de publicado antes de o operador confirmar commit/push.

Matriz de evidência inegociável: **planejado ≠ implementado ≠ teste local ≠ GitHub ≠ Vercel Ready ≠ APK instalado ≠ homologado em Android**.

## 2. Marcos confirmados pela linha de continuidade
- **Base CI360 P6 P3B** (`851b4020` no corte do relatório V7 anterior): refinou retiradas operacionais e pull documental; não é comprovação de sincronização E2E em dois dispositivos.
- **CareFlow M3**: eventos relacionais de consulta, pedidos/exames, monitoramentos e sintomas; Modo Médico, dossiê, linha do tempo, PDF por escolha do usuário. M3 P1/P2/P3 possuem histórico de publicação, mas cada superfície ainda exige aceite visual Android.
- **P6 P3-A/P3-B**: biblioteca de PDFs locais e correções de integridade por pessoa, sem garantir todos os fluxos nativos.
- **CareFlow P0 R4**: pacote publicado, fechamento funcional e navegação do cuidado; regressões P0 reais exigem validação com IDs antes de declarar casos encerrados.
- **D3 canônica**: publicação `3608f912`, Brain pós-consulta e Cartão de Retorno por episódio, sem segundo motor, sem criação automática de pendências/doses.
- **UX360 R1**: diagnóstico bloqueou antes de executar testes porque já existia `scripts/test-vault-ci360-p6-p3-d3.cjs` no HEAD canônico; checkout foi preservado.
- **UX360 R2**: **500/509 aprovados, 9 falhas**; oito ligadas a asserções de alturas antigas nos cards e uma a catálogo expandido de 22 para 31 rotas; nenhuma instalação.
- **UX360 R3 + QG1**: o operador confirmou **510/510**, correções de contratos de altura com piso tátil, 31 destinos distintos, filtros de nomenclatura pública e relatório de estatísticas. **Push ainda em confirmação neste corte**.

## 3. Superfícies e arquitetura que não se podem duplicar
- `app/saude/pharmalens/page.tsx` delega ao `PharmaLensWorkspaceV7`; navegação e seleção de medicamento já existem.
- `PharmaLensWorkspaceV7` usa Dexie **somente leitura**, consulta por `[user_id+person_id]` e leituras dos logs/relatos em janela de até 30 dias; usa `buildPharmaLensReportV7`, `buildPharmaLensObservationsV7` e `makePharmaLensConsultationBriefV7`. Não atribuir causalidade a fabricantes.
- `PharmaLensGuidedReviewP6` é conferência visual manual de foto e fatos do catálogo, sem OCR automático declarado nessa superfície.
- `PharmaLensDocumentStudioCI360` já tem OCR opcional com TextDetector do aparelho quando disponível, transcrição, extração de candidatos, campos revisáveis e descarte, tudo em memória de tela. **Não criar OCR paralelo, nem uploads automáticos.**
- `pharmalens-document-candidate-ci360.ts` apenas reconhece candidatos; `pharmalens-catalog-audit-ci360.ts` faz a comparação com cadastro/catálogo. `knowledge-resolver-m153p4.ts` resolve fatos por autoridade `declared`, `official_exact`, `official_inferred`, `conflict`, `unknown`.
- `lib/m3/brain-return-d3.ts` e `BrainReturnCardD3.tsx` são a autoridade do retorno pós-consulta. `CareFlow M2`, `clinical-episode-p4` e `consultation` existentes são referências; não gravar eventos presumidos.
- `lib/navigation/clinical-directory-m150.ts` é o diretório ampliado do Explorar. R3 utiliza o Health Hub R5 já existente para favoritos, evitando segunda base.
- QG1 (`scripts/vault-qg1-touch-contract.cjs`) audita mínimo tátil por semântica, não por string CSS fixa; preservar ao evoluir contratos antigos.

## 4. P6 P4-B — cirurgia proposta nesta entrega
**Objetivo:** corrigir ambiguidade entre nome comercial, princípio ativo, apresentação e fonte regulatória; acrescentar recibo de conferência documental versionada com revisão manual.

**Arquivos modificados:**
1. `lib/health-intelligence/pharmalens-document-candidate-ci360.ts` — validade calendárica.
2. `lib/health-intelligence/pharmalens-catalog-audit-ci360.ts` — evitar implicar que ingrediente ativo ou lista de apresentações atesta produto e concentração individual.
3. `components/saude/PharmaLensDocumentStudioCI360.tsx` — componente adicional dentro do escopo OCR existente.
4. `scripts/test-v63-release-gate.mjs` — contrato P4-B registrado uma vez, preservando R3 QG1.

**Novos:** módulo puro `pharmalens-evidence-p4b.ts`, `PharmaLensEvidenceReviewP4B.tsx`, teste `test-vault-ci360-p6-p4b-pharmalens.cjs`, documento técnico e este relatório mestre V8. Sem migrations, sem APIs externas, sem novas tabelas e sem alteração clínica.

O componente apresenta links fixos da Anvisa para **consulta humana externa**, sem afirmar que um produto foi verificado. Os fatos do catálogo podem ter origem/versão/data ou explicitamente ausência dessas informações. O recibo só é copiado por ação explícita; a matéria-prima OCR e os IDs privados não entram na saída. O botão de conferência humana da superfície existente mantém escopo de sessão e não muda autoridade regulatória.

## 5. Política de segurança e dados
- Jamais inferir: uma foto = registro sanitário válido; nome comercial = princípio ativo; lote = aquisição; prescrição = compra; compra = dose administrada; ausência de log = não adesão; quantidade atual = histórico completo; descrição da bula = interação clínica individual.
- **Metadona/retiradas:** ocorrência anterior de “Abrir retirada” após conclusão exige validação por IDs, ciclos e comprovantes. Preservar todo o estoque e histórico; não usar assertiva visual para concluir o caso.
- Nenhuma alteração automática de receitas, estoque, ações de dose, documentos clínicos ou RLS; nenhuma migração SQL antecipada. Privacidade por usuário e pessoa; falhas de leitura remota não equivalem a exclusão.
- Fontes regulatórias: `https://www.gov.br/anvisa/pt-br/sistemas/consulta-a-registro-de-medicamentos` e `https://www.gov.br/anvisa/pt-br/sistemas/bulario-eletronico`, verificadas para navegação pública. **Não assumir API estável ou licença de ingestão**.
- Conformidade: distinguir informação do profissional, relato da pessoa, data aferida, data de cadastro, futuro planejado e evento efetivo. Correlação temporal não demonstra causalidade.

## 6. Roadmap sequenciado (não chamar planejado de entregue)
**Agora:** concluir publicação da R3 QG1, obter SHA/`origin/main`, executar diagnóstico isolado P4-B (expectativa de **511** verificações se o V63 mantiver os 510 anteriores + 1 contrato), aplicar e publicar só após zero falhas, conferir no Android.

**P6 P4-C — catálogo e Anvisa:** delimitar fonte pública, forma de consulta e termos de uso; identificar entidade exata (substância, apresentação, forma/via, empresa, registro, bula) com atualização versionada, hash e revisão humana; auditoria de importação e rollback sem alterar fatos clínicos. Não construir interações personalizadas sem política farmacológica revisada.

**D4 — jornada terapêutica:** início/término real de cursos temporários, projeção de doses dentro de janela, correção/edição/atraso/cancelamento e retorno associado, sem inventar última dose ou aceitar saldo como histórico.

**Fênix Studio / Android premium:** acessórios, anatomia visual, GPU, pausa/retomada, fallback WebGL, Safe Area, cards e scroll, teclado e contraste; usar vídeos reais do aparelho, sem dizer que foram vistos quando só há descrições.

**QG2 / Android 360:** testes de cenário e semântica, inventário de duplicações, rastreabilidade de cobertura; notificações nativas reais, permissões, janela de silêncio, background/restart/opt-in, sem prometer entrega só por simulação. Homologar sync em dois dispositivos/contas e documento offline/E2E.

**Checklist permanente S01–S14 do V6/V7:** recibo por desdobramento; prévia de alteração; conflito entre aparelhos; documento indisponível; pendência explicada; mudanças desde consulta; rascunho escopado; explicação Brain; cobertura de dados; ações compensatórias; orçamento de perguntas; diagnóstico exportável; gate único; revisão de catálogo.

## 7. Convenções de engenharia aprovadas pelo operador
- Android + Termux, PWA/Vercel e APK Capacitor. Evitar build pesado em celular quando não necessário; execução controlada de gates no Termux.
- Macrocirurgia ZIP + alternativa Base64; **diagnóstico isolado primeiro** em clone temporário, executando todos os testes V63 e extras sem parar no primeiro; resumo, log e ZIP de falhas; só depois aplicar e revalidar; publicação **separada**, jamais automática.
- `git diff --check`, `node .../tsc --noEmit`, testes relevantes, backup por arquivo, rollback seletivo que não toca mudanças concorrentes. Nunca `git add -A`, `reset --hard`, force push ou sobrescrita de arquivo sem âncora.
- Preflight exige `main`, `HEAD == origin/main`, stage vazio e ausência de alterações rastreadas prévias; não sobrescrever arquivos novos. Para mudança de HEAD, reconciliar a nova base, não forçar publicação.
- **Nomes internos** Mxxx/Px/Rx/CI360/QG1/D3 ficam só em scripts, commits, documentação e diagnósticos; rótulos, botões, PDFs e cabeçalhos do app devem ser públicos, legíveis, humanos e premium.
- Visual mobile-first escuro premium, Lucide, haptics/toasts quando apropriados, retaguarda privada, campos sem truncamento, retorno seguro e alvos grandes.
- Falha de teste deve ser investigada, não apenas alterada para verde. Consolidar testes duplicados somente com equivalência de cobertura e testes negativos documentados.

## 8. Comandos de entrega P4-B (a executar APÓS confirmar R3 no GitHub)
```bash
cd ~/storage/downloads && unzip -o VAULT-CI360-P6-P4B-PHARMALENS-R1.zip && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/DIAGNOSTICAR-TUDO.sh
# SOMENTE com zero falhas:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/APLICAR-VALIDAR.sh
# SOMENTE com P4B_R1_APROVADA_LOCALMENTE:
cd ~/storage/downloads && bash VAULT-CI360-P6-P4B-PHARMALENS-R1/PUBLICAR.sh
```
Caso haja falha, usar o caminho `ENVIAR_PARA_ANALISE=...zip`, enviar o diagnóstico completo e não aplicar nada ao checkout real. Não executar este pacote em paralelo à publicação da R3.

## 9. Testes de aceite no Android
1. Abrir PharmaLens → selecionar medicamento → Conferência documental → selecionar imagem suportada → OCR (se TextDetector existir) ou transcrever manualmente. Confirmar que não há upload.
2. Conferir nome, dosagem, fabricante, lote, validade e registro como **campos capturados** e sua origem; diferenciar coincidência textual de autoridade oficial.
3. Checar validade impossível, fabricante divergente, substância distinta do nome comercial, lista de apresentações com várias dosagens; nada pode virar selo de identidade do produto.
4. Conferir os dois links oficiais e retorno seguro; copiar manualmente e conferir ausência de IDs e texto bruto não exibido; testar clipboard indisponível.
5. Alternar pessoa/medicamento durante captura, cancelar e descartar: nenhum texto ou imagem da pessoa anterior deve aparecer; nenhuma receita, dose, retirada, aquisição ou estoque muda.
6. Validar layout em 320/360/393/430px, fonte grande, teclado, botão min-h-11, bottom bar e orientação.
7. Verificar que Home, Explorar, Mais, CareFlow, Modo Médico, Brain e Cartão de Retorno da R3 continuam presentes e sem códigos de cirurgia ao usuário.

**Fim do relatório:** continuar pela evidência da execução, não pelo número da cirurgia. Se outro chat receber este documento, verificar primeiro o último HEAD e o log do diagnóstico, sem voltar a aplicar a P0/D3/R3 já publicadas.
