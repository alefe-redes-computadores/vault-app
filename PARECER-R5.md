# Macro02 — SQL R5 para certificação dirigida e parecer Guardian

**BLOCKED_PRODUCTION / REVIEW ONLY**. A autorização do proprietário é condicionada ao GO específico sobre o hash exato e às evidências reais. Não é migration registrada, não é instalador substituto, não alterou produção.

## Preservação
- Candidata R4/1.4.0: 125 bytes de caminhos certificados preservados (125 arquivos), cinco arquivos de versão; 130 caminhos aplicados no sandbox do proprietário. TSC/V63 576/576 e SQL laboratório PG18.2 PASS. Não repetir V63 por este delta exclusivamente SQL. ZIP de aplicação original SHA256 a1495afedc5c1f57c37adf15490dcc197f24f7e9d53022f051eae1007123e99c.
- Fase A expansão preservada byte a byte; corpos PL/pgSQL de commit_dose, commit_stock e read_dose_receipts idênticos à proposta anterior. Mudanças R5 circunscritas a guardas legados, checagem administrativa sem JWT, reparenting, guarda de pessoa antes de cascade e barreira transacional de ativação. Não há ativação automática. A proposta de privilégios R4 já diferia do laboratório PG18.2: toda a SQL produtiva deve ser testada em PG17.
- Novo teste sem JWT para postgres/service_role; tentativa cross-account; proteção de pessoa; teste concorrente de lock legado. Todos aguardam execução. Python compilado e verificação textual de corpos preservados; nenhuma prova de compilação SQL nesta revisão. O comportamento de lock em clientes inativos permanece o anterior, e novos checks de mudança de escopo podem falhar rapidamente. A inversão potencial de lock entre UPDATE legado e RPC ainda exige prova de rollback/retry real.

## Lab
Executar `python -u qa-pg17/executar_pg17.py` com `PG17_BIN` apontando para binários locais PG17 e usuário sem root. Preferência exata 17.6. Nenhuma conexão externa, usa cluster novo e socket privado. Fixture sintética apenas; schema e roles gerenciados reais devem ser reproduzidos em ambiente isolado antes do GO. Não use PG18 no lugar. O executor ChatGPT não possui PG17, e apt-get falhou por DNS.

## Compatibilidade / privacidade
Antes do cutover: todos os dispositivos precisam de versão compatível e filas legadas drenadas com comprovante. APK antigo não reconhece recusa de gravação; não considerar a transição certificada só com guardas SQL. A ativação exige a aprovação de uma estratégia legítima para exclusão de pessoa/conta, exportação e proteção histórica; o bloqueio de cascata não deve se tornar uma proibição permanente do direito de apagar a conta. A restauração integral de aparelho vazio não foi demonstrada.

## Backup / rollback
Exigir backup/PITR existente verificado com timestamp e teste de restauração isolado (sem expor dados). Não criar projeto/branch pago sem autorização. Antes de ativar, rollback seletivo pode desabilitar RPCs sem remover colunas, ledger nem fatos; o script de revisão contém ROLLBACK e impede execução após qualquer ativação/recibo. Após ativação, não apagar ledger, não desativar guardas e não retornar cliente legado; usar correção progressiva preservando recibos. Verificar backups e contrato de recuperação antes do GO. Não há recibo de backup produtivo ainda.

## Reconciliação
Stability tem prioridade de publicação; main consultada permanecia no Vital. Reconciliação de fonte não deve sobrescrever alterações locais. Handoff: app/page.tsx, lib/types.ts, lib/db/index.ts, hooks/useSyncQueue.ts, hooks/useSupabaseRealtime.ts, lib/sync/pull.ts, scripts/test-vault-stability-360.cjs, além de metadados de versão compartilhados. Usar merge de três vias por caminho contra o commit final da Stability; preservar CAS visual e PharmaLens. Rodar apenas gates impactados + gate cumulativo após integração de código, não antes. Nenhum push/merge/APK.

## Estado do GO
Pendente: PG17.6, schema real isolado, provas de concorrência adicionais, transição legado, backup verificável, GO Guardian do SQL exato. A fase A não é liberada separadamente sem parecer correspondente. Repetir preflight imediatamente antes de qualquer DDL autorizada e comparar migrations já registradas; não aplicar REVIEW_ONLY. Recebida autorização de priorizar migrations sem aguardar publicação da Stability; não houve aprovação de hashes definitivos.
