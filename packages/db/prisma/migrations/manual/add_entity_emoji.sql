ALTER TABLE public.spydr_project_area_details
ADD COLUMN IF NOT EXISTS emoji varchar(64) NULL;

ALTER TABLE public.spydr_project_details
ADD COLUMN IF NOT EXISTS emoji varchar(64) NULL;

ALTER TABLE public.spydr_task_details
ADD COLUMN IF NOT EXISTS emoji varchar(64) NULL;
