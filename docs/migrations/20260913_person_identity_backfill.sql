-- Optional backfill after 20260913_person_identity_and_org_invites.sql
-- Run manually. Review the inspection queries before the UPDATE statements.
-- Does NOT delete duplicate person nodes (they may have project/task links).

-- ---------------------------------------------------------------------------
-- Inspection: duplicate person nodes likely created per org for the same user
-- ---------------------------------------------------------------------------

-- Members whose Clerk user created more than one person node across their orgs
SELECT
  om.user_id,
  COUNT(DISTINCT n.id) AS person_node_count,
  ARRAY_AGG(DISTINCT n.id::text ORDER BY n.id::text) AS person_ids,
  ARRAY_AGG(DISTINCT n.org_id::text ORDER BY n.org_id::text) AS org_ids
FROM organization_members om
JOIN spydr_nodes n
  ON n.node_type = 'person'
 AND n.is_deleted = false
 AND n.user_id = om.user_id
 AND n.org_id IN (
   SELECT om2.organization_id
   FROM organization_members om2
   WHERE om2.user_id = om.user_id
 )
GROUP BY om.user_id
HAVING COUNT(DISTINCT n.id) > 1
ORDER BY person_node_count DESC;

-- ---------------------------------------------------------------------------
-- Backfill: pick one canonical person per Clerk user and link memberships
-- Preference: oldest person node created by that user in any org they belong to
-- ---------------------------------------------------------------------------

WITH candidates AS (
  SELECT DISTINCT ON (om.user_id)
    om.user_id,
    n.id AS person_id
  FROM organization_members om
  JOIN spydr_nodes n
    ON n.node_type = 'person'
   AND n.is_deleted = false
   AND n.user_id = om.user_id
   AND n.org_id IN (
     SELECT om2.organization_id
     FROM organization_members om2
     WHERE om2.user_id = om.user_id
   )
  JOIN spydr_person_details d ON d.node_id = n.id
  ORDER BY om.user_id, n.created_at ASC, n.id ASC
)
UPDATE spydr_person_details d
SET clerk_user_id = c.user_id,
    updated_at = now()
FROM candidates c
WHERE d.node_id = c.person_id
  AND d.clerk_user_id IS NULL;

UPDATE organization_members om
SET person_id = d.node_id
FROM spydr_person_details d
WHERE d.clerk_user_id = om.user_id
  AND om.person_id IS NULL;

-- ---------------------------------------------------------------------------
-- Post-check
-- ---------------------------------------------------------------------------

-- Members still missing a person_id (will be linked on next org create / invite accept)
SELECT om.id, om.organization_id, om.user_id, om.role
FROM organization_members om
WHERE om.person_id IS NULL
ORDER BY om.created_at;

-- People with a Clerk id (canonical app users)
SELECT d.node_id, d.full_name, d.email, d.clerk_user_id
FROM spydr_person_details d
WHERE d.clerk_user_id IS NOT NULL
ORDER BY d.full_name;
