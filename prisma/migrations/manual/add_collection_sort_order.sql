-- Manual collection priority order for Spydr workspace lists.
-- Stored on spydr_nodes (all collection types share this table; notes have no detail table).
--
-- Run against your Postgres database, then: npx prisma generate

BEGIN;

ALTER TABLE spydr_nodes
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN spydr_nodes.sort_order IS
  'Manual collection list order (lower = higher priority). Scoped per user + node_type.';

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_user_type_sort
  ON spydr_nodes (user_id, node_type, sort_order);

-- Backfill: preserve current "most recently touched first" as initial manual order
-- within each user + node_type group (0 = top of list).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, node_type
      ORDER BY updated_at DESC, created_at DESC, id ASC
    ) - 1 AS next_sort_order
  FROM spydr_nodes
  WHERE is_deleted = false
)
UPDATE spydr_nodes AS n
SET sort_order = ranked.next_sort_order
FROM ranked
WHERE n.id = ranked.id;

COMMIT;
