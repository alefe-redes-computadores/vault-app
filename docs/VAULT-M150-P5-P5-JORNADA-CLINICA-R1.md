# VAULT M150 P5 P5 R1 — Jornada clínica, doses e navegação

**Base remota obrigatória:** `39944ef76481b31b2d07889cb720f1bdd0247331` (M150 P5 P4).
**Escopo:** Home/Hoje e diretório de busca de Explorar. **Não é homologação Android.**

## Alterações
- Hoje: atalho acessível `Ver doses` no cabeçalho; fila de doses antes de briefing Brain/atalhos e painel Agenda, mantendo todos os recursos, lote, filtros, `focus=doses`, contexto e drilldowns.
- Hoje: contagem de retiradas vencidas usa `isOpenWithdrawal` da mesma autoridade da Home, incluindo recebimento/realização vinculada; sem modificar registros.
- Home: grade existente de atalhos após hero e antes da agenda; botão "Ver doses e horários" usa `focus=doses`. Agenda continua antes de alertas do Brain.
- Explorar: aliases populares para busca (remédio, farmácia, SUS, dose de hoje, receita e fabricante), preservando 22 destinos reais, busca anterior e `return_to`.
- Novo teste automatizado P5 P5 integrado ao V63 (o V70 já roda como parte do gate). Contratos legados M76 e M110 atualizados de forma estrita para a nova ordem, preservando demais invariantes.

## Segurança operacional
- Rodar `bash INSTALAR-VALIDAR-CANDIDATA.sh` após descompactar este ZIP na pasta Downloads do Termux.
- O instalador exige HEAD remoto exato, blobs Git originais exatos, worktree isolada e dependências TypeScript existentes na pasta canônica; não executa build Android local.
- Faz backup, verifica SHA-256 do pacote com `sha256sum -c`, aplica em worktree, verifica patch, smoke, V63 (inclui os dois testes V70) e `tsc --noEmit`, registrando log completo.
- Só cria commit seletivo e faz push de **branch candidata** após aprovação de todas as verificações. **Não promove `main`.**
- O APK e a homologação visual/funcional (incluindo React #310, receita/Clonazepam, Tramal/SOS e Cerumin de amanhã) seguem como etapas posteriores.
- Se alguma âncora ou contrato falhar, nenhuma alteração é publicada; backup/worktree permanecem para diagnosticar.

## Limitações
Não houve reprodução das telas em Android, nem execução do gate de release neste ambiente. O aplicador é fail-closed por commit e blobs Git conferidos via GitHub, com testes adicionais no Termux.
