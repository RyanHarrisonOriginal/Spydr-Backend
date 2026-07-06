-- Organizations: multi-tenant workspaces for Spydr data
-- Run manually against PostgreSQL. Do not use Prisma migrate for this change.

-- ---------------------------------------------------------------------------
-- 1. Enum + core tables
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_member_role') THEN
    CREATE TYPE organization_member_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  role            organization_member_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_org_user_key UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON organization_members (user_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org
  ON organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- 2. Add org_id columns (nullable until backfill)
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_nodes
  ADD COLUMN IF NOT EXISTS org_id UUID;

ALTER TABLE spydr_node_relationships
  ADD COLUMN IF NOT EXISTS org_id UUID;

ALTER TABLE spydr_outlook_snapshots
  ADD COLUMN IF NOT EXISTS org_id UUID;

ALTER TABLE spydr_outlook_templates
  ADD COLUMN IF NOT EXISTS org_id UUID;

-- ---------------------------------------------------------------------------
-- 3. Backfill: one default "Personal" org per existing user
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE IF NOT EXISTS _user_org_backfill ON COMMIT DROP AS
SELECT DISTINCT user_id
FROM (
  SELECT user_id FROM spydr_nodes
  UNION
  SELECT user_id FROM spydr_node_relationships
  UNION
  SELECT user_id FROM spydr_outlook_snapshots
  UNION
  SELECT user_id FROM spydr_outlook_templates
) AS all_users;

-- Assign each user a stable org id for the backfill pass
CREATE TEMP TABLE IF NOT EXISTS _user_org_map ON COMMIT DROP AS
SELECT
  user_id,
  gen_random_uuid() AS org_id,
  'personal-' || substr(md5(user_id), 1, 12) AS slug
FROM _user_org_backfill;

INSERT INTO organizations (id, name, slug)
SELECT org_id, 'Personal', slug
FROM _user_org_map
ON CONFLICT (slug) DO NOTHING;

-- If slug collision (unlikely), attach to existing org by slug
UPDATE _user_org_map m
SET org_id = o.id
FROM organizations o
WHERE o.slug = m.slug
  AND m.org_id <> o.id;

INSERT INTO organization_members (organization_id, user_id, role)
SELECT org_id, user_id, 'owner'::organization_member_role
FROM _user_org_map
ON CONFLICT (organization_id, user_id) DO NOTHING;

UPDATE spydr_nodes n
SET org_id = m.org_id
FROM _user_org_map m
WHERE n.user_id = m.user_id
  AND n.org_id IS NULL;

UPDATE spydr_node_relationships r
SET org_id = n.org_id
FROM spydr_nodes n
WHERE r.source_node_id = n.id
  AND r.org_id IS NULL
  AND n.org_id IS NOT NULL;

UPDATE spydr_outlook_snapshots s
SET org_id = m.org_id
FROM _user_org_map m
WHERE s.user_id = m.user_id
  AND s.org_id IS NULL;

UPDATE spydr_outlook_templates t
SET org_id = m.org_id
FROM _user_org_map m
WHERE t.user_id = m.user_id
  AND t.org_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Constraints, FKs, indexes
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_nodes
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE spydr_node_relationships
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE spydr_outlook_snapshots
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE spydr_outlook_templates
  ALTER COLUMN org_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_nodes_org_id_fkey'
  ) THEN
    ALTER TABLE spydr_nodes
      ADD CONSTRAINT spydr_nodes_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_node_relationships_org_id_fkey'
  ) THEN
    ALTER TABLE spydr_node_relationships
      ADD CONSTRAINT spydr_node_relationships_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_outlook_snapshots_org_id_fkey'
  ) THEN
    ALTER TABLE spydr_outlook_snapshots
      ADD CONSTRAINT spydr_outlook_snapshots_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_outlook_templates_org_id_fkey'
  ) THEN
    ALTER TABLE spydr_outlook_templates
      ADD CONSTRAINT spydr_outlook_templates_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_org_type
  ON spydr_nodes (org_id, node_type);

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_org_status
  ON spydr_nodes (org_id, status);

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_org_type_sort
  ON spydr_nodes (org_id, node_type, sort_order);

CREATE INDEX IF NOT EXISTS idx_spydr_nodes_org_deleted
  ON spydr_nodes (org_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_spydr_relationships_org
  ON spydr_node_relationships (org_id);

CREATE INDEX IF NOT EXISTS idx_spydr_outlook_snapshots_org_type_generated
  ON spydr_outlook_snapshots (org_id, outlook_type, generated_at);

CREATE INDEX IF NOT EXISTS idx_spydr_outlook_templates_org_type
  ON spydr_outlook_templates (org_id, outlook_type);
