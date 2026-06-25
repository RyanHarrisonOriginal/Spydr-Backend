-- Project persona columns on spydr_project_details
-- Person node type (spydr_node_type = 'person') and spydr_person_details already exist — do not recreate.

ALTER TABLE spydr_project_details
  ADD COLUMN IF NOT EXISTS requester_person_node_id UUID,
  ADD COLUMN IF NOT EXISTS assignee_person_node_id UUID,
  ADD COLUMN IF NOT EXISTS sponsor_person_node_id UUID,
  ADD COLUMN IF NOT EXISTS reviewer_person_node_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_project_details_requester_person_node_id_fkey'
  ) THEN
    ALTER TABLE spydr_project_details
      ADD CONSTRAINT spydr_project_details_requester_person_node_id_fkey
      FOREIGN KEY (requester_person_node_id) REFERENCES spydr_nodes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_project_details_assignee_person_node_id_fkey'
  ) THEN
    ALTER TABLE spydr_project_details
      ADD CONSTRAINT spydr_project_details_assignee_person_node_id_fkey
      FOREIGN KEY (assignee_person_node_id) REFERENCES spydr_nodes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_project_details_sponsor_person_node_id_fkey'
  ) THEN
    ALTER TABLE spydr_project_details
      ADD CONSTRAINT spydr_project_details_sponsor_person_node_id_fkey
      FOREIGN KEY (sponsor_person_node_id) REFERENCES spydr_nodes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spydr_project_details_reviewer_person_node_id_fkey'
  ) THEN
    ALTER TABLE spydr_project_details
      ADD CONSTRAINT spydr_project_details_reviewer_person_node_id_fkey
      FOREIGN KEY (reviewer_person_node_id) REFERENCES spydr_nodes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spydr_project_details_requester
  ON spydr_project_details (requester_person_node_id)
  WHERE requester_person_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spydr_project_details_assignee
  ON spydr_project_details (assignee_person_node_id)
  WHERE assignee_person_node_id IS NOT NULL;
