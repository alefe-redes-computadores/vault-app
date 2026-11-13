# PL7-P1 — PharmaLens V7, núcleo sem colisões

## Escopo

Arquivos **novos somente**, sem tocar páginas, Dexie, Supabase, schema, doses, estoque, alertas, package.json ou versões do Brain.

- `lib/health-intelligence/pharmalens-v7.ts`: construção determinística, escopo estrito usuário/pessoa/medicamento, dados originais M127/M129; trata receita separada de aquisição, compra separada de início; aliases de fabricantes; validação de datas e relatos preservados após edição de fabricante. Resultado observacional, sem causalidade.
- `components/saude/PharmaLensOverviewV7.tsx`: scorecard e timeline read-only, **ainda não ligados a telas**.
- `scripts/test-vault-pharmalens-v7.cjs`: contratos TS, isolamento, filtragem, comparação, não reatribuição, deduplicação, vazios.

## Convivência com cirurgia M142 e seguintes

Conferido em `main` no início: `7b478f8fc774a812fe6a20d350fe5d44d78979ab` M142, que alterou fornecimento/documentos. O instalador não congela o HEAD, mas impede overwrite de arquivos já existentes, mudanças rastreadas pendentes e mudança de HEAD durante a cirurgia.

**PL7-P1 etapa 1:** instalar, testar, manter sem commit/push. O outro chat pode continuar publicando correções, desde que não altere esses quatro caminhos. Ao integrar a UI na página de medicamento, primeiro sincronizar HEAD e combinar ownership da tela.

## Restrições explícitas

Não identifica fabricante pelo nome comercial; não reconstrói interrupções, nem usa estoque atual como histórico, não faz comparação farmacocinética. Não usa `renovacoes.data` (data da prescrição) como compra. Não cria inferência de eficácia.

O componente pode ser integrado numa cirurgia posterior; até lá o usuário final não verá a nova tela. Para gerar *Resumo para consulta* e Confounder Shield serão necessários contratos separados de eventos clínicos, marcação de períodos, proveniência e filtragem.

## Aceite

- `node scripts/test-vault-pharmalens-v7.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `git diff --check` e verificação de arquivos adicionados
- Validação visual PWA/APK **pendente** até conectar o painel
