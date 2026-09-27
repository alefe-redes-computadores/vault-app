-- Vault pre-APK security hardening.
-- Mantém helpers RLS disponíveis para usuários autenticados e remove exposição
-- RPC anônima/pública desnecessária.
revoke execute on function public.can_manage_vault_members(uuid) from public;
revoke execute on function public.can_manage_vault_members(uuid) from anon;
grant execute on function public.can_manage_vault_members(uuid) to authenticated;

revoke execute on function public.can_view_vault(uuid) from public;
revoke execute on function public.can_view_vault(uuid) from anon;
grant execute on function public.can_view_vault(uuid) to authenticated;

revoke execute on function public.is_vault_owner(uuid) from public;
revoke execute on function public.is_vault_owner(uuid) from anon;
grant execute on function public.is_vault_owner(uuid) to authenticated;

alter function public.update_updated_at_column() set search_path = '';

-- settings_user_id_key já preserva a unicidade de user_id.
drop index if exists public.settings_user_id_idx;
