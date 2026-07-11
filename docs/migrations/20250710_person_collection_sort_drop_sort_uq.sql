-- Drop the sort_order uniqueness constraint on person collection sort.
-- That constraint causes P2002 during reorder: parallel upserts briefly collide
-- when two rows swap sort_order values. sort_order is for ordering only (same as
-- spydr_nodes.sort_order) — uniqueness per (org, person, node) is sufficient.
--
-- Run manually against Postgres. Safe to re-run.

BEGIN;

ALTER TABLE spydr_person_collection_sort
  DROP CONSTRAINT IF EXISTS spydr_person_collection_sort_type_uq;

COMMIT;
