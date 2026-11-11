# VAULT M119 — Espinha de Confiança (R1)

Base autorizada: **M118, 988c962f6b7d55b1c86b6e6643543ac462914872**.

## Escopo incluído

1. **Projeção pura de integridade relacional** `auditCareLinksM119`: cruza somente medicamentos, tratamentos e documentos que já estavam no snapshot person+owner do Brain. Checa referências que não estão no recorte disponível, inversão legada de relacionamento, CID candidato não confirmado, ausência de medicamento explicitamente vinculado. Nenhum resultado é tratado como diagnóstico ou prova de erro do banco.
2. **Painel de conferência** em Minha Saúde, sob demanda e independente dos cinco destinos do M118; apresenta até 18 itens, total real, links para edição canônica, nenhum CTA para corrigir automaticamente.
3. **Recibo parcial de evidências** nos detalhes já existentes do Brain: amostra declarada, período, cobertura, referências de entidade declaradas, categorias de fontes e informação explícita de que timestamps/IDs exatos dos registros de origem podem estar indisponíveis. Não inventa datas nem proveniência granular.
4. **Teste puro com casos adversariais**: outra conta/pessoa, referência ausente, reverse legacy, CID candidato, documento sem correspondência, ausência, limites, idempotência e reload lógico. Testa composição estática M118 sem remover suas suítes.
5. **Gate M119 anexado ao gate canônico**, mantendo a execução sequencial anterior e o TypeScript.

## Alertas de arquitetura não alterados

- `lib/integridadeReferencial.ts` **contém** reparos antigos via `db.*.put()` e `enfileirarOperacao()`. A M119 não o importa nem o executa. O chamador não foi encontrado na busca, mas isso não prova que não esteja sendo invocado por outro mecanismo. Não apagar automaticamente as relações dessa rotina sem projeto de migração específico.
- `lib/sync/medication-treatment-reconciliation-m105.ts` já planeja reconciliação sob políticas de sincronização. A M119 não substitui sua autoridade.
- O diagnóstico da M119 usa recorte de dados disponíveis; ausência pode refletir sincronização pendente, filtro ou entidade apagada.
- Inspeção baseada no snapshot compartilhado já carregado; não abre outro live query, não lê tabelas paralelas, não grava ledger.
- O Recibo M119 **não garante** rastreabilidade linha a linha de todos os insights: isso exige migração gradual de produtores em cirurgia posterior. A interface deixa isso explícito.

## Validação e gates

- Pré-voo compara HEAD local e remoto, arquivos rastreados e stage, limita escopo, verifica integridade do ZIP.
- Execução: testes M119 puros, TypeScript, gate completo `npm run test:release`, `npm run check:versions`, `git diff --check` e manifesto.
- Se qualquer etapa falhar, rollback **só dos arquivos M119**, sem `git reset` ou `git add -A`.
- O publicador é separado: revalida HEAD, remote, allowlist e hashes antes do `git commit`/`git push`.

## QA humano obrigatório para aceite Android

- Abrir Minha Saúde em 320 e 360 pixels de largura, com fontes ampliadas; cinco destinos tocáveis e Avatar intacto.
- Abrir a inspeção sem internet e alternar pessoas; não mostrar nome/links de outra pessoa.
- Concluir um vínculo em pessoa fictícia, recarregar APK, reconectar e verificar que o vínculo continua. **Os testes puros não substituem IndexedDB/Sync reais.**
- Abrir insight com e sem evidências; conferir “origem indisponível” quando apropriado, sem datas presumidas.
- Alternar Modo Essencial, reiniciar e conferir filtragem; testar gesto voltar e teclado Android.
- Sem QA físico não declarar que o Android foi homologado; CI/Build READY não comprova instalação no aparelho.
