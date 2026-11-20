-- VAULT A0 MACRO1: verificador seguro, READ ONLY. Executar após SQL 001 + 002.
SELECT 'a0_columns' AS check_name,
  count(*) FILTER (WHERE (table_name,column_name) IN (('cirurgias','tratamento_ids'),('cirurgias','cid_ids'),('tratamentos','data_inicio'),('tratamentos','condicao'),('hospitais','medico_ids'))) AS found_count,
  5 AS expected_count
FROM information_schema.columns WHERE table_schema='public';
SELECT policyname,cmd,roles FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
AND (policyname LIKE 'vault_a0_%' OR policyname IN ('Acesso total aos avatares','Permitir leitura publica em saude e documents')) ORDER BY policyname;
SELECT tgrelid::regclass::text AS table_name,tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'vault_a0_%' ORDER BY 1,2;
SELECT bucket_id,count(*) AS files,count(*) FILTER (WHERE owner_id IS NULL) AS no_owner,
  count(*) FILTER (WHERE owner_id IS DISTINCT FROM split_part(name,'/',1)) AS owner_prefix_mismatch
FROM storage.objects WHERE bucket_id IN ('avatars','clinical-private','saude','documents','vault-attachments') GROUP BY bucket_id;
