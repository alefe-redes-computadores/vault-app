# VAULT CareFlow 360 — R3: fechamento de rotas e histórico

Base mínima: `a7595095edfc392a51ca37067e7cecd6d08256b8` (R2 publicada). O HEAD pode avançar por correções de Action. O pacote valida ancestralidade, origem/main atual, blobs CareFlow intactos e adições compatíveis ao V63; nunca força sobre conflito real.

A correção paralela `a7b8e4cb1b84` foi comparada contra a R2: modifica apenas `scripts/test-vault-ia20-p1.cjs`. Os cinco arquivos-alvo da R3 permanecem intactos. Isso não certifica a Action.

## Causa raiz

- Evolução usa `useSearchParams` sem boundary de Suspense na página: risco de falha de prerender do Next e retorno inconsistente no PWA.
- Link de volta aponta para um fato que pode estar depois dos primeiros 60 cards; âncora existe, mas o item não é renderizado até expandir a lista.
- Sintomas ordena somente por dia e limita a 100, ocultando histórico antigo e toque por ID.
- Biblioteca local mostra datas ISO, não restaura origem contextual e obriga procurar o PDF recém-arquivado no Dossiê.

## Escopo efetivo R3

1. Evolução: boundary Suspense, restauração de fato filtrado por fragmento e paginação incremental somente até o alvo.
2. Sintomas: ordem dia+horário sem mudar dados originais, paginação e revelação automática por ID (sem copiar o fato).
3. Biblioteca de PDFs: datas DD/MM/AAAA, retorno contextual, destaque por ID no filtro da pessoa ativa, arquivamento recolhível.
4. Dossiê: link para o PDF exato após gravar, condicionado à mesma conta e pessoa.
5. Contrato executável de apresentação, sem dados de pacientes, registrado uma vez no V63.

## Não alterações

Não toca Home/Hoje/Fênix/Medicamentos, APIs de sync, doseLogs, estoque, esquema Dexie, SQL, D4 ou notificações. Nenhum evento clínico é escrito por este pacote.

## Gates

- Diagnóstico focado: base, blobs, clean stage, patch isolado, sintaxe AST e lógica pura, R1, R2, TypeScript, git diff --check. Todos executados e falhas agregadas. Não afirma execução de 523 testes.
- Aplicação: reusa a candidata **somente se** HEAD/hashes e manifesto de diagnóstico coincidirem, backup seletivo, pós-gate R3 + TypeScript + git diff --check e rollback seletivo.
- Publicação: somente allowlist, stage exato, commit/push sem forçar.
- Pós-publicação: homologação Android em 320/360/393/430 dp, busca de fatos antigos, trocar pessoa, voltar, offline, baixar PDF, teclado e Safe Area.

## Evidência

V19 tem 47 páginas e preserva CF-01..27, A01..25 como auditoria histórica, não como falhas ainda ativas. R1 e R2 foram publicadas posteriormente ao corte V19. R3 só fica publicada após aprovação e push explícitos.
