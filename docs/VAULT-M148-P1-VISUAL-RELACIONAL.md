# VAULT M148 P1 — Lista + identidade visual relacional + acesso orgânico

## Entregas
1. `MedicationFormatIcon` conserva os mesmos parâmetros (`formato`, `cores`, `size`, `className`), mas passa a desenhar miniatura SVG premium usando `normalizedPillV8`: as mesmas formas/cores declaradas que fundamentam o PillStudio. Afeta automaticamente todos os vínculos que já usam o componente canônico (tratamentos, retiradas, documentos, fornecimento, agenda, etc.), sem alterar dados.
2. A listagem também passa a usar o ícone canônico para medicamentos com formato/cores declarados. O fallback legado para registros sem identidade declarada permanece como compatibilidade com contratos M92.
3. O rótulo regulatório clicável sai da tarja vertical e passa a um selo horizontal legível; o `ListCard` ganha `softRail` opt-in, não afetando outras listas.
4. Os cards de medicamentos preservam nome, formato, concentração, ativos, estoque, SOS, status, histórico, ações e atenção. Ações com toque mínimo de 44 px. Sem truncar ou remover alertas clínicos.
5. O bloco da Central M144 é retirado do rodapé da lista. O acesso contextual vai para **Indicadores e organização**, e o acesso principal fica no **Histórico** de Minha Saúde. Rótulo: Ocorrências, ciclos e vacinas, com retorno contextual.
6. Não mexe em doses, agenda, esquemas, medicamentos no banco, histórico, RLS, prescrições nem arquivos relacionados a dados.

## Limites desta etapa
- Esta é a **M148 P1** de identidade visual, lista e vínculos. O redesenho da tela **Detalhes** em três domínios e a integração efetiva de `documentReconciler`/`manufacturerAuthority` pertencem à **M148 P2**; não são declarados concluídos aqui.
- `PillStudioV8` permanece a prévia ampliada; `MedicationFormatIcon` é a **miniatura compacta** correspondente, sem legenda interna. Nenhuma ilustração é imagem real de medicamento.
- Ícones de **categorias** (menu de Medicamentos, estatística, navegação genérica) continuam Lucide intencionalmente. Esta alteração visa **identidade de medicamentos concretos**.

## Homologação Android obrigatória
- Abrir lista compacta/confortável e grupos, examinar pílulas bi/tricolores, comprimido sulcado, oblongo, cápsula, gota, adesivo e injeção com dados reais; confirmar ausência de ícone quadrado antigo.
- Abrir tratamento e seus medicamentos, retirada, documento vinculado, reposição de estoque e agenda; conferir a mesma forma/cor declarada na lista sem divergência de identidade.
- Tocar a classificação regulatória; verificar que informação e detalhes continuam acessíveis sem tarja vertical.
- Em **Minha Saúde → Histórico**, tocar **Ocorrências, ciclos e vacinas**, salvar um registro de teste se permitido, voltar à origem; em Medicamentos → Indicadores e organização, verificar acesso secundário e ausência de botão isolado no fim.
- Testar SOS ativo vs. descontinuado, dose futura, falta de estoque, links de receita e estoque, alternância de pessoa, offline e reconexão.

## Gates
SHA256 do pacote, hash git dos cinco arquivos preexistentes, checkout isolado limpo, backup/rollback autoral, TS completo, testes direcionados + gate global `npm run test:release`, `git diff --check`, stage com allowlist, conferência de `origin/main`, push normal e Action Android.


### FIX1 — compatibilidade visual regulatória
O contrato M136 (e outros de V76/M109/V328) requerem um botão regulatório
na faixa vertical. A implementação conserva esse botão como ação única,
com opacidade mais suave e legenda horizontal não interativa; nada altera
identidade clínica, risco ou status regulatório. Sem editar testes legados.


**FIX2:** cartões de medicamentos conservam `min-h-0` dinâmico em vez de altura artificial de 142px; o regulatório clicável vertical segue protegido.


## FIX3 — compatibilidade P9 (14/11/2026)

- O gate da FIX2 revelou conflito legado P9 em `MedicationPortfolioOverview.tsx`: botão de decisão usava `min-h-[64px]` quando o contrato canônico exige `min-h-10`.
- A FIX3 substitui somente essa classe no botão do resumo operacional. Mantém a decisão e o link do Brain, foco acessível, texto, doses, estoques e dados.
- Preserva M109 (`className="min-h-0"` no cartão) e M136 (faixa fina clicável de 16px).
- Executa P9 como primeiro pré-voo legado, seguido de M109/M136 e demais suítes.
- Adiciona `MedicationPortfolioOverview.tsx` à allowlist e verifica seu blob exato da base M147 P1.
- Testes de pacotes, sintaxe, SHA256 verificados antes da entrega; release real do projeto e TypeScript completos somente no Termux.
