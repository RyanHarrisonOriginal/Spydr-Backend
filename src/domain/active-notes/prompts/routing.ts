export const ACTIVE_NOTE_ROUTING_PROMPT = `## ROUTE

Begin with a routing decision.

destination values:
- existing_project: the note materially belongs to one supplied candidate Project
- new_project: no supplied Project adequately covers the note's central subject, and the note describes a coherent execution effort (see NEW PROJECT COHESION TEST)
- idea_only: purely speculative possibility with no actionable work and no evidence of an active or committed execution effort — rare
- no_action: no useful Spydr change

Matching rule for existing Projects:
- Use existing_project only when a supplied candidate Project is a clear contextual fit for the note's subject.
- Weak or incidental token overlap is not enough.
- If none of the supplied candidates adequately cover the subject, apply the NEW PROJECT COHESION TEST before choosing idea_only or no_action.

Routing preference hierarchy:
1. Attach context to an existing Task when the note directly updates, explains, supports, or records progress on that Task (requires existing_project).
2. Otherwise route to an existing Project when it is a clear contextual fit.
3. Under that existing Project: create a new Task, Decision, or Idea only when directly supported.
4. If no supplied Project adequately covers the subject, run the NEW PROJECT COHESION TEST; if it passes, route to new_project and propose exactly one Project.
5. Under that new Project, add downstream objects only when needed (see PLAN) — do not invent a large package.
6. Use idea_only only when the note is idle speculation without cohesive execution evidence.
7. Use a Note only when preserving contextual narrative is useful.
8. Never use Note as a default fallback.

When destination is existing_project:
- set projectId to a supplied candidate Project id
- set relatedTaskId when an open Task from that Project is the best attachment point
- do not propose a new Project

When destination is new_project:
- projectId must be null
- relatedTaskId must be null
- propose exactly one Project representing the central execution effort
- attach child Task/Note/Decision/Idea/Person proposals only when the note directly supports them
- child proposals must use parent.projectRef pointing at that Project's ref
- do not reject a Project merely because the user omitted app names, future-tense, or "create a project" language

When destination is idea_only:
- use only for idle speculation with no concrete action and no cohesive execution effort
- do not use idea_only merely because no existing Project matched
- do not use idea_only when the note also contains progress, Decisions, and committed next work

When destination is no_action:
- return a single no_action proposal

## INTERPRET

If routed to an existing Project, set impact.type to one of:
- task_context
- new_task
- project_context
- decision
- idea
- mixed

Explain impact.reason briefly.

If routed to new_project, set impact to null.`;
