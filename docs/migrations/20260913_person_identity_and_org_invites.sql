-- Person identity + org membership + org invites
-- Run manually against PostgreSQL. Do not use Prisma migrate for this change.
-- After applying, regenerate the Prisma client only:
--   npm run prisma:generate
--
-- Model:
--   * One Person (spydr_person_details) per Clerk user (clerk_user_id UNIQUE)
--   * organization_members is the many-to-many between people and orgs
--   * CRM contacts (no clerk_user_id) remain org-scoped person nodes
--
-- Apply this file first, then optionally:
--   docs/migrations/20260913_person_identity_backfill.sql

-- ---------------------------------------------------------------------------
-- 1. Person identity: Clerk user id on person details
-- ---------------------------------------------------------------------------

ALTER TABLE spydr_person_details
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS spydr_person_details_clerk_user_id_key
  ON spydr_person_details (clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spydr_person_details_email_lower
  ON spydr_person_details (lower(email))
  WHERE email IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Org members: link to the unique person node
-- ---------------------------------------------------------------------------

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS person_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_members_person_id_fkey'
  ) THEN
    ALTER TABLE organization_members
      ADD CONSTRAINT organization_members_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES spydr_nodes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organization_members_person
  ON organization_members (person_id);

-- Multiple NULL person_id values are allowed in PostgreSQL unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_person_key
  ON organization_members (organization_id, person_id)
  WHERE person_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Org invites
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_invite_status') THEN
    CREATE TYPE organization_invite_status AS ENUM (
      'pending',
      'accepted',
      'revoked',
      'expired'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS organization_invites (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  role                 organization_member_role NOT NULL DEFAULT 'member',
  invited_by_user_id   TEXT NOT NULL,
  token                TEXT NOT NULL,
  status               organization_invite_status NOT NULL DEFAULT 'pending',
  expires_at           TIMESTAMPTZ NOT NULL,
  accepted_at          TIMESTAMPTZ,
  accepted_by_user_id  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organization_invites_token_key UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_organization_invites_org_status
  ON organization_invites (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_organization_invites_email_status
  ON organization_invites (lower(email), status);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_pending_org_email_key
  ON organization_invites (organization_id, lower(email))
  WHERE status = 'pending';
