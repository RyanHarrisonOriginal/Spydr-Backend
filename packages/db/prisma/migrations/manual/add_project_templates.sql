-- Parameterized project templates (blueprint tables; not spydr_nodes).

CREATE TABLE IF NOT EXISTS public.spydr_project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_user_id text NOT NULL,
  name text NOT NULL,
  description text NULL,
  title_template text NOT NULL,
  body_template text NOT NULL DEFAULT '',
  outcome_template text NULL,
  status public.spydr_node_status NOT NULL DEFAULT 'active',
  priority public.spydr_priority NOT NULL DEFAULT 'medium',
  risk_level public.spydr_priority NOT NULL DEFAULT 'medium',
  area text NULL,
  tags text[] NOT NULL DEFAULT '{}',
  source_project_node_id uuid NULL REFERENCES public.spydr_nodes(id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spydr_project_templates_org_archived
  ON public.spydr_project_templates (org_id, is_archived);

CREATE TABLE IF NOT EXISTS public.spydr_project_template_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.spydr_project_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  value_type text NOT NULL DEFAULT 'string',
  required boolean NOT NULL DEFAULT true,
  default_value text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT spydr_project_template_parameters_template_key_key UNIQUE (template_id, key)
);

CREATE INDEX IF NOT EXISTS idx_spydr_project_template_parameters_sort
  ON public.spydr_project_template_parameters (template_id, sort_order);

CREATE TABLE IF NOT EXISTS public.spydr_project_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.spydr_project_templates(id) ON DELETE CASCADE,
  title_template text NOT NULL,
  body_template text NOT NULL DEFAULT '',
  status public.spydr_node_status NOT NULL DEFAULT 'active',
  priority public.spydr_priority NOT NULL DEFAULT 'medium',
  due_offset_days integer NULL,
  estimated_minutes integer NULL,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_spydr_project_template_tasks_sort
  ON public.spydr_project_template_tasks (template_id, sort_order);
