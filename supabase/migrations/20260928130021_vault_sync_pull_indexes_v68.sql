-- VAULT_SYNC_PULL_INDEXES_V68
-- Espelha a migration já aplicada ao Supabase em 2026-09-28.
-- Índices direcionados aos filtros user_id usados pelo pull local-first.
create index if not exists idx_consultas_user_id on public.consultas(user_id);
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_dose_logs_user_id on public.dose_logs(user_id);
create index if not exists idx_exames_user_id on public.exames(user_id);
create index if not exists idx_registros_saude_user_id on public.registros_saude(user_id);
create index if not exists idx_renovacoes_user_id on public.renovacoes(user_id);
create index if not exists idx_tratamentos_user_id on public.tratamentos(user_id);
