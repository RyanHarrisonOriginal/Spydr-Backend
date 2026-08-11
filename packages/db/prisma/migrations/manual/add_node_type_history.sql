CREATE TABLE IF NOT EXISTS spydr_node_type_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES spydr_nodes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  from_type spydr_node_type NOT NULL,
  to_type spydr_node_type NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  transformed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spydr_node_type_history_node
  ON spydr_node_type_history (org_id, node_id, transformed_at DESC);
