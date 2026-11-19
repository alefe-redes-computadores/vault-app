# VAULT 360 — RELATÓRIO MESTRE V16

**Corte de preparação:** 19/11/2026 — Complemento à V15 integral do usuário.
**Repositório:** `alefe-redes-computadores/vault-app` • **Termux:** `~/projects/vault-app` • **Downloads:** `~/storage/downloads`.
**Objetivo:** transferir continuidade mesmo que o chat atinja limite; documentar a nova candidata IA 2.0 P4 sem exagerar status.

## 1. Estado real conhecido, sem inferir publicação

- `6de148175287ee1a456a8357a174a3f24217751d` é o último HEAD GitHub **confirmado durante a preparação** da R1: D4 P5 publicada após V31; o commit D4 P5 alterou apenas arquivos clínicos e V63, sem colidir com os blobs de UI auditados para a P4.
- D4 P3 — último commit confirmado `022871a1764ad9e645cd80ab64fd90a6c83c7b16`.
- IA 2.0 P3B — `d77927a625652ca7af618e75f81a1f9e7e31e8ef`.
- D4 P5 R3 — operador relatou **aprovação local** com gate completo; **publicação confirmada** na main em `6de148175287ee1a456a8357a174a3f24217751d` (19/11). Vercel e APK são etapas independentes, ainda não homologadas aqui.
- UX360 R4 — V15 descreve correções preparadas com validação sintética; **não presumir commit, Vercel, APK ou aceite físico**.
- IA 2.0 P4 — **candidata criada nesta entrega**; testes de sintaxe/fixtures não equivalem ao V63/TypeScript global do Termux; aplicar apenas após diagnóstico e reconciliação do HEAD.

## 2. O que a V15 acrescentou em relação à V14

Sete inconsistências de apresentação: filtros duplicados em medicamentos, modo Compacto pouco denso, `+1` difícil, parser de embalagem inseguro, dois acessos da Home altos, repetição de sugestão de planejamento de estoque e foco de Explorar sem ícones. A R4 da outra frente trabalha nisso mantendo origem de dose, estoque e catálogo. Exige revisar formulário/gaveta e conferir identidade de produto exato; não misturar mililitros de ampola com quantidade de comprimidos.

## 3. Divisão das autoridades e prioridade

- **IA 2.0 / este pacote:** Home/Início, Saúde Hub, Explorar, Fênix rota dedicada, favoritos, navegação, cinco abas, Safe Area, FAB, contraste, haptics, QG visual.
- **D4:** jornadas de períodos temporários, eventos observados, declarações explícitas e auditoria seletiva de notificações; P5 só projeta horários, nunca altera fatos clínicos sem confirmação.
- **UX360 R4 concorrente:** medicamentos compactos/conforto, parser do catálogo, filtros e correção do card duplicado de estoque; o pacote P4 bloqueia se algum arquivo compartilhado mudou.
- **Motor único:** Saúde e Brain não duplicam CareFlow, DoseLogs, documentos, catálogo e receitas. Nenhuma alteração via SQL ou migrations neste pacote.

## 4. IA 2.0 P4 — diferenças reais especificadas e codificadas

### Home Viva

Um card de contexto substitui o destino estático na Home primária. Prioridades, na ordem: medicamento temporário em período informado vigente (somente quando nota canônica valida), plano de pressão em período válido, consulta marcada como realizada recentemente, rotina neutra. Usa os dados já fornecidos pelos hooks; respeita `user_id/person_id`. Um único assunto dispensa abas internas; múltiplos assuntos permitem escolha. Na rotina neutra, dois atalhos objetivos levam a Hoje e Saúde. Sempre sinaliza planejamento ≠ tomada, consulta ≠ prescrição, monitoramento ≠ medição.

### Saúde e Explorar

Banner da Saúde compacto; seis acessos rápidos; favoritos com estrela e cards densos de duas colunas; lista vertical Em foco com ícone/razão e sem carrossel horizontal. Organização, busca, favoritos entre telas, histórico recente, pin por pessoa e retarget são preservados. O Explorar continua como catálogo único de áreas clínicas reais; sem novos bancos ou duplicação.

### Fênix e Perfil Clínico

Sai o acordeão que derramava Avatar 3D e dezenas de seções no Hub. Um card abre `/saude/fenix`, página real que reutiliza o código atual de Minha Saúde em modo perfil, enquanto o Hub leve evita montar os componentes pesados do Avatar na aba principal, conservando Fênix, análise, fontes, indicadores, histórico, biomarcadores, PharmaLens, Brain, edição de perfil e aparelhos. Nomes de módulos são padronizados e favorito legado `minha-saude` migra para `fenix` sem apagar lista antiga. Âncoras antigas são encaminhadas à nova rota; voltar respeita o `return_to` validado.

## 5. Engenharia do pacote e garantias

19 caminhos: 13 modificados, 6 novos. `patch.py` valida SHA blob auditado dos arquivos de UI; só V63 usa inserção ancorada para conviver com D4 P5. Diagnose global `.cjs + .mjs` no clone uma vez, depois no checkout real uma vez; V70, TypeScript, diff check em ambos. Todas as falhas em relatório e ZIP privado. A revisão de origem/HEAD pode bloquear, e isso é intencional. Backup e rollback seletivos; publicação separada sem add global, reset duro ou push forçado.

## 6. Checklist permanente do V15

Preservar 25 achados de UX (B1 navegação/semântica; B2 sintomas/dossiê; B3 exames/pressão/PDF; B4 medicamentos; B5 Home/Mais/Explorar/barra/identidade) e os sete achados novos de UX360 R4. No Android testar: 320–430dp, teclado, fonte grande, Back, Safe Area, FAB, favoritos por conta/pessoa, lista vertical, Fênix 3D/GPU e links anteriores. Critérios clínicos: sem doses fictícias; nenhuma prescrição inferida; ausência de registro não comprova não adesão; estoque nunca movimentado pela Home ou Hub. Testar PWA e APK separadamente.

## 7. Roadmap depois do fechamento

1. D4 P5 publicada na main; conferir o HEAD local/remote antes de aplicar P4 e homologar depois no APK.
2. Integrar/reconciliar UX360 R4 e IA 2.0 P4. Se o HEAD mudar, não forçar candidato.
3. Homologar visualmente os 25 + 7 achados no Android; QG3 funcional/visual.
4. D4 P4 (distinta de IA 2.0 P4): auditoria **somente leitura** de fila nativa de notificações, sob toque, não prova de entrega.
5. Validade após abertura declarada e bula de produto exato; memória factual de episódios; orientação em crise só transcrita do médico; PDF A4 seletivo genuíno; P4-E curadoria com RLS e autorização; sync offline dois aparelhos; Fênix Studio e GPU; notificações nativas E2E e anti-fadiga.

## 8. Regras de retomada no próximo chat

- Ler primeiro esta V16 e o PDF V15 integral anexado ao V16; alguns SHAs da V15 são fotografias históricas.
- Confirmar `git log -1 --oneline`, `git status --short`, `git rev-list --left-right --count HEAD...origin/main`, marker real de aprovação, logs e diff antes de cirurgia.
- Nunca converter *preparada* → *aprovada* → *publicada* → *homologada* sem prova da transição.
- Se falhar teste, exigir resumo/ZIP e corrigir a causa; não apagar asserções válidas nem repetir três gates sem necessidade.
- Não misturar D4 com IA 2.0 nas mesmas áreas de escrita ou criar motor canônico duplicado.

**Anexo original de referência no PDF V16:** VAULT 360 — Relatório Mestre V15, 56 páginas, integral e sem reescritas.
