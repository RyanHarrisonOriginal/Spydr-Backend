export const ACTIVE_NOTE_OBJECT_DEFINITIONS_PROMPT = `## Supported objects

PROJECT:
A Project is a coherent execution effort organized around a meaningful outcome.

A Project may be explicitly stated or inferred.

The user does not need to say "create a project," "this is a project," or "I want to build."

A new Project should be strongly considered when the Active Note contains several related execution signals concerning the same central subject, such as:

- completed or ongoing progress,
- a current problem, limitation, or gap,
- a desired outcome or improved future state,
- a committed technical, strategic, or operational Decision,
- one or more concrete next actions,
- multiple related work items,
- and future improvements or extensions.

A Project may already be underway.

Completed work does not disqualify an effort from becoming a Project when meaningful coordinated work remains.

A Project should provide a useful execution container for multiple Tasks, Decisions, Ideas, and contextual Notes.

Prefer an existing Project when the Active Note materially fits one supplied in context.
Do not propose a new Project when a supplied candidate Project is already a clear fit.
Do not create a redundant child Project merely because a note contains several sentences.

Project titles should describe the execution effort or desired outcome.

Good titles:
- Improve Active Note Routing
- Active Note Intelligence
- Rebuild Inventory Reporting
- Eight-Week Lead Teep Development

Avoid:
- Spydr
- Active Notes
- Project Work
- Miscellaneous Improvements
- Notes About Routing

The title may include the broader application name only when it helps distinguish the initiative.

Inferred Projects are valid: the domain/app label may be omitted from the note. Confidence may be slightly lower when the subject is inferred, but still propose the Project when the cohesion test passes.

TASK:
A concrete unit of work that advances a Project.
Every Task must belong to a Project (parent.projectId or parent.projectRef).
Explicit action/commitment/request/reminder/next step → create.
Implied action → suggest_create.
Under a new Project, propose a Task only when the note states or strongly implies a concrete action.

NOTE:
Context attached to an execution effort.
Usually updates a Project, explains/supports a Task, preserves progress, or retains project-level narrative.
Every Note must belong to a Project.
Never use Note as a default fallback when no better routing decision was made.
Prefer attachment.type=task when the note updates or supports an existing Task; otherwise attachment.type=project.
Under a new Project, add a Note only when narrative context is worth preserving beyond the Project/Task titles.

DECISION:
A committed choice that changes or constrains execution within a Project.
Do not create from speculation, alternatives, or unresolved thinking.

IDEA:
An uncommitted possibility that may influence an existing Project or seed a future Project.
Idea = possible direction. Project = committed or actively developing execution container.
When the note shows active implementation plus committed next work, prefer new_project (or existing_project) and nest Ideas inside that Project — do not route the whole note to idea_only.
Every Idea must belong to a Project when possible; if idea_only and no Project fits, omit parent and note that Project selection is required in reason.

PERSON:
A specifically identified individual. Does not require a Project.
Do not create from vague references such as "a big guy", "someone", "the customer", "my manager", or "the opponent".`;
