-- Enforce at most one in-flight Active Note session per org+user.
-- Completed/failed sessions remain for history.
-- Already applied on production DBs that hit P2002 on beginAnalysis create.

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_note_sessions_inflight
  ON spydr_active_note_sessions (organization_id, user_id)
  WHERE status = ANY (
    ARRAY[
      'draft'::spydr_active_note_session_status,
      'analyzing'::spydr_active_note_session_status,
      'review'::spydr_active_note_session_status,
      'applying'::spydr_active_note_session_status
    ]
  );
