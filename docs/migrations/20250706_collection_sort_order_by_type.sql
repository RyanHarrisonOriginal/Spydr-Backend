-- Collection manual rank (sort_order) scoped per organization + node_type.
-- Each collection page (projects, tasks, people, notes, ideas, decisions, resources)
-- maintains its own ranking sequence. Types do not share sort_order sequences.
--
-- Run against Postgres, then: npx prisma generate
-- Safe to re-run (idempotent).

BEGIN;

-- Column (all collection nodes live in spydr_nodes)
ALTER TABLE spydr_nodes
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN spydr_nodes.sort_order IS
  'Manual collection list rank within org_id + node_type (lower = higher rank). Not shared across node types.';

-- Org-scoped index (preferred after multi-tenant org migration)
CREATE INDEX IF NOT EXISTS idx_spydr_nodes_org_type_sort
  ON spydr_nodes (org_id, node_type, sort_order);

-- Legacy user-scoped index (harmless if present)
CREATE INDEX IF NOT EXISTS idx_spydr_nodes_user_type_sort
  ON spydr_nodes (user_id, node_type, sort_order);

-- Rebuild ranks independently for each org + node_type group.
-- Uses 1000-step spacing to match application reorder increments.
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY org_id, node_type
      ORDER BY sort_order ASC, updated_at DESC, created_at DESC, id ASC
    ) - 1) * 1000 AS next_sort_order
  FROM spydr_nodes
  WHERE is_deleted = false
    AND node_type IN (
      'project',
      'task',
      'person',
      'note',
      'idea',
      'decision',
      'resource'
    )
)
UPDATE spydr_nodes AS n
SET sort_order = ranked.next_sort_order
FROM ranked
WHERE n.id = ranked.id;

COMMIT;
