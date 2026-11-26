-- NAO EXECUTAR em producao sem parecer especifico. Antes de distribuicao de cliente dependente.
-- A retirada desta barreira nao autoriza ativar contas. Se houve distribuicao,
-- parar e provar drenagem dos clientes/leases antes de qualquer retirada.
SET LOCAL lock_timeout='5s';
LOCK TABLE vault_macro02_private.active_accounts, vault_macro02_private.dose_commits IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) THEN RAISE EXCEPTION 'M02_ROLLBACK_NOT_DORMANT'; END IF;
END $$;
DROP FUNCTION public.vault_macro02_read_operation_receipts_r1(uuid[],text);
DROP FUNCTION public.vault_macro02_read_capability_r1();
DROP FUNCTION vault_macro02_private.read_operation_receipts_r1(uuid[],text);
DROP FUNCTION vault_macro02_private.read_capability_r1();
DROP FUNCTION vault_macro02_private.dormant_fence_r1();
DROP TRIGGER m02_dormant_freeze_r1 ON vault_macro02_private.dose_commits;
DROP TRIGGER m02_dormant_freeze_r1 ON vault_macro02_private.active_accounts;
DROP FUNCTION vault_macro02_private.dormant_freeze_r1();
