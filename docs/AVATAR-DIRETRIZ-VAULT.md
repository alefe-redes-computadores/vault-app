# VAULT — Diretriz persistente do Avatar e do Acervo Clínico

## Identidade da pessoa

O Avatar é uma representação escolhida pela própria pessoa — não um personagem médico genérico. A configuração visual é **cosmética**, personalizável e separada de evidências clínicas. O desenho inicial é intencionalmente estilizado, não uma reconstrução anatômica 3D fiel nem um diagnóstico.

- A pessoa escolhe boné (com/sem marca, Nike, New Era, cores e modelo), óculos (inclusive armação de grau) e tênis (modelo e cor). Representações de marca são apenas opções textuais de estilo; não são produtos oficiais nem acessórios conectados.
- O estilo nunca significa diagnóstico, tratamento, alteração de peso ou estado de saúde. O indicador do Brain, peso, humor, equipamentos de saúde e marcadores de cirurgias devem obedecer aos registros reais e suas limitações.
- A personalização atual é salva em preferência local protegida por chave de **conta e pessoa** (`avatarPreferenceKey`); não integra a sincronização clínica. A interface deve dizer claramente que o estilo não está ainda sincronizado entre aparelhos. Nunca inferir ou falsificar sincronização sem contrato de banco e migração.
- Suportar 3D, ilustração, fallback WebGL, modo compacto, controle de rotação/zoom e preferências antigas. Não misturar boné/óculos/tênis com relógio, anel ou equipamento médico.
- Um registro de saúde pode apresentar indicação visual/contextual, mas não transforma uma mudança isolada de peso ou sono em modificação anatômica automática. Não inventar alertas clínicos.

## Acervo documental e medicamentos

- Um único documento físico pode pertencer a **vários medicamentos**. A árvore deve exibir cada vínculo explícito sem criar múltiplos documentos nem duplicar anexos/syncQueue.
- Vínculos são feitos por IDs explícitos (`Document.entidade_id`, `Medicamento.document_id`, `Renovacao.document_id` e metadados de IDs), sempre isolados por conta e pessoa. Não inferir relações por coincidência de nomes, data ou semelhança textual.
- Preservar documentos compartilhados na árvore do acervo e nos detalhes dos medicamentos. A exclusão continua afetando o documento real e seus anexos, com confirmação explícita.
- Receita, aquisição e retirada continuam eventos separados, com seus snapshots e cronologia independentes.

## Engenharia / próximas evoluções

1. Para sincronizar estilo entre dispositivos, definir contrato canônico de persistência (migração, validação, sync offline, isolamento de pessoa) e oferecer migração da preferência local. **Não** reutilizar campos clínicos sem contrato.
2. Testar em PWA Android e APK as geometrias de boné/óculos/tênis, performance WebGL, exportação, interação touch, fallback SVG e acessibilidade.
3. Melhorar gradativamente materiais/proporções 3D sem reduzir suporte offline e sem bloquear o restante do VAULT.
4. Auditar performance e precisão da sincronização em todas as áreas, preservar a autoridade do repositório e nunca transformar um arquivo compartilhado em registros clínicos duplicados.

Esta diretriz é parte do código versionado e independe da memória da conta do ChatGPT.

## Continuidade V159

- Priorizar evolução conjunta de Minha Saúde, rotina de doses, documentos, medicamentos, performance e sincronização. O Avatar é uma parte da experiência.
- Armações retangulares devem ter lados retos; não simular o formato achatando uma circunferência.
- Falta de medicamento é um motivo confirmado pela pessoa, não inferido automaticamente do estoque zerado. Revisão em lote exige confirmação explícita e mantém os slots e registros individuais.
- Manter renderização 3D sob demanda, pausa fora da tela, descarte de recursos e fallback. Não adicionar animação permanente apenas para parecer vivo.

## Continuidade V160 — experiência conjunta

- O acervo inicia em todos os meses, com períodos explícitos. Busca local aceita termos em vários campos e preserva as relações reais e a contagem única dos documentos compartilhados.
- Pesquisar não cria vínculos nem altera medicamentos, prescrições, estoque ou sincronização.
- Grupos de Hoje preservam ordem e posição de origem. O botão de grupo abre a revisão existente; estoque zerado não implica automaticamente dose não tomada.
- Continuar evoluindo também documentos, medicamentos e rotina, além do Avatar.

## Continuidade V161 — tratamentos relacionais

- A visão do tratamento inclui documentos ligados explicitamente aos seus medicamentos e aquisições, sem duplicar arquivos. Retiradas e processos exigem os vínculos e o escopo de conta/pessoa.
- Um processo só entra na projeção por uma cadeia válida processo → ciclo → item → medicamento vinculado. Origem comprada e SUS mantêm identidades próprias.
- Buscar pelo medicamento pode localizar o tratamento, mas a busca nunca cria o vínculo. Medicamento descontinuado pode continuar compondo o histórico sem reativação automática.

## Continuidade V162 — personalização com aproximação

- Corpo, rosto e tênis têm enquadramentos visuais fixos; não dependem de dados clínicos. Boné/óculos aproximam o rosto e tênis aproximam os pés no editor.
- Cores cosméticas devem atualizar materiais na cena existente, preservando canvas e câmera. Mudanças estruturais de modelo podem reconstruir a geometria com descarte dos recursos anteriores.
- Manter renderização sob demanda e pausa fora da tela. A aproximação é ferramenta de inspeção, não análise clínica ou reconhecimento facial.
