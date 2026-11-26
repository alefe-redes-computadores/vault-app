CREATE ROLE postgres LOGIN CREATEROLE BYPASSRLS NOSUPERUSER NOCREATEDB;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT anon,authenticated,service_role TO postgres WITH ADMIN OPTION;
GRANT CREATE ON DATABASE postgres TO postgres;
GRANT USAGE,CREATE ON SCHEMA public TO postgres;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO postgres,anon,authenticated,service_role;
-- postgres has no grant option on auth and the worker receives no auth schema usage.
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users(id) VALUES('20000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002'),('20000000-0000-4000-8000-000000000003');
GRANT REFERENCES ON auth.users TO postgres;
