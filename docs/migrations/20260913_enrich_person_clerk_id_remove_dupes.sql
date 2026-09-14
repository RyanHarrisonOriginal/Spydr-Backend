-- Enrich person details with Clerk user ids and remove duplicate person nodes.
-- Run after 20260913_person_identity_and_org_invites.sql
-- Run manually in Postgres. Review PART A before PART B.
--
-- Canonical person per Clerk user:
--   non-deleted, already has clerk_user_id, else oldest person node created by that user.
-- Duplicate person nodes created by the same Clerk user are remapped then deleted.

-- =============================================================================
-- PART A — preview (safe / read-only)
-- =============================================================================

-- Duplicate person nodes per Clerk member
SELECT
  x.user_id,
  COUNT(*) AS person_node_count,
  ARRAY_AGG(x.person_id::text ORDER BY x.created_at, x.person_id) AS person_ids,
  ARRAY_AGG(x.org_id::text ORDER BY x.created_at, x.person_id) AS org_ids,
  ARRAY_AGG(x.full_name ORDER BY x.created_at, x.person_id) AS names,
  ARRAY_AGG(COALESCE(x.email, '') ORDER BY x.created_at, x.person_id) AS emails
FROM (
  SELECT DISTINCT
    om.user_id,
    n.id AS person_id,
    n.org_id,
    n.created_at,
    d.full_name,
    d.email
  FROM organization_members om
  JOIN spydr_nodes n
    ON n.node_type = 'person'
   AND n.user_id = om.user_id
  JOIN spydr_person_details d ON d.node_id = n.id
) x
GROUP BY x.user_id
HAVING COUNT(*) > 1
ORDER BY person_node_count DESC;

-- =============================================================================
-- PART B — mutate (wraps in a transaction)
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _member_people ON COMMIT DROP AS
SELECT DISTINCT
  om.user_id,
  n.id AS person_id,
  n.created_at,
  n.is_deleted,
  d.clerk_user_id,
  d.email,
  d.full_name
FROM organization_members om
JOIN spydr_nodes n
  ON n.node_type = 'person'
 AND n.user_id = om.user_id
JOIN spydr_person_details d ON d.node_id = n.id;

CREATE TEMP TABLE _canonical ON COMMIT DROP AS
SELECT user_id, person_id
FROM (
  SELECT
    user_id,
    person_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN is_deleted THEN 1 ELSE 0 END,
        CASE WHEN clerk_user_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at ASC,
        person_id ASC
    ) AS rn
  FROM _member_people
) ranked
WHERE rn = 1;

CREATE TEMP TABLE _dupes ON COMMIT DROP AS
SELECT
  mp.user_id,
  mp.person_id AS dupe_id,
  c.person_id AS canonical_id
FROM _member_people mp
JOIN _canonical c ON c.user_id = mp.user_id
WHERE mp.person_id <> c.person_id;

-- Fill missing email / name on the keeper from a duplicate
UPDATE spydr_person_details keeper
SET
  email = COALESCE(keeper.email, src.email),
  full_name = CASE
    WHEN keeper.full_name IS NULL OR btrim(keeper.full_name) = '' THEN src.full_name
    ELSE keeper.full_name
  END,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (d.canonical_id)
    d.canonical_id,
    det.email,
    det.full_name
  FROM _dupes d
  JOIN spydr_person_details det ON det.node_id = d.dupe_id
  ORDER BY d.canonical_id, det.email NULLS LAST, det.updated_at DESC
) src
WHERE keeper.node_id = src.canonical_id;

-- Stamp Clerk id on the canonical person
UPDATE spydr_person_details d
SET clerk_user_id = c.user_id,
    updated_at = now()
FROM _canonical c
WHERE d.node_id = c.person_id
  AND d.clerk_user_id IS DISTINCT FROM c.user_id;

-- Point every membership at the canonical person
UPDATE organization_members om
SET person_id = c.person_id
FROM _canonical c
WHERE om.user_id = c.user_id
  AND om.person_id IS DISTINCT FROM c.person_id;

-- Project personas
UPDATE spydr_project_details p
SET requester_person_node_id = d.canonical_id, updated_at = now()
FROM _dupes d
WHERE p.requester_person_node_id = d.dupe_id;

UPDATE spydr_project_details p
SET assignee_person_node_id = d.canonical_id, updated_at = now()
FROM _dupes d
WHERE p.assignee_person_node_id = d.dupe_id;

UPDATE spydr_project_details p
SET sponsor_person_node_id = d.canonical_id, updated_at = now()
FROM _dupes d
WHERE p.sponsor_person_node_id = d.dupe_id;

UPDATE spydr_project_details p
SET reviewer_person_node_id = d.canonical_id, updated_at = now()
FROM _dupes d
WHERE p.reviewer_person_node_id = d.dupe_id;

-- Task assignees
UPDATE spydr_task_details t
SET assignee_person_node_id = d.canonical_id, updated_at = now()
FROM _dupes d
WHERE t.assignee_person_node_id = d.dupe_id;

-- Person list sort rows: drop collisions, then remap
DELETE FROM spydr_person_collection_sort s
USING _dupes d
WHERE s.person_node_id = d.dupe_id
  AND EXISTS (
    SELECT 1
    FROM spydr_person_collection_sort s2
    WHERE s2.org_id = s.org_id
      AND s2.person_node_id = d.canonical_id
      AND s2.node_id = s.node_id
  );

UPDATE spydr_person_collection_sort s
SET person_node_id = d.canonical_id,
    updated_at = now()
FROM _dupes d
WHERE s.person_node_id = d.dupe_id;

-- Outlook snapshot items
UPDATE spydr_outlook_snapshot_items i
SET node_id = d.canonical_id
FROM _dupes d
WHERE i.node_id = d.dupe_id;

-- Relationships: drop rows that would violate unique after remap
DELETE FROM spydr_node_relationships r
USING _dupes d
WHERE (r.source_node_id = d.dupe_id OR r.target_node_id = d.dupe_id)
  AND EXISTS (
    SELECT 1
    FROM spydr_node_relationships r2
    WHERE r2.id <> r.id
      AND r2.relationship_type = r.relationship_type
      AND r2.source_node_id = CASE
        WHEN r.source_node_id = d.dupe_id THEN d.canonical_id
        ELSE r.source_node_id
      END
      AND r2.target_node_id = CASE
        WHEN r.target_node_id = d.dupe_id THEN d.canonical_id
        ELSE r.target_node_id
      END
  );

UPDATE spydr_node_relationships r
SET source_node_id = d.canonical_id
FROM _dupes d
WHERE r.source_node_id = d.dupe_id;

UPDATE spydr_node_relationships r
SET target_node_id = d.canonical_id
FROM _dupes d
WHERE r.target_node_id = d.dupe_id;

DELETE FROM spydr_node_relationships
WHERE source_node_id = target_node_id;

-- Remove duplicate person nodes (details cascade)
DELETE FROM spydr_nodes n
USING _dupes d
WHERE n.id = d.dupe_id;

-- Remaining members without a person_id
SELECT om.id, om.organization_id, om.user_id, om.role
FROM organization_members om
WHERE om.person_id IS NULL
ORDER BY om.created_at;

-- Canonical people
SELECT d.node_id, d.full_name, d.email, d.clerk_user_id, n.org_id
FROM spydr_person_details d
JOIN spydr_nodes n ON n.id = d.node_id
WHERE d.clerk_user_id IS NOT NULL
ORDER BY d.full_name;

COMMIT;
