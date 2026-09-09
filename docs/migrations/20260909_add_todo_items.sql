-- Mirror of packages/db/prisma/migrations/manual/add_todo_items.sql
-- Daily action-item membership: tasks tagged onto a user's todo list.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'spydr_todo_item_source' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.spydr_todo_item_source AS ENUM ('user', 'agent');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.spydr_todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  task_node_id uuid NOT NULL REFERENCES public.spydr_nodes(id) ON DELETE CASCADE,
  source public.spydr_todo_item_source NOT NULL DEFAULT 'user',
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz(6) NOT NULL DEFAULT now(),
  is_stale boolean NOT NULL DEFAULT false,
  stale_at timestamptz(6) NULL,
  removed_at timestamptz(6) NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT spydr_todo_items_org_user_task_key UNIQUE (org_id, user_id, task_node_id)
);

CREATE INDEX IF NOT EXISTS idx_spydr_todo_items_user_active
  ON public.spydr_todo_items (org_id, user_id, sort_order)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_spydr_todo_items_stale_scan
  ON public.spydr_todo_items (added_at)
  WHERE removed_at IS NULL AND is_stale = false;

CREATE INDEX IF NOT EXISTS idx_spydr_todo_items_task
  ON public.spydr_todo_items (task_node_id);
