-- Align user_id with Prisma schema and Clerk user ids (TEXT).
-- The table was created with user_id UUID, which breaks embedding upserts.
ALTER TABLE spydr_active_note_project_retrieval_context
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;
