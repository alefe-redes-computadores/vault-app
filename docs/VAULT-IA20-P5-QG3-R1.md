# VAULT 360 — IA 2.0 P5 / QG3 R1

**Candidato:** 19/11/2026. **HEAD auditado R1 FIX1:** `7060755890042e3c75f68b938231b6fe2f12468b` (UX360 R5 publicada sobre IA 2.0 P4). **Status da entrega:** pacote preparado, não publicado nem homologado no aparelho.

## Escopo real de modificações

1. **Hoje:** entrada compacta para as seções Doses, Agenda e Diário, com contador explícito de pendências já calculadas e ocultação do Diário em datas históricas/futuras. Usa `document.getElementById` sobre as âncoras existentes, `scrollIntoView` e haptics, com respeito a `prefers-reduced-motion`. Nenhum novo evento/dose é calculado ou gravado. Reserva inferior inclui safe area Android.
2. **Cofre Pessoal:** cabeçalho menor; filtros no painel flutuante controlado pelo botão existente, com `aria-expanded`, região identificada, ação Fechar e devolução do foco. Sem outro motor ou segunda autoridade de busca. A grade permanece uma coluna em 320–479px para evitar cartões estreitos; apenas de 480px em diante utiliza duas colunas e em larguras maiores três/quatro.
3. **Mais:** uma única rolagem de página, maior respiro inferior para barra/gesto, cabeçalho/pessoa ativa mais densos, três acessos clínicos preservados e estados de biometria/notificações de 11px em vez de 9px. Não altera sincronização, permissões, backups, exportação nem limpeza de dados.
4. **Navegação inferior:** contraste maior nos itens inativos, foco por teclado e respeito a movimento reduzido; mantém exatamente cinco destinos, exclusividade do `+ Adicionar`, contexto de rota e Safe Area.
5. **QG3:** novo contrato executável com análise sintática, verificação de destinos reais, controles negativos, isolamento da navegação e invariantes dos testes V31/P3B/UX360R4/P4. Os contratos históricos `.cjs` e `.mjs` do V63 continuam presentes.

## Invariantes e evidência

Nenhuma alteração em Dexie, Supabase, RLS, receitas, estoque, motor de doses, prescrições ou sincronização. Não há nova permissão nativa, agendamento de notificação, diagnóstico, status clínico ou automação de tratamento. Links protegidos e sincronização continuam em seus módulos canônicos.

Os scripts só aceitam o HEAD exato e o Git blob dos seis arquivos atuais; executam verificações sobre um clone isolado antes de modificar o checkout real. `DIAGNOSTICAR-TUDO.sh` deve produzir zero falhas; o instalador reaproveita sua prova e repete o V63 completo **uma vez** no checkout real; `PUBLICAR.sh` usa apenas os dez arquivos autorizados e não aplica `git add -A`, `git reset --hard` ou `push --force`. Rollback é seletivo e fail-closed.

*Prova local preparada nesta sessão*: sintaxe do patch e dos scripts, manifesto ZIP/SHA256, âncoras contra os blobs de GitHub, testes herméticos e simulação em diretório descartável. Não equivale a compilar o VAULT inteiro ou testar visualmente no Samsung.

## Critérios de aceite físico (Android PWA + APK)

- Em 320, 360, 393, 412 e 430 dp, verificar que as três entradas do Hoje cabem sem recorte, dose/agenda navegam ao componente correto, e o Diário não aparece indevidamente em datas passadas/futuras.
- Abrir e fechar Filtros do Cofre com teclado aberto, manter busca e resultados utilizáveis e conferir que o botão retoma o foco. Abrir lista/grade, galeria, exportação e novo documento.
- Na aba Mais, testar conta e pessoa ativa, Explorar, Saúde, Brain, preferência de biometria, notificações, atualização, sync, ferramentas e segurança. Foco de teclado e rolagem devem funcionar sem dois scrolls concorrentes.
- Nas cinco abas, verificar interação com `+ Adicionar`, abertura/fechamento do sheet, retorno contextual e ausência de barra em formulários de criação. Verificar Safe Area Android e botões não cobertos pelo teclado.
- Conferir as famílias A01–A25 e as sete correções da UX360 R4, mas **não afirmar homologação real** só por passar V63 ou `tsc`.

## Próxima fase

Depois de publicar a P5 e receber vídeo do dispositivo, fechar exclusivamente divergências comprovadas, sem reimplementar módulos clínicos. As demais frentes permanecem na V16: D4 P4 notificação somente leitura, Android E2E consentido, P4-E regulatória sob autorização específica, Fênix Studio GPU, PDF seletivo e sync E2E dois dispositivos.

## Reconciliação R1 FIX1 com UX360 R5

O único blob modificado pelo commit UX360 R5 entre os seis arquivos que a P5 pretende alterar foi `scripts/test-v63-release-gate.mjs`. A P5 foi reancorada ao HEAD `706075589004`, com conferência de Git blob e preservação obrigatória de `scripts/test-vault-ux360-r5-geometry.cjs` no gate. Não reverte o acabamento de medicamentos publicado pela UX360 R5. O roteiro e as garantias de aplicação continuam os da P5 R1; uma nova publicação paralela exige reconciliação, nunca uso de `force`.
