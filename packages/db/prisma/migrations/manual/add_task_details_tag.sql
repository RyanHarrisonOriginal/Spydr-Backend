ALTER TABLE public.spydr_task_details
ADD COLUMN IF NOT EXISTS tag text[] NULL;

UPDATE public.spydr_task_details
SET tag = '{}'::text[]
WHERE tag IS NULL;

ALTER TABLE public.spydr_task_details
ALTER COLUMN tag SET DEFAULT '{}'::text[];
