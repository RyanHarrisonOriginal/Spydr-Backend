-- Template spawn lineage: link open projects/tasks back to the template they came from.

ALTER TABLE public.spydr_project_details
  ADD COLUMN IF NOT EXISTS source_template_id uuid NULL
    REFERENCES public.spydr_project_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_param_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS template_spawned_at timestamptz(6) NULL,
  ADD COLUMN IF NOT EXISTS template_synced_at timestamptz(6) NULL;

CREATE INDEX IF NOT EXISTS idx_spydr_project_details_source_template
  ON public.spydr_project_details (source_template_id)
  WHERE source_template_id IS NOT NULL;

ALTER TABLE public.spydr_task_details
  ADD COLUMN IF NOT EXISTS source_template_task_id uuid NULL
    REFERENCES public.spydr_project_template_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spydr_task_details_source_template_task
  ON public.spydr_task_details (source_template_task_id)
  WHERE source_template_task_id IS NOT NULL;
