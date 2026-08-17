CREATE TABLE IF NOT EXISTS spydr_active_note_session_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES spydr_active_note_sessions(id) ON DELETE CASCADE,
  step spydr_active_note_step_name NOT NULL,
  status spydr_active_note_step_status NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  UNIQUE (session_id, step)
);

CREATE INDEX IF NOT EXISTS idx_active_note_session_steps_session
  ON spydr_active_note_session_steps (session_id, step);
