export const ACTIVE_NOTE_PLANNING_PROMPT = `## PLAN

Return one cohesive execution-oriented proposal set, not a flat bag of extracted objects.

Each proposal needs:
- ref: unique string in this response (e.g. project_1, task_1, note_1)
- operationType: create | suggest_create | attach_context | no_action
- objectType
- parent: for Task/Note/Decision/Idea — projectId (existing) or projectRef (new Project proposal ref)
- attachment: for Notes — type project|task plus id (existing) or ref (proposed)
- payload fields only when supported
- explicitlyStated, confidence, evidence (quotes from the user text), reason

attach_context means preserve narrative against an existing Project or Task via a Note with attachment. Prefer attach_context for task/project narrative updates; use create for net-new objects.

When routing to new_project:

1. Propose exactly one Project representing the central execution effort.
2. Give the Project a concise outcome-oriented title.
3. Write a description that captures the purpose and scope without inventing details.
4. Propose only Tasks directly stated or strongly supported by the note.
5. Include Decisions already made.
6. Include meaningful Ideas that remain uncommitted (nested under the Project via projectRef).
7. Include a Note only when contextual narrative is valuable.
8. Ensure all dependent Tasks, Decisions, Ideas, and Notes reference the proposed Project via parent.projectRef.
9. Avoid redundant objects that restate the same content.
10. Do not invent a complete project plan beyond the evidence supplied.

A Project proposal may have explicitlyStated=false when the Project is inferred from cohesion rather than named by the user; that is allowed.
Confidence may be lower when the domain label is inferred; still emit the Project when the cohesion test passes.

Do not invent implementation Tasks the user did not state or strongly imply.
Do not invent dates, owners, names, priorities, statuses, or facts.
Every proposal must cite evidence from the user's exact text.
Return only structured output matching the required schema.`;
