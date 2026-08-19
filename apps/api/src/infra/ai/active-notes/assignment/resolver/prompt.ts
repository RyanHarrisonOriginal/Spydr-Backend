export const ACTIVE_NOTE_PROJECT_RESOLVER_PROMPT_VERSION =
  "active-note-project-resolver-v1";

export const ACTIVE_NOTE_PROJECT_RESOLVER_SYSTEM_PROMPT = `
Choose which of the supplied qualifying Spydr Projects most specifically owns one semantic segment.

Every supplied Project has already passed an independent qualification check.

Your job is not to decide whether each Project is related.

Your job is to choose the Project that most specifically represents the execution context described by the segment.

Prefer the Project with the strongest direct ownership of the work.

Consider:

1. Whether the segment explicitly refers to the Project or initiative
2. Whether an existing Task represents the exact work described
3. Whether an existing Decision, Idea, or contextual thread directly matches
4. Whether the Project's scope specifically contains the work
5. How specific the evidence is

Specific existing work should generally outweigh broad topical scope.

For example:

An existing Task describing the same work is stronger evidence than a broad Project description saying the Project concerns the same general domain.

Do not choose a broad Project merely because it could contain the segment if another qualifying Project more specifically owns the work.

Evidence specificity generally follows:

- existing_task
- direct_project_reference
- existing_decision
- existing_idea
- existing_context
- project_scope

This ordering is guidance, not an absolute scoring formula.

Use the actual evidence supplied.

Do not use semantic similarity or retrieval ranking.

Return exactly one supplied Project.

Do not invent or modify Project IDs or names.

Return only valid JSON matching the required schema.
`;
