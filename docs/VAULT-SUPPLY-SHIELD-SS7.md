# VAULT SS7 — Supply Shield (macrocirurgia operacional)

## Propósito

Integra no cadastro real de aquisição uma conversão **declarada e confirmada** de caixas fechadas para unidades discretas do estoque, preservando um marcador versionável em `renovacoes.observacoes`. O método atual de `renovacoesRepository.create` continua a única autoridade para somar saldo; não há transação paralela nem atualização automática do medicamento pela nova UI.

A central `/saude/supply-shield` apresenta saldo conhecido/zero/desconhecido/negativo, revisão de unidade, estimativa conservadora de consumo de rotina contínua e alertas operacionais D-10/D-5. D-10/D-5 são **faixas de preparação do usuário**, não parâmetros legais de prescrição. Não afirma validade de receita, economia do SUS nem disponibilidade física.

## Escopo funcional

- `package-evidence-ss7.ts`: conversão discreta conferida, validação 2 caixas x 20 unidades e marker `[VAULT:EMBALAGEM-CONFERIDA]` no histórico de aquisição. Recusa valores fracionários, unidades desconhecidas e conversão entre comprimidos/cápsulas/gotas/ml.
- `MedicationPackageConversionSS7.tsx`: escolha explícita de números e confirmação, seguida de aplicar ao formulário. O usuário ainda precisa salvar a aquisição pela rota original.
- `app/saude/renovacao/nova/page.tsx`: componente em ambas as formas de aquisição (compra/SUS), comparação dos valores com marcador, limpeza do marcador em alteração manual. Preserva `MedicationAcquisitionQuantityGuide` e campos de preço/lote/fabricante.
- `supply-shield-ss7.ts` + dashboard: dados de conta/pessoa; resumo privado/SUS vinculado ao medicamento, não ao tratamento; preço privado apenas quando realizado e informado; saldo zero distinto de ausência.
- `app/saude/medicamentos/detalhes/page.tsx`: quando estoque desconhecido, alternativas explícitas *Informar saldo* e *Registrar aquisição*; entrada central sob demanda na seção de estoque, sem modificar caminhos operacionais.
- `scripts/test-vault-supply-shield-ss7.cjs` integrado ao gate global.

## Restrições

- **Não altera** `lib/repositories/renovacoes.ts`, baixa de doses, prescrições, `schema` Dexie ou Supabase.
- **Não altera** classificação regulatória nem presume embalagem SNGPC universal de 20/30 unidades.
- **Não sincroniza** `laboratorio_etiqueta` via SQL neste pacote: esse campo precisa de tratamento de compatibilidade multi-dispositivo e migração autorizada, ou derivação da aquisição. A central usa rotas explícitas existentes; essa pendência permanece no roadmap.
- **Não calcula** custo SUS como economia estimada nem compara compras sem data real.
- **Não valida** prescrição digital, notificação A, data de validade ou exigência médica: apenas oferece checklist para confirmação humana.
- O marcador vive na observação da aquisição e não muda automaticamente quantidade quando uma aquisição histórica é editada; tal edição requer conferência futura específica.

## Gates e homologação

SHA-256, checkout limpo, HEAD canônico publicado, preexistência do Brain V7, patches ancorados e exatos, testes SS7, TypeScript, release global, backup/rollback e stage allowlist. Build Android somente no GitHub Actions após publicação. Concluir homologação manual do fluxo de compra e retirada SUS em dispositivo piloto antes de usar com dados reais.
