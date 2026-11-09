# VAULT M107 — Fechamento tecnico e pre-APK

**Base exata:** M106 / `2fe1af56d44625bc0215de6ab0fc59a482c8b219`.
**Escopo:** 6 arquivos editados + 2 novos. Sem migrations, RLS, banco, alteracao de dose/estoque ou rebuild Android no Termux.

## Decisoes de integridade

- Farmacias: a categoria passa a usar verde. `Mais economica` segue explicitamente identificada, agora por selo ambar para nao confundir categoria com vantagem de preco.
- Medicos: categoria usa azul (`#38BDF8`) e header `sky`. Cores de tratamentos ficam apenas nos seus chips relacionais; alerta urgente preserva coral. O teste historico V200 foi *atualizado* para verificar essa intencao, sem desabilitar as demais assercoes.
- Medicamentos: a faixa principal continua expressando a **classificacao regulatoria**, por exigencia do contrato clinico M64; a identidade personalizada continua no icone e marcador. Alterar a autoridade da faixa depende de projeto proprio, nunca de um hotfix cosmetico.
- Notificacoes: ao tocar em alerta de dose atrasada, o evento do modal so e emitido diretamente se a Home ja estiver aberta. Fora da Home, a query `/?open=pending-doses` continua sendo a autoridade para abertura ao montar a tela. Ambas as entradas de Providers usam helper puro; nenhuma realiza tomada, ignore ou alteracao de estoque.
- Hoje: preserva a busca owner-scoped; a leitura do historico completo permanece por desenho ate termos benchmark real, especialmente por causa da revisao retrospectiva M62.
- Gate: novo contrato M107 acrescentado ao runner global e contrato V200 intencionalmente atualizado. `npm run test:release` precisa passar inteiro antes do push.

## Sem certificacao sem teste no aparelho

1. Abrir PWA e APK em Home/Hoje/Medicamentos/Mais, tela estreita e larga: checar primeira dobra, cards, cores, teclado e navegacao inferior.
2. Notificacao individual e agrupada com app ativo, em segundo plano, encerrado e com biometria. Verificar que abrir nao confirma dose e que pendencias reais aparecem; testar sem rede.
3. Registros com SOS, estoque vazio, medicamento temporario, historico e revisao retroativa; nao adicionar duplicata.
4. Login/troca de pessoa offline e reconexao: verificar fila, isolamento, ausencia de falso status sincronizado e convergencia PWA x APK.
5. Fenix 3D e fallback sem WebGL, reduced motion, chip/cores relacionais, insumos e alertas clinicos.
6. APK: artefato da GitHub Action e versao/procedencia. Build verde nao comprova funcionamento no dispositivo.

## Supabase fora do escopo

Os advisories historicos de `pg_trgm` em `public`, funcoes `SECURITY DEFINER` em API exposta, configuracao de senhas vazadas e desempenho RLS exigem auditoria SQL separada. Nao alterar grants/indices/politicas nesta cirurgia visual; nunca remover acesso de funcoes usadas por politicas sem prova de equivalencia.

## Publicacao e rollback

O instalador exige HEAD e remoto identicos, copia os 6 arquivos originais para `~/storage/downloads/vault-backups/M107-...`, preserva nao rastreados alheios, executa teste direcionado, `git diff --check` e `npm run test:release`. Publica apenas com tudo verde, `git add` exclusivamente dos 8 caminhos. Em falha antes do push, restaura todos os arquivos, remove os 2 novos e desfaz somente o commit local que ele criou. Depois do push, reversao e novo commit (`git revert`) com revisao, nao `reset --hard` nem force push.
