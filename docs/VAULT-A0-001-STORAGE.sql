-- VAULT A0 MACRO1 | Segurança Storage 360 | idempotente
-- Projeto alvo: vault-app. Não altera buckets.public nem arquivos, preserva URLs históricas.
-- APLICAR APÓS validação local dirigida e inventário. Há objetos nos buckets avatars/vault-attachments.
BEGIN;
SET LOCAL lock_timeout = '8s';
SET LOCAL statement_timeout = '45s';

-- Corte seguro: inventário deve continuar apto à migração sem apagar objetos.
DO $vault_a0_preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='avatars'
        AND (o.owner_id IS NULL OR o.owner_id <> split_part(o.name,'/',1))) THEN
    RAISE EXCEPTION 'VAULT A0: avatars com ownership historico irregular; auditar antes de mudar policy';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id IN ('saude','documents')
        AND (o.owner_id IS NULL OR o.owner_id <> split_part(o.name,'/',1))) THEN
    RAISE EXCEPTION 'VAULT A0: arquivos legados nao mapeados; migracao requer inventario manual';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='clinical-private'
        AND (length(split_part(o.name,'/',3))=0 OR NOT EXISTS
          (SELECT 1 FROM public.persons p WHERE p.id::text=split_part(o.name,'/',2)
            AND p.user_id::text=split_part(o.name,'/',1)))) THEN
    RAISE EXCEPTION 'VAULT A0: asset privado com escopo inconsistente; reconciliar M2/M3';
  END IF;
END
$vault_a0_preflight$;

-- Avatar público para visualização por URL: nenhuma autorização pública de escrita.
DROP POLICY IF EXISTS "Acesso total aos avatares" ON storage.objects;
DROP POLICY IF EXISTS vault_a0_avatars_select ON storage.objects;
DROP POLICY IF EXISTS vault_a0_avatars_insert ON storage.objects;
DROP POLICY IF EXISTS vault_a0_avatars_update ON storage.objects;
DROP POLICY IF EXISTS vault_a0_avatars_delete ON storage.objects;
CREATE POLICY vault_a0_avatars_select ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = (SELECT auth.uid())::text
        AND owner_id = (SELECT auth.uid())::text);
CREATE POLICY vault_a0_avatars_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = (SELECT auth.uid())::text
             AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text));
CREATE POLICY vault_a0_avatars_update ON storage.objects FOR UPDATE TO authenticated
 USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = (SELECT auth.uid())::text
        AND owner_id = (SELECT auth.uid())::text)
 WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = (SELECT auth.uid())::text
             AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text));
CREATE POLICY vault_a0_avatars_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = (SELECT auth.uid())::text
        AND owner_id = (SELECT auth.uid())::text);

-- Dois buckets antigos vazios neste corte. Continuam públicos SOMENTE para compatibilidade de links;
-- operações de metadados passam a exigir conta proprietária + prefixo. Não usar para novos assets clínicos.
DROP POLICY IF EXISTS "Permitir delete autenticado em saude e documents" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura publica em saude e documents" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update autenticado em saude e documents" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload autenticado em saude e documents" ON storage.objects;
DROP POLICY IF EXISTS vault_a0_legacy_select ON storage.objects;
DROP POLICY IF EXISTS vault_a0_legacy_insert ON storage.objects;
DROP POLICY IF EXISTS vault_a0_legacy_update ON storage.objects;
DROP POLICY IF EXISTS vault_a0_legacy_delete ON storage.objects;
CREATE POLICY vault_a0_legacy_select ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id IN ('saude', 'documents')
        AND split_part(name, '/', 1) = (SELECT auth.uid())::text
        AND owner_id = (SELECT auth.uid())::text);
CREATE POLICY vault_a0_legacy_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id IN ('saude', 'documents')
             AND split_part(name, '/', 1) = (SELECT auth.uid())::text
             AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text));
CREATE POLICY vault_a0_legacy_update ON storage.objects FOR UPDATE TO authenticated
 USING (bucket_id IN ('saude', 'documents')
        AND split_part(name, '/', 1) = (SELECT auth.uid())::text
        AND owner_id = (SELECT auth.uid())::text)
 WITH CHECK (bucket_id IN ('saude', 'documents')
             AND split_part(name, '/', 1) = (SELECT auth.uid())::text
             AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text));
CREATE POLICY vault_a0_legacy_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id IN ('saude', 'documents')
        AND split_part(name, '/', 1) = (SELECT auth.uid())::text
        AND owner_id = (SELECT auth.uid())::text);

-- M1: corrige p.name erroneamente usado como caminho da pessoa.
-- Formato obrigatório: {auth.uid()}/{person_id}/{nome}; ownership pela pessoa já cadastrada.
DROP POLICY IF EXISTS clinical_private_owner_insert_m1 ON storage.objects;
DROP POLICY IF EXISTS clinical_private_owner_select_m1 ON storage.objects;
DROP POLICY IF EXISTS clinical_private_owner_update_m1 ON storage.objects;
DROP POLICY IF EXISTS vault_a0_clinical_insert ON storage.objects;
DROP POLICY IF EXISTS vault_a0_clinical_select ON storage.objects;
DROP POLICY IF EXISTS vault_a0_clinical_update ON storage.objects;
CREATE POLICY vault_a0_clinical_select ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id = 'clinical-private'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND length(split_part(name, '/', 3)) > 0
    AND EXISTS (SELECT 1 FROM public.persons p
      WHERE p.id::text = split_part(storage.objects.name, '/', 2) AND p.user_id = (SELECT auth.uid())));
CREATE POLICY vault_a0_clinical_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id = 'clinical-private'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND length(split_part(name, '/', 3)) > 0
    AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text)
    AND EXISTS (SELECT 1 FROM public.persons p
      WHERE p.id::text = split_part(storage.objects.name, '/', 2) AND p.user_id = (SELECT auth.uid())));
CREATE POLICY vault_a0_clinical_update ON storage.objects FOR UPDATE TO authenticated
 USING (bucket_id = 'clinical-private'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text)
    AND EXISTS (SELECT 1 FROM public.persons p
      WHERE p.id::text = split_part(storage.objects.name, '/', 2) AND p.user_id = (SELECT auth.uid())))
 WITH CHECK (bucket_id = 'clinical-private'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
    AND length(split_part(name, '/', 3)) > 0
    AND (owner_id IS NULL OR owner_id = (SELECT auth.uid())::text)
    AND EXISTS (SELECT 1 FROM public.persons p
      WHERE p.id::text = split_part(storage.objects.name, '/', 2) AND p.user_id = (SELECT auth.uid())));
COMMIT;
