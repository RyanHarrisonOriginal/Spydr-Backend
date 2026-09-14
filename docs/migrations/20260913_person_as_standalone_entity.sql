-- Person becomes a standalone entity (not a spydr_nodes type).
-- Run manually in Postgres. Do NOT use Prisma migrate. Do not auto-apply.
--
-- Run after:
--   docs/migrations/20260913_person_identity_and_org_invites.sql
--   docs/migrations/20260913_person_identity_backfill.sql (optional)
--   docs/migrations/20260913_enrich_person_clerk_id_remove_dupes.sql (optional, recommended)
--
-- Target graph:
--   organizations 1—N organization_members N—1 spydr_person_details
--   spydr_person_details 1—N spydr_nodes          (node.person_id)
--
-- Person ids are preserved (former person node ids). Existing FKs that stored
-- those ids keep their values; only the referenced table changes.
--
-- Node types stay as they are except `person` is removed from spydr_node_type.
-- (project, project_area, task, idea, note, decision, resource, inbox_item)
--
-- After applying, regenerate the Prisma client:
--   npm run prisma:generate
--
-- Review PART A, then run PART B in a transaction. PART B raises if data would
-- be orphaned. ROLLBACK if anything looks wrong before COMMIT.

-- =============================================================================
-- PART A — preview (safe / read-only)
-- =============================================================================

-- Person nodes vs person_details (orphans either way)
SELECT
  (SELECT COUNT(*) FROM spydr_nodes WHERE node_type = 'person') AS person_nodes,
  (SELECT COUNT(*) FROM spydr_person_details) AS person_details,
  (SELECT COUNT(*)
   FROM spydr_nodes n
   WHERE n.node_type = 'person'
     AND NOT EXISTS (
       SELECT 1 FROM spydr_person_details d WHERE d.node_id = n.id
     )) AS person_nodes_missing_details,
  (SELECT COUNT(*)
   FROM spydr_person_details d
   WHERE NOT EXISTS (
     SELECT 1 FROM spydr_nodes n WHERE n.id = d.node_id AND n.node_type = 'person'
   )) AS details_without_person_node;

-- Org members missing a person, or pointing at a non-person / missing node
SELECT
  COUNT(*) FILTER (WHERE om.person_id IS NULL) AS members_without_person_id,
  COUNT(*) FILTER (
    WHERE om.person_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM spydr_nodes n
        WHERE n.id = om.person_id
          AND n.node_type = 'person'
      )
  ) AS members_person_id_not_a_person_node
FROM organization_members om;

-- Distinct node authors who have no Clerk-linked person yet
SELECT COUNT(*) AS node_authors_without_clerk_person
FROM (
  SELECT DISTINCT n.user_id
  FROM spydr_nodes n
  WHERE n.node_type <> 'person'
    AND NOT EXISTS (
      SELECT 1
      FROM spydr_person_details d
      WHERE d.clerk_user_id = n.user_id
    )
) x;

-- FKs / columns that currently store person node ids
SELECT
  (SELECT COUNT(*) FROM spydr_project_details WHERE requester_person_node_id IS NOT NULL) AS project_requesters,
  (SELECT COUNT(*) FROM spydr_project_details WHERE assignee_person_node_id IS NOT NULL) AS project_assignees,
  (SELECT COUNT(*) FROM spydr_project_details WHERE sponsor_person_node_id IS NOT NULL) AS project_sponsors,
  (SELECT COUNT(*) FROM spydr_project_details WHERE reviewer_person_node_id IS NOT NULL) AS project_reviewers,
  (SELECT COUNT(*) FROM spydr_task_details WHERE assignee_person_node_id IS NOT NULL) AS task_assignees,
  (SELECT COUNT(*) FROM spydr_person_collection_sort) AS person_collection_sort_rows,
  (SELECT COUNT(*)
   FROM spydr_node_relationships r
   JOIN spydr_nodes s ON s.id = r.source_node_id
   JOIN spydr_nodes t ON t.id = r.target_node_id
   WHERE s.node_type = 'person' OR t.node_type = 'person') AS relationships_touching_person,
  (SELECT COUNT(*)
   FROM spydr_outlook_snapshot_items i
   JOIN spydr_nodes n ON n.id = i.node_id
   WHERE n.node_type = 'person') AS outlook_items_on_person,
  (SELECT COUNT(*)
   FROM spydr_node_type_history h
   WHERE h.from_type = 'person' OR h.to_type = 'person') AS type_history_touching_person,
  (SELECT COUNT(*)
   FROM spydr_inbox_items
   WHERE suggested_type = 'person') AS inbox_suggested_person;

-- =============================================================================
-- PART B — mutate
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Detach person_details from nodes so deleting person nodes cannot cascade
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_person_details
  DROP CONSTRAINT IF EXISTS spydr_person_details_node_id_fkey;

-- Person nodes that never got a details row (keep the person, do not drop them)
INSERT INTO spydr_person_details (node_id, full_name, created_at, updated_at)
SELECT
  n.id,
  COALESCE(NULLIF(btrim(n.title), ''), 'Unnamed person'),
  n.created_at,
  n.updated_at
FROM spydr_nodes n
WHERE n.node_type = 'person'
  AND NOT EXISTS (
    SELECT 1 FROM spydr_person_details d WHERE d.node_id = n.id
  );

-- ---------------------------------------------------------------------------
-- 2. Enhance person_details with the node fields people currently live on
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_person_details
  ADD COLUMN IF NOT EXISTS org_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS status spydr_node_status,
  ADD COLUMN IF NOT EXISTS priority spydr_priority,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legacy_node_snapshot JSONB;

UPDATE spydr_person_details d
SET
  org_id = n.org_id,
  created_by_user_id = n.user_id,
  body = n.body,
  status = n.status,
  priority = n.priority,
  area = n.area,
  tags = n.tags,
  sort_order = n.sort_order,
  archived_at = n.archived_at,
  is_deleted = n.is_deleted,
  deleted_at = n.deleted_at,
  created_at = n.created_at,
  updated_at = n.updated_at,
  full_name = CASE
    WHEN d.full_name IS NULL OR btrim(d.full_name) = '' THEN COALESCE(NULLIF(btrim(n.title), ''), 'Unnamed person')
    ELSE d.full_name
  END,
  legacy_node_snapshot = jsonb_build_object(
    'former_node', to_jsonb(n.*),
    'type_history', COALESCE((
      SELECT jsonb_agg(to_jsonb(h.*) ORDER BY h.transformed_at)
      FROM spydr_node_type_history h
      WHERE h.node_id = n.id
    ), '[]'::jsonb)
  )
FROM spydr_nodes n
WHERE n.id = d.node_id
  AND n.node_type = 'person';

UPDATE spydr_person_details
SET
  body = COALESCE(body, ''),
  status = COALESCE(status, 'active'),
  priority = COALESCE(priority, 'medium'),
  tags = COALESCE(tags, ARRAY[]::TEXT[]),
  sort_order = COALESCE(sort_order, 0),
  is_deleted = COALESCE(is_deleted, false)
WHERE body IS NULL
   OR status IS NULL
   OR priority IS NULL
   OR tags IS NULL
   OR sort_order IS NULL
   OR is_deleted IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM spydr_person_details WHERE org_id IS NULL OR created_by_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'spydr_person_details has rows that could not inherit org_id / created_by_user_id from a person node';
  END IF;
END $$;

ALTER TABLE spydr_person_details
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN created_by_user_id SET NOT NULL,
  ALTER COLUMN body SET NOT NULL,
  ALTER COLUMN body SET DEFAULT '',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN priority SET NOT NULL,
  ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN tags SET NOT NULL,
  ALTER COLUMN tags SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN is_deleted SET NOT NULL,
  ALTER COLUMN is_deleted SET DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_person_details_org_id_fkey'
  ) THEN
    ALTER TABLE spydr_person_details
      ADD CONSTRAINT spydr_person_details_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spydr_person_details_org
  ON spydr_person_details (org_id);

CREATE INDEX IF NOT EXISTS idx_spydr_person_details_org_deleted
  ON spydr_person_details (org_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_spydr_person_details_created_by
  ON spydr_person_details (created_by_user_id);

COMMENT ON COLUMN spydr_person_details.org_id IS
  'Home / originating org (from the former person node). Membership is organization_members. Contacts without clerk_user_id are org-scoped via this column.';

COMMENT ON COLUMN spydr_person_details.created_by_user_id IS
  'Clerk user id that created the former person node (not necessarily the person themselves).';

-- Primary key stays the former node id so every existing person_id keeps working
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'spydr_person_details'
      AND column_name = 'node_id'
  ) THEN
    ALTER TABLE spydr_person_details RENAME COLUMN node_id TO id;
  END IF;
END $$;

ALTER TABLE spydr_person_details
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMENT ON TABLE spydr_person_details IS
  'Standalone person entity. No longer a spydr_nodes row. Id is the former person node id.';

-- ---------------------------------------------------------------------------
-- 3. Create people for Clerk members / node authors who do not have one yet
-- ---------------------------------------------------------------------------

INSERT INTO spydr_person_details (
  id,
  org_id,
  created_by_user_id,
  full_name,
  clerk_user_id,
  body,
  status,
  priority,
  tags,
  sort_order,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  s.org_id,
  s.user_id,
  s.user_id,
  s.user_id,
  '',
  'active',
  'medium',
  ARRAY[]::TEXT[],
  0,
  false,
  now(),
  now()
FROM (
  SELECT DISTINCT ON (src.user_id)
    src.user_id,
    src.org_id
  FROM (
    SELECT om.user_id, om.organization_id AS org_id, om.created_at AS created_at
    FROM organization_members om
    UNION ALL
    SELECT n.user_id, n.org_id, n.created_at
    FROM spydr_nodes n
    WHERE n.node_type <> 'person'
  ) src
  ORDER BY src.user_id, src.created_at ASC
) s
WHERE NOT EXISTS (
  SELECT 1
  FROM spydr_person_details d
  WHERE d.clerk_user_id = s.user_id
);

-- ---------------------------------------------------------------------------
-- 4. Org → org member → person
-- ---------------------------------------------------------------------------

-- Drop the node FK before pointing members at newly created person ids.
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_person_id_fkey;

UPDATE organization_members om
SET person_id = d.id
FROM spydr_person_details d
WHERE d.clerk_user_id = om.user_id
  AND om.person_id IS DISTINCT FROM d.id;

-- Keep ids that already pointed at a person details row (former person node)
UPDATE organization_members om
SET person_id = d.id
FROM spydr_person_details d
WHERE om.person_id = d.id
  AND om.person_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM organization_members WHERE person_id IS NULL
  ) THEN
    RAISE EXCEPTION 'organization_members still has NULL person_id after backfill';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE NOT EXISTS (
      SELECT 1 FROM spydr_person_details d WHERE d.id = om.person_id
    )
  ) THEN
    RAISE EXCEPTION 'organization_members.person_id points at an id that is not in spydr_person_details';
  END IF;
END $$;

ALTER TABLE organization_members
  ALTER COLUMN person_id SET NOT NULL;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES spydr_person_details(id)
  ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- 5. Preserve person↔node and person↔person relationships before nodes go away
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spydr_person_node_links (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id          UUID NOT NULL REFERENCES spydr_person_details(id) ON DELETE CASCADE,
  node_id            UUID NOT NULL REFERENCES spydr_nodes(id) ON DELETE CASCADE,
  relationship_type  spydr_relationship_type NOT NULL,
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spydr_person_node_links_person_node_type_key
    UNIQUE (person_id, node_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_spydr_person_node_links_person
  ON spydr_person_node_links (person_id);

CREATE INDEX IF NOT EXISTS idx_spydr_person_node_links_node
  ON spydr_person_node_links (node_id);

CREATE INDEX IF NOT EXISTS idx_spydr_person_node_links_org
  ON spydr_person_node_links (org_id);

COMMENT ON TABLE spydr_person_node_links IS
  'Former spydr_node_relationships where exactly one end was a person node.';

CREATE TABLE IF NOT EXISTS spydr_person_person_links (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_person_id   UUID NOT NULL REFERENCES spydr_person_details(id) ON DELETE CASCADE,
  target_person_id   UUID NOT NULL REFERENCES spydr_person_details(id) ON DELETE CASCADE,
  relationship_type  spydr_relationship_type NOT NULL,
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spydr_person_person_links_source_target_type_key
    UNIQUE (source_person_id, target_person_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_spydr_person_person_links_source
  ON spydr_person_person_links (source_person_id);

CREATE INDEX IF NOT EXISTS idx_spydr_person_person_links_target
  ON spydr_person_person_links (target_person_id);

COMMENT ON TABLE spydr_person_person_links IS
  'Former spydr_node_relationships where both ends were person nodes.';

INSERT INTO spydr_person_node_links (
  org_id, person_id, node_id, relationship_type, reason, created_at
)
SELECT
  r.org_id,
  r.source_node_id,
  r.target_node_id,
  r.relationship_type,
  r.reason,
  r.created_at
FROM spydr_node_relationships r
JOIN spydr_nodes src ON src.id = r.source_node_id AND src.node_type = 'person'
JOIN spydr_nodes tgt ON tgt.id = r.target_node_id AND tgt.node_type <> 'person'
ON CONFLICT ON CONSTRAINT spydr_person_node_links_person_node_type_key DO NOTHING;

INSERT INTO spydr_person_node_links (
  org_id, person_id, node_id, relationship_type, reason, created_at
)
SELECT
  r.org_id,
  r.target_node_id,
  r.source_node_id,
  r.relationship_type,
  r.reason,
  r.created_at
FROM spydr_node_relationships r
JOIN spydr_nodes src ON src.id = r.source_node_id AND src.node_type <> 'person'
JOIN spydr_nodes tgt ON tgt.id = r.target_node_id AND tgt.node_type = 'person'
ON CONFLICT ON CONSTRAINT spydr_person_node_links_person_node_type_key DO NOTHING;

INSERT INTO spydr_person_person_links (
  org_id, source_person_id, target_person_id, relationship_type, reason, created_at
)
SELECT
  r.org_id,
  r.source_node_id,
  r.target_node_id,
  r.relationship_type,
  r.reason,
  r.created_at
FROM spydr_node_relationships r
JOIN spydr_nodes src ON src.id = r.source_node_id AND src.node_type = 'person'
JOIN spydr_nodes tgt ON tgt.id = r.target_node_id AND tgt.node_type = 'person'
ON CONFLICT ON CONSTRAINT spydr_person_person_links_source_target_type_key DO NOTHING;

DELETE FROM spydr_node_relationships r
USING spydr_nodes n
WHERE (r.source_node_id = n.id OR r.target_node_id = n.id)
  AND n.node_type = 'person';

-- ---------------------------------------------------------------------------
-- 6. Outlook items that pointed at person nodes
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_outlook_snapshot_items
  ADD COLUMN IF NOT EXISTS person_id UUID;

UPDATE spydr_outlook_snapshot_items i
SET
  person_id = i.node_id,
  node_id = NULL,
  node_type = NULL
FROM spydr_nodes n
WHERE i.node_id = n.id
  AND n.node_type = 'person';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_outlook_snapshot_items_person_id_fkey'
  ) THEN
    ALTER TABLE spydr_outlook_snapshot_items
      ADD CONSTRAINT spydr_outlook_snapshot_items_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES spydr_person_details(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spydr_outlook_items_person
  ON spydr_outlook_snapshot_items (person_id)
  WHERE person_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Retarget project / task / collection-sort FKs from nodes → person_details
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_project_details
  DROP CONSTRAINT IF EXISTS spydr_project_details_requester_person_node_id_fkey,
  DROP CONSTRAINT IF EXISTS spydr_project_details_assignee_person_node_id_fkey,
  DROP CONSTRAINT IF EXISTS spydr_project_details_sponsor_person_node_id_fkey,
  DROP CONSTRAINT IF EXISTS spydr_project_details_reviewer_person_node_id_fkey;

ALTER TABLE spydr_task_details
  DROP CONSTRAINT IF EXISTS spydr_task_details_assignee_person_node_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spydr_project_details'
      AND column_name = 'requester_person_node_id'
  ) THEN
    ALTER TABLE spydr_project_details RENAME COLUMN requester_person_node_id TO requester_person_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spydr_project_details'
      AND column_name = 'assignee_person_node_id'
  ) THEN
    ALTER TABLE spydr_project_details RENAME COLUMN assignee_person_node_id TO assignee_person_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spydr_project_details'
      AND column_name = 'sponsor_person_node_id'
  ) THEN
    ALTER TABLE spydr_project_details RENAME COLUMN sponsor_person_node_id TO sponsor_person_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spydr_project_details'
      AND column_name = 'reviewer_person_node_id'
  ) THEN
    ALTER TABLE spydr_project_details RENAME COLUMN reviewer_person_node_id TO reviewer_person_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spydr_task_details'
      AND column_name = 'assignee_person_node_id'
  ) THEN
    ALTER TABLE spydr_task_details RENAME COLUMN assignee_person_node_id TO assignee_person_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'spydr_person_collection_sort'
      AND column_name = 'person_node_id'
  ) THEN
    ALTER TABLE spydr_person_collection_sort RENAME COLUMN person_node_id TO person_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM spydr_project_details p
    WHERE p.requester_person_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = p.requester_person_id)
  ) OR EXISTS (
    SELECT 1
    FROM spydr_project_details p
    WHERE p.assignee_person_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = p.assignee_person_id)
  ) OR EXISTS (
    SELECT 1
    FROM spydr_project_details p
    WHERE p.sponsor_person_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = p.sponsor_person_id)
  ) OR EXISTS (
    SELECT 1
    FROM spydr_project_details p
    WHERE p.reviewer_person_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = p.reviewer_person_id)
  ) OR EXISTS (
    SELECT 1
    FROM spydr_task_details t
    WHERE t.assignee_person_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = t.assignee_person_id)
  ) OR EXISTS (
    SELECT 1
    FROM spydr_person_collection_sort s
    WHERE NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = s.person_id)
  ) THEN
    RAISE EXCEPTION 'A project/task/collection-sort person id is not present in spydr_person_details';
  END IF;
END $$;

ALTER TABLE spydr_project_details
  DROP CONSTRAINT IF EXISTS spydr_project_details_requester_person_id_fkey,
  DROP CONSTRAINT IF EXISTS spydr_project_details_assignee_person_id_fkey,
  DROP CONSTRAINT IF EXISTS spydr_project_details_sponsor_person_id_fkey,
  DROP CONSTRAINT IF EXISTS spydr_project_details_reviewer_person_id_fkey;

ALTER TABLE spydr_project_details
  ADD CONSTRAINT spydr_project_details_requester_person_id_fkey
  FOREIGN KEY (requester_person_id) REFERENCES spydr_person_details(id) ON DELETE SET NULL,
  ADD CONSTRAINT spydr_project_details_assignee_person_id_fkey
  FOREIGN KEY (assignee_person_id) REFERENCES spydr_person_details(id) ON DELETE SET NULL,
  ADD CONSTRAINT spydr_project_details_sponsor_person_id_fkey
  FOREIGN KEY (sponsor_person_id) REFERENCES spydr_person_details(id) ON DELETE SET NULL,
  ADD CONSTRAINT spydr_project_details_reviewer_person_id_fkey
  FOREIGN KEY (reviewer_person_id) REFERENCES spydr_person_details(id) ON DELETE SET NULL;

ALTER TABLE spydr_task_details
  DROP CONSTRAINT IF EXISTS spydr_task_details_assignee_person_id_fkey;

ALTER TABLE spydr_task_details
  ADD CONSTRAINT spydr_task_details_assignee_person_id_fkey
  FOREIGN KEY (assignee_person_id) REFERENCES spydr_person_details(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_person_collection_sort_person_id_fkey'
  ) THEN
    ALTER TABLE spydr_person_collection_sort
      ADD CONSTRAINT spydr_person_collection_sort_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES spydr_person_details(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_person_collection_sort_node_id_fkey'
  ) THEN
    ALTER TABLE spydr_person_collection_sort
      ADD CONSTRAINT spydr_person_collection_sort_node_id_fkey
      FOREIGN KEY (node_id) REFERENCES spydr_nodes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Archive type-history / inbox suggestions that used node_type = person
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spydr_person_type_history_archive (
  id              UUID PRIMARY KEY,
  org_id          UUID,
  former_node_id  UUID,
  user_id         TEXT,
  from_type       TEXT,
  to_type         TEXT,
  snapshot        JSONB,
  transformed_at  TIMESTAMPTZ
);

INSERT INTO spydr_person_type_history_archive (
  id, org_id, former_node_id, user_id, from_type, to_type, snapshot, transformed_at
)
SELECT
  h.id, h.org_id, h.node_id, h.user_id, h.from_type::text, h.to_type::text, h.snapshot, h.transformed_at
FROM spydr_node_type_history h
WHERE h.from_type = 'person' OR h.to_type = 'person'
ON CONFLICT (id) DO NOTHING;

DELETE FROM spydr_node_type_history
WHERE from_type = 'person' OR to_type = 'person';

UPDATE spydr_inbox_items
SET suggested_type = NULL
WHERE suggested_type = 'person';

-- ---------------------------------------------------------------------------
-- 9. Delete former person nodes (details are detached; ids live on person_details)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM spydr_todo_items t
    JOIN spydr_nodes n ON n.id = t.task_node_id
    WHERE n.node_type = 'person'
  ) OR EXISTS (
    SELECT 1 FROM spydr_inbox_items i
    JOIN spydr_nodes n ON n.id = i.node_id
    WHERE n.node_type = 'person'
  ) OR EXISTS (
    SELECT 1 FROM spydr_project_details p
    JOIN spydr_nodes n ON n.id = p.node_id
    WHERE n.node_type = 'person'
  ) OR EXISTS (
    SELECT 1 FROM spydr_task_details t
    JOIN spydr_nodes n ON n.id = t.node_id
    WHERE n.node_type = 'person'
  ) OR EXISTS (
    SELECT 1 FROM spydr_idea_details i
    JOIN spydr_nodes n ON n.id = i.node_id
    WHERE n.node_type = 'person'
  ) OR EXISTS (
    SELECT 1 FROM spydr_decision_details d
    JOIN spydr_nodes n ON n.id = d.node_id
    WHERE n.node_type = 'person'
  ) OR EXISTS (
    SELECT 1 FROM spydr_resource_details r
    JOIN spydr_nodes n ON n.id = r.node_id
    WHERE n.node_type = 'person'
  ) THEN
    RAISE EXCEPTION 'Refusing to delete person nodes that still own non-person detail/todo/inbox rows';
  END IF;
END $$;

DELETE FROM spydr_nodes
WHERE node_type = 'person';

-- ---------------------------------------------------------------------------
-- 10. Node → person (owner / creator)
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_nodes
  ADD COLUMN IF NOT EXISTS person_id UUID;

UPDATE spydr_nodes n
SET person_id = d.id
FROM spydr_person_details d
WHERE n.person_id IS NULL
  AND d.clerk_user_id = n.user_id;

-- Same creator in the same org (contacts / people without clerk_user_id)
UPDATE spydr_nodes n
SET person_id = d.id
FROM spydr_person_details d
WHERE n.person_id IS NULL
  AND d.created_by_user_id = n.user_id
  AND d.org_id = n.org_id
  AND d.clerk_user_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM spydr_nodes WHERE person_id IS NULL) THEN
    RAISE EXCEPTION 'spydr_nodes still has NULL person_id after backfill';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM spydr_nodes n
    WHERE NOT EXISTS (SELECT 1 FROM spydr_person_details d WHERE d.id = n.person_id)
  ) THEN
    RAISE EXCEPTION 'spydr_nodes.person_id points at an id that is not in spydr_person_details';
  END IF;
END $$;

ALTER TABLE spydr_nodes
  ALTER COLUMN person_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_nodes_person_id_fkey'
  ) THEN
    ALTER TABLE spydr_nodes
      ADD CONSTRAINT spydr_nodes_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES spydr_person_details(id)
      ON DELETE RESTRICT
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_person
  ON spydr_nodes (person_id);

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_org_person
  ON spydr_nodes (org_id, person_id);

COMMENT ON COLUMN spydr_nodes.person_id IS
  'Person who owns / created this node. Complements user_id (Clerk id).';

-- ---------------------------------------------------------------------------
-- 11. Remove `person` from spydr_node_type
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM spydr_nodes WHERE node_type::text = 'person') THEN
    RAISE EXCEPTION 'person nodes still exist; cannot drop enum value';
  END IF;
  IF EXISTS (
    SELECT 1 FROM spydr_inbox_items WHERE suggested_type::text = 'person'
  ) THEN
    RAISE EXCEPTION 'inbox suggested_type still uses person';
  END IF;
  IF EXISTS (
    SELECT 1 FROM spydr_outlook_snapshot_items WHERE node_type::text = 'person'
  ) THEN
    RAISE EXCEPTION 'outlook items still use node_type person';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM spydr_node_type_history
    WHERE from_type::text = 'person' OR to_type::text = 'person'
  ) THEN
    RAISE EXCEPTION 'node type history still uses person';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'spydr_node_type'
      AND e.enumlabel = 'person'
  ) THEN
    ALTER TYPE spydr_node_type RENAME TO spydr_node_type_old;

    CREATE TYPE spydr_node_type AS ENUM (
      'project',
      'project_area',
      'task',
      'idea',
      'note',
      'decision',
      'resource',
      'inbox_item'
    );

    ALTER TABLE spydr_nodes
      ALTER COLUMN node_type TYPE spydr_node_type
      USING node_type::text::spydr_node_type;

    ALTER TABLE spydr_inbox_items
      ALTER COLUMN suggested_type TYPE spydr_node_type
      USING suggested_type::text::spydr_node_type;

    ALTER TABLE spydr_outlook_snapshot_items
      ALTER COLUMN node_type TYPE spydr_node_type
      USING node_type::text::spydr_node_type;

    ALTER TABLE spydr_node_type_history
      ALTER COLUMN from_type TYPE spydr_node_type
      USING from_type::text::spydr_node_type,
      ALTER COLUMN to_type TYPE spydr_node_type
      USING to_type::text::spydr_node_type;

    DROP TYPE spydr_node_type_old;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 12. In-transaction verification (raises → ROLLBACK)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  person_nodes_left INTEGER;
  nodes_without_person INTEGER;
  members_without_person INTEGER;
BEGIN
  SELECT COUNT(*) INTO person_nodes_left
  FROM spydr_nodes
  WHERE node_type::text = 'person';

  SELECT COUNT(*) INTO nodes_without_person
  FROM spydr_nodes
  WHERE person_id IS NULL;

  SELECT COUNT(*) INTO members_without_person
  FROM organization_members
  WHERE person_id IS NULL;

  IF person_nodes_left <> 0 THEN
    RAISE EXCEPTION '% person nodes still exist', person_nodes_left;
  END IF;
  IF nodes_without_person <> 0 THEN
    RAISE EXCEPTION '% nodes missing person_id', nodes_without_person;
  END IF;
  IF members_without_person <> 0 THEN
    RAISE EXCEPTION '% org members missing person_id', members_without_person;
  END IF;
END $$;

-- Sanity counts (inspect before COMMIT)
SELECT
  (SELECT COUNT(*) FROM spydr_person_details) AS people,
  (SELECT COUNT(*) FROM spydr_person_details WHERE clerk_user_id IS NOT NULL) AS clerk_people,
  (SELECT COUNT(*) FROM organization_members) AS members,
  (SELECT COUNT(*) FROM spydr_nodes) AS nodes,
  (SELECT COUNT(*) FROM spydr_person_node_links) AS person_node_links,
  (SELECT COUNT(*) FROM spydr_person_person_links) AS person_person_links,
  (SELECT COUNT(*) FROM spydr_outlook_snapshot_items WHERE person_id IS NOT NULL) AS outlook_person_items,
  (SELECT COUNT(*) FROM spydr_person_type_history_archive) AS archived_type_history;

-- Inspect and then COMMIT or ROLLBACK
-- COMMIT;
-- ROLLBACK;
