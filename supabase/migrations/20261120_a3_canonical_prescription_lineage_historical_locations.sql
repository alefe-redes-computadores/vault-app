-- VAULT A3 MACRO2 — event-scoped snapshots only, not a second prescription or assignment ledger.
-- Canonical version links and effective supply locations ALREADY exist in A1 tables.
-- Existing rows are NOT backfilled using current address/name (that would falsify history).
BEGIN;
ALTER TABLE public.renovacoes
  ADD COLUMN IF NOT EXISTS a3_location_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS a3_location_changes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.retiradas
  ADD COLUMN IF NOT EXISTS a3_location_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS a3_location_changes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.a1_supply_locations
  ADD COLUMN IF NOT EXISTS a3_location_snapshot jsonb;

DO $a3$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vault_a3_renovacoes_locations_ck' AND conrelid='public.renovacoes'::regclass) THEN
  ALTER TABLE public.renovacoes ADD CONSTRAINT vault_a3_renovacoes_locations_ck CHECK (
   (a3_location_snapshot IS NULL OR jsonb_typeof(a3_location_snapshot)='object')
   AND jsonb_typeof(a3_location_changes)='array'
   AND jsonb_array_length(a3_location_changes)<=200
  ) NOT VALID;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vault_a3_retiradas_locations_ck' AND conrelid='public.retiradas'::regclass) THEN
  ALTER TABLE public.retiradas ADD CONSTRAINT vault_a3_retiradas_locations_ck CHECK (
   (a3_location_snapshot IS NULL OR jsonb_typeof(a3_location_snapshot)='object')
   AND jsonb_typeof(a3_location_changes)='array'
   AND jsonb_array_length(a3_location_changes)<=200
  ) NOT VALID;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vault_a3_supply_locations_ck' AND conrelid='public.a1_supply_locations'::regclass) THEN
  ALTER TABLE public.a1_supply_locations ADD CONSTRAINT vault_a3_supply_locations_ck CHECK (
   a3_location_snapshot IS NULL OR jsonb_typeof(a3_location_snapshot)='object'
  ) NOT VALID;
 END IF;
END $a3$;
-- A1 remains the sole version authority; prevent two successors of one same-person prescription.
-- An explicit branch requires a separate reviewed history, never silent last-writer-wins.
CREATE UNIQUE INDEX IF NOT EXISTS vault_a3_one_active_prescription_successor_uidx
 ON public.a1_prescription_links (user_id,person_id,renovacao_anterior_id)
 WHERE deleted_at IS NULL;
-- No new event tables, stock mutations, RLS changes, buckets or SECURITY DEFINER.
COMMIT;
