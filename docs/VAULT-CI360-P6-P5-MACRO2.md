# VAULT CI360 P6 P5 — MACRO 2 | PharmaLens Intelligence 360

**Autoridade**: somente leitura; sem SQL; zero atualização de registros, doses, estoque, receita ou tratamento. A Macro 1 permanece como fonte da futura ingestão de bulas verificadas.

## Correções integradas

1. Reconcilia receita por `medicamento.document_id`, `renovacao.document_id` e `documento.entidade_tipo='medicamento' + entidade_id`. Escopo estrito `user_id` e `person_id`; `type='receita'`. Sem relação por nome semelhante.
2. Exibe o tipo de receita *declarado*, documento efetivamente vinculado e classificação regulatória verificada como evidências distintas. Não converte anexo em receita válida, prescrição vigente ou regime oficial.
3. Atualiza trilho compacto de medicamentos apenas quando a classificação regulatória não está confirmada: `Rec. vinc.` para documento de receita existente, ou `Rec. inf.` para tipo informado. Ao tocar, preserva diálogo de classificação; não inventa tarja.
4. Acrescenta ao PharmaLens um painel de proveniência com links aos documentos originais e as limitações explícitas. Texto do resumo para médico incorpora a reconciliação sem transferência automática.
5. Compara possíveis sobreposições de substâncias somente quando ambas as identidades têm *snapshot* exato de produto e fonte reconhecida. É triagem para conferência, não afirmação de duplicidade terapêutica inadequada.
6. Lista sintomas registrados até 7 dias após início **declarado** de um ciclo documentado no PharmaLens, sem qualquer atribuição causal; relatos já registrados antes do início não são chamados de novos.
7. Define contrato de interações **sem embutir regras fictícias**: somente fontes externas verificadas, documento hash SHA256, HTTPS, responsável, data e par exato de substâncias podem gerar sinal. Com base vazia, o estado explícito é `not_evaluated`.
8. Auditoria agregada por pessoa (quantidade de receitas vinculadas, produtos com confirmação oficial exata e pendências de evidência), além de critérios de ausência de evidências; nenhuma inferência de validade, lote, estoque, compra, fornecimento ou evento farmacológico.

## Gates
- Contrato MACRO2; MACRO1; D3; D2; P4A; TSC; V63/V70 completos.
- Isolamento via worktree e publicador de allowlist exata, hashes e HEAD remoto.
- Homologação física no Android, com conferência das receitas existentes e navegação de documentos.

## Limites
- Não preenche uma base real de interações; sem fontes clínicas homologadas, não há avaliação de interações. Não declara "sem interações".
- Não faz OCR automático nesta entrega; não converte fotos não revisadas em prescrições.
- Não muda a classificação regulatória do cadastro nem o que a Anvisa realmente confirma.
- Dados já existentes podem continuar sem identificação oficial se faltarem regras específicas. Isso não deve mais esconder evidências documentais legítimas.
