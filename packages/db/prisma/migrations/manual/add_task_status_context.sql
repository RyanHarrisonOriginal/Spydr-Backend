ALTER TABLE public.spydr_task_details
ADD COLUMN IF NOT EXISTS blocked_by_node_id uuid NULL,
ADD COLUMN IF NOT EXISTS follow_up_at timestamptz(6) NULL,
ADD COLUMN IF NOT EXISTS waiting_note text NULL;

DO $$
BEGIN
  ALTER TABLE public.spydr_task_details
  ADD CONSTRAINT spydr_task_details_blocked_by_node_id_fkey
  FOREIGN KEY (blocked_by_node_id) REFERENCES public.spydr_nodes(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_spydr_task_blocked_by
ON public.spydr_task_details (blocked_by_node_id);
