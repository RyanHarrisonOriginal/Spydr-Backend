export const ACTIVE_NOTE_PLANNING_PROMPT = `## ACT

After MATCH, emit concrete proposals per segment/match.

Each proposal needs:
- ref: unique string in this response (e.g. project_1, task_1, note_1)
- operationType: create | suggest_create | attach_context | no_action
- objectType
- segmentRef: owning segment ref (required for multi-segment notes)
- parent: for Task/Note/Decision/Idea — projectId (existing) or projectRef (new Project proposal ref)
- attachment: for Notes — type project|task plus id (existing) or ref (proposed)
- payload fields only when supported — every Task, Note, Idea, Decision, and Project requires a non-empty payload.title
- explicitlyStated, confidence, evidence (quotes from the segment text), reason

## Segment intent test (REQUIRED for every segment)

Do something with every segment. Never leave a segment with zero primary proposals.

For each segment, test the text against these object types **in order**. The first clear match is the primary object:

| Order | Test | Primary object | Signals |
|-------|------|----------------|---------|
| 1 | Committed choice? | **Decision** | "I decided", "we'll use", "going with", "committed to", chose X over Y |
| 2 | Action to perform? | **Task** | check in, reach out, follow up, call, email, schedule, TODO, "I need to", "next:" |
| 3 | Speculative / uncommitted? | **Idea** | maybe, could, might, what if, someday, later, explore, consider |
| 4 | Fact, status, or observation? | **Note** | waiting, deprioritized, on hold, handoff, "X will take over", past/present state |
| 5 | None of the above clearly fit? | **Note** | default — preserve the segment as a journal entry under the project |

Emit **exactly one** primary object per segment: Task, Note, Idea, or Decision — not multiple primaries, not zero.

Do not default every segment to Note when Task, Decision, or Idea clearly fits.
Do not add a redundant Note alongside a Task when the Task alone captures the segment.

## new_project packages (Project + child — mandatory)

When routes[].destination is **new_project** for a segment, emit **two** proposals for that segment:

1. **Project** — container (payload.title from segment subject / named entity; payload.description = scope/context)
2. **Primary child** — the result of the segment intent test above, with parent.projectRef and attachment.ref pointing at the Project ref

**NEVER emit a Project alone for new_project.** A project without a child loses the segment's intent.
Do not put the only copy of the segment text in project.description — the child must carry it (Note payload.content, Task payload.title, etc.).

| Segment intent | new_project proposals |
|----------------|----------------------|
| Status / fact | Project + **Note** (journal subject + full segment as content) |
| Action / to-do | Project + **Task** |
| Speculative | Prefer Idea on related catalog project; new_project + **Idea** only when no catalog fits and segment is still concrete |
| Committed choice | Project + **Decision** (+ optional Note for context if needed — Decision is still the primary) |

## existing_project (primary object only)

When routes[].destination is **existing_project**, emit the primary object from the intent test only:
- parent.projectId = matched catalog id
- No new Project proposal

## Naming (Project title ≠ Note subject)

Project payload.title = workstream name (client, initiative, audit name).
Note payload.title = journal entry headline — name the EVENT or CHANGE, not the opening words of the note.

Examples:
| Segment | Project title | Note subject | Note content |
|---------|---------------|--------------|--------------|
| ABL deprioritized… | "ABL Automation" | "Audit Deprioritization" | full segment |
| Kai Li handoff… | "Customer Business Review" | "CBR Handoff" | full segment |
| Vital Pak QuickBooks wait | "Vital Pak" | "QuickBooks Wait" | full segment |

Worked examples:

- seg "check in with Todd Hanna re Lamb & associates parent customer approvals"
  → existing_project: Task only
  → new_project: Project "Lamb & Associates Approvals" + Task

- seg "reach out to Boxmaker re their detail budget"
  → existing_project: Task only
  → new_project: Project "Boxmaker Detail Budget" + Task

- seg "Kai Li will take over customer business review from Joe"
  → existing_project: Note "CBR Handoff" + full content
  → new_project: Project "Customer Business Review" + Note "CBR Handoff"

- seg "ABL Automation has taken a back seat to other audits for Hilco and KPMG"
  → existing_project: Note "Audit Deprioritization" + full content
  → new_project: Project "ABL Automation" + Note "Audit Deprioritization"

- seg "I decided to keep this as one model call with modular prompt sections"
  → existing_project: Decision (+ optional Note only if extra context not in decision rationale)
  → new_project: Project + Decision

- seg "Maybe later Spydr could automatically detect…"
  → Idea on best related catalog project — NOT a new Project unless no catalog exists

Every proposal must cite evidence from the user's exact segment text.
Return only structured output matching the required schema.`;
