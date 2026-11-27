\set ON_ERROR_STOP on
-- All IDs are synthetic. Seed after original CAS migrations, before M03.
INSERT INTO public.tratamentos(id,user_id,person_id,nome,data_inicio,condicao) VALUES
 ('00000000-0000-4000-8000-000000009701','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Synthetic CAS A','2026-01-01','Synthetic condition'),
 ('00000000-0000-4000-8000-000000009709','00000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000019','Synthetic CAS B','2026-01-01','Synthetic condition');
