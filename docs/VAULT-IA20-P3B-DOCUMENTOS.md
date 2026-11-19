# VAULT IA 2.0 — P3-B | Responsividade de Documentos

**Base examinada:** commit `8332893527f0d089be25f33738509bc36f364c87` (`IA 2.0 P3 QG2`), 19/11/2026. **Estado:** candidato ZIP; não publicado nem homologado.

## Problema observado no código
- O Cofre Pessoal colocava a busca expansível, filtros, galeria, modo grade/lista e exportação em **uma única linha**, competindo por ~280 px em telas de 320 px.
- O Acervo Clínico colocava título, botão Voltar, exportação e filtros na mesma linha e os três atalhos de período usavam wrap, podendo elevar a altura do cabeçalho de modo imprevisível.
- O Cofre tinha filtros dentro de `header sticky` sem limite de altura. A grade começava com duas colunas, inclusive a 320 px.

## Cirurgia
1. Cofre: busca legível em linha própria abaixo de 640 px; ferramentas agrupadas na segunda linha, 44 px, sem perder funções. Busca começa expandida; filtros com altura local de 45dvh e rolagem; grade de uma coluna abaixo de 380 px; Safe Area superior preservada.
2. Acervo: título e ferramentas empilhados em tela estreita; PDF com rótulo humano e mínimo tátil; período em trilho horizontal com rolagem local e três botões inteiros. Safe Area inferior na área principal, sem alterar exportação fora da tela.
3. `ExportCardButton`: prop **opt-in** `touchTarget="comfortable"` para ícones de 44 px. Chamadas antigas mantêm tamanho anterior; interface de exportação e erros não mudam.
4. V63: registra um contrato específico P3-B junto aos anteriores.

## Arquivos alterados e criados
Modificados (4): `app/documentos/page.tsx`, `app/saude/documentos/page.tsx`, `components/ExportCardButton.tsx`, `scripts/test-v63-release-gate.mjs`.

Novos (2): `scripts/test-vault-ia20-p3b-documentos.cjs`, `docs/VAULT-IA20-P3B-DOCUMENTOS.md`.

Exclusões: D4 P1/P2/P3, doses, SUS/fornecimento, Brain, banco, RLS, sincronização, consultas, PDFs gerados, detalhes e edição documental, links, bottom nav, FAB, estrutura da árvore clínica, datas e registros. O patch verifica blobs por SHA-1 Git de três arquivos protegidos e aceita evolução de V63 apenas quando as âncoras são inequívocas e não duplicadas. D4 P3 pode estar presente no gate sem bloquear.

## Gates e release
1. `DIAGNOSTICAR-TUDO.sh`: SHA256 de pacote, HEAD limpo, clone compartilhado temporário com push bloqueado; aplica apenas no clone; testa **todos** os arquivos `.cjs` realmente listados no V63, V70s, TypeScript global, `git diff --check`, coleta todas as falhas.
2. `APLICAR-VALIDAR.sh`: refaz o diagnóstico; preflight; backup seletivo de quatro arquivos; patch ancorado; pós-gates; marcador com hashes de seis caminhos.
3. `PUBLICAR.sh`: exige HEAD/origin/main, mesmos hashes, aprovação, stage *exatamente* seis caminhos e push normal sem force.
4. `ROLLBACK-LOCAL.sh`: somente antes da publicação, mesmo HEAD e hashes pós-aplicação intactos; outros arquivos não são tocados.

**Limite de evidência:** os contratos de código e sintaxe não substituem PWA, APK ou inspeção física de 320, 360, 393 e 430 dp. Não declarar o problema visual resolvido até testar o aparelho.

## Aceite Android
- Em 320 e 360 dp, busca do Cofre visível; filtros/galeria/lista/grade/PDF acionáveis sem colisão; filtros longos roláveis sem bloquear a tela inteira.
- Em 393 e 430 dp, confirmar que grade/lista não corta documentos ou títulos, e que o retorno após abrir, pesquisar e exportar é preservado.
- No Acervo, título e botões não se espremem; “Exportar” e “Filtros” funcionam; trilho de meses rola horizontalmente, sem disparar navegação.
- Teclado, alto contraste, fonte ampliada, Safe Area, Android Back, pessoa ativa, anexos e PDF manual funcionam antes e depois.
- Não equivaler ausência de bug visual a segurança: repetir aceite de troca de pessoa, offline e PDFs com dados sintéticos ou autorizações explícitas.
