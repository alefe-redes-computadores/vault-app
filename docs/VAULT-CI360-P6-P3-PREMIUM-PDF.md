# VAULT CI360 — P6 P3 A | Acabamento premium e integridade da biblioteca de PDFs

Base mínima publicada: M3 P3 `c22e2343a6d23b23faa9d91ae220213d14f42880`, que inclui M3 P2, UI360 R5 e R4.

## Alterações cirúrgicas

1. `app/saude/careflow/relatorios/page.tsx`: seletor de PDF premium com `input` nativo invisível e nome/tamanho, mensagem contextual, modal de confirmação `ConfirmationModal` já existente, limpeza do formulário ao trocar de perfil, escopo da pessoa capturado em importação/download/exclusão e checado novamente após operações assíncronas.
2. `lib/careflow-m2/pdf-library.ts`: validação MIME/tamanho já existente preservada, assinatura de arquivo `%PDF-x.y` dentro dos primeiros 1.024 bytes, verificação opcional de escopo imediatamente antes da gravação e confirmação de propriedade original `auth + persons`. Não altera schema, armazenamento, sincronização ou histórico.
3. `scripts/test-v63-release-gate.mjs`: novo contrato de comportamento adicionado uma única vez, sem remover nenhum contrato anterior.
4. `scripts/test-vault-ci360-p6-p3-premium-pdf.cjs`: testes reais do repositório puro simulando Blob, duas contas e pessoas, arquivo falso, troca de pessoa e regressões premium.

## Limites e riscos não apagados

- A validação de cabeçalho reduz falsa identificação, mas não constitui antivírus nem assinatura digital.
- `pdfLibraryM2` permanece no IndexedDB local, com máximo 12 MB e sem upload. Desinstalar/limpar dados pode remover arquivos locais; exportação voluntária é responsabilidade do usuário.
- Um arquivo cuja gravação no IndexedDB já tenha sido iniciada antes de a pessoa ser trocada permanece na pessoa *original* vinculada ao gesto, nunca na nova pessoa. A mensagem avisa a troca de perfil.
- Este pacote não toca em Metadona, estoque, documentos remotos, P2 notifications, SQL, RLS, Fênix WebGL, APK nem Vercel. O caso real da retirada depende de exame dos IDs e homologação física. Sem fingir correção canônica.
- A homologação CI360 P6 P3 global permanece aberta: Android 320–430px, Fênix, notificações, offline, duas contas, impressão PDF e Metadona.

## Operação

Use `APLICAR-VALIDAR.sh` para worktree isolada com backup e gates globais. Somente com `P6_P3_APROVADA_LOCALMENTE` é permitido considerar `PUBLICAR.sh`, em comando separado do usuário. Nenhum commit, push ou migração automático.
