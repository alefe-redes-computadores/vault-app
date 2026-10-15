-- Optional, explicitly declared anatomy; old records remain NULL.
-- No clinical rows, statuses, ownership policies or grants are changed.
ALTER TABLE public.cirurgias
  ADD COLUMN IF NOT EXISTS regiao_corporal text,
  ADD COLUMN IF NOT EXISTS lateralidade text;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.cirurgias'::regclass AND conname = 'cirurgias_regiao_corporal_v153_check') THEN
    ALTER TABLE public.cirurgias ADD CONSTRAINT cirurgias_regiao_corporal_v153_check CHECK (
      regiao_corporal IN ('cabeca','pescoco','olho','ouvido','ombro','braco','cotovelo','antebraco','punho','mao','torax','abdome','pelve','coluna','quadril','coxa','joelho','perna','tornozelo','pe','outro')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.cirurgias'::regclass AND conname = 'cirurgias_lateralidade_v153_check') THEN
    ALTER TABLE public.cirurgias ADD CONSTRAINT cirurgias_lateralidade_v153_check CHECK (
      lateralidade IN ('direita','esquerda','bilateral','nao_aplicavel')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.cirurgias'::regclass AND conname = 'cirurgias_lateralidade_regiao_v153_check') THEN
    ALTER TABLE public.cirurgias ADD CONSTRAINT cirurgias_lateralidade_regiao_v153_check CHECK (
      lateralidade IS NULL OR regiao_corporal IS NOT NULL
    );
  END IF;
END
$migration$;

NOTIFY pgrst, 'reload schema';
