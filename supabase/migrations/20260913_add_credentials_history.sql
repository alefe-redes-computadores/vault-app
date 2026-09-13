-- Histórico criptografado de senhas. A aplicação mantém fallback compatível
-- até esta migration ser aplicada em todos os ambientes.
alter table public.credentials
  add column if not exists history jsonb not null default '[]'::jsonb;

comment on column public.credentials.history is
  'Histórico de valores criptografados da credencial; nunca contém senha em texto puro.';
