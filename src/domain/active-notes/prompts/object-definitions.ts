export const ACTIVE_NOTE_OBJECT_DEFINITIONS_PROMPT = `## Supported objects

## Every segment must produce work (read this before ACT)

Each segment from SPLIT must become exactly **one primary object**: Task, Note, Idea, or Decision.
Run the **segment intent test** in this order — first clear match wins:

1. **Decision** — committed choice ("I decided", "we'll use", "going with", chose X over Y)
2. **Task** — action to perform (imperative, to-do, outreach, follow-up, "I need to", "next:")
3. **Idea** — speculative / uncommitted (maybe, could, might, what if, someday, later)
4. **Note** — fact, status, observation, handoff, or anything concrete that is not 1–3

If nothing clearly fits Task, Idea, or Decision, **default to Note** — never leave a segment empty.

**new_project:** always emit **Project + primary child** (never Project alone).
**existing_project:** emit the primary child only, parent.projectId = matched catalog id.

## TASK versus NOTE versus IDEA versus DECISION

Every segment needs a primary object. Projects and Tasks must be concrete — not every segment deserves a new Project or Task.

Choose TASK when the segment clearly specifies work that needs to be done:
- Imperative or directed actions: check in, reach out, follow up, call, email, schedule, send, review, complete, fix, update, confirm, get, ask
- Explicit to-dos: "I need to…", "Next:", "TODO:", "remind me to…"
- The author's intent is to capture something to execute, not to log what already happened

Choose NOTE when the segment is a status update, observation, or statement of fact:
- Current state or progress: waiting, paused, deprioritized, on hold, delayed, "taken a back seat"
- Announcements and handoffs as facts: "X will take over Y from Z", role or ownership changes
- Past or present narrative without a new action for the author to perform

Choose IDEA when the segment is speculative or uncommitted — a future possibility, not concrete work:
- Hedge words: maybe, could, might, what if, someday, later, explore, consider, would be nice if
- Hypothetical capabilities or enhancements with no commitment to build them now
- The author is brainstorming, not assigning work or recording what is true today

Do not propose a new Project or Task from speculative Idea language alone.
Do not propose both a Task and a Note for the same segment when one type clearly fits.
Do not default every segment to Note. Action items belong in Tasks. Brainstorming belongs in Ideas.

Examples:
- "check in with Todd Hanna re Lamb & associates parent customer approvals" → Task
- "reach out to Boxmaker re their detail budget" → Task
- "Kai Li will take over customer business review from Joe" → Note
- "ABL Automation has taken a back seat to other audits for Hilco and KPMG" → Note
- "Maybe later Spydr could automatically detect when several Active Notes are pointing toward the same new project and suggest creating it." → Idea (not Project, not Task)

PROJECT:
A concrete execution container for committed or actively developing work — not a bucket for hypotheticals.

Create a new Project only when the segment describes real, coordinated work: an initiative underway, a problem being actively solved, committed next steps, or a distinct subject that needs an execution home today.

Do NOT create a Project when the segment is only speculative ("maybe", "could", "later", "what if") with no execution commitment.

Prefer an existing Project when the segment materially fits one supplied in the catalog — including loosely related catalog projects for Ideas about that domain.
Do not propose a new Project when a supplied catalog Project is already a clear fit (match confidence >= 0.60).

## Naming: Project titles vs Note subjects (different jobs)

Project payload.title and Note payload.title follow different rules. Do not reuse the same string for both unless the segment is a single short phrase.

PROJECT payload.title — name of the workstream (project list label):
- Derive primarily from the segment subject or the named client/initiative in the segment text.
- Good: "Vital Pak", "ABL Automation", "Customer Business Review", "Boxmaker Detail Budget", "Active Note Routing", "Lamb & Associates Approvals"
- 2–6 words, max 40 characters, noun phrase naming the execution subject.
- Put scope, goals, and detail in payload.description — not in the title.
- Do not use note-style headline abstractions as project names (bad: "Audit Deprioritization", "CBR Handoff", "Routing Improvements").
- Do not use full sentences, "Improve how…", "Build a system to…", or the raw segment text.

NOTE payload.title — journal entry headline (scan label only):
- Label the EVENT or CHANGE this entry records — like a logbook subject line.
- Good: "Audit Deprioritization", "CBR Handoff", "QuickBooks Wait", "Routing Improvements"
- 2–6 words, max 50 characters; must differ from payload.content.
- Do not copy the opening words of the note into the subject.
- Do not truncate the body to make a subject — synthesize a headline for what happened.
- Do not use the project list name as the note subject when a more specific event label fits.

How to write a journal-style subject:
1. Read the full segment and identify what is NEW (handoff, deprioritization, delay, approval, blocker, progress).
2. Compress that into a noun phrase or event label — not the first words of the sentence.
3. Prefer event labels over entity names when the project is already known.

| What happened | Good subject | Bad subject (truncated body) |
| handoff / takeover | CBR Handoff | Kai Li will take over customer |
| deprioritized / back seat | Audit Deprioritization | ABL Automation has taken a |
| waiting on vendor | QuickBooks Wait | Vital Pak is waiting on QuickBooks |
| improvement area | Routing Improvements | Need to improve how Active Notes |

When proposing new_project, set Project payload.title from the segment subject or named entity (see Naming above). Always include payload.description with scope and detail from the segment.

**Always pair the Project with a primary child** from the segment intent test:
- status/fact segment → Project + Note (segment text in Note payload.content)
- action segment → Project + Task
- speculative segment → Idea on catalog project when possible; Project + Idea only when no catalog fits
- decision segment → Project + Decision

Inferred Projects are valid when the segment describes concrete unmatched work — not idle possibilities.

TASK:
A concrete unit of work that someone needs to perform to advance a Project.
Every Task must belong to a Project (parent.projectId or parent.projectRef).

Create a Task when the segment text is an action item, follow-up, outreach, check-in, or other clear to-do — even if phrased casually without "create a task".

Task payload.title should be an actionable phrase derived from the segment (e.g. "Check in with Todd Hanna re Lamb & associates parent customer approvals").

Explicit action → operationType create.
Implied but clear action → suggest_create.

Do not create a Task from pure status updates or statements of fact — those are Notes.

NOTE:
Context attached to an execution effort — status, observations, handoffs, and facts.
Every Note must belong to a Project.

Apply Note subject rules from Naming above (journal entry headline — NOT a truncated body prefix):

1. Name the event or change — handoff, deprioritization, wait, approval, blocker, progress.
2. 2–6 words when possible; maximum 50 characters.
3. Prefer noun phrases and event labels (CBR Handoff, Audit Deprioritization).
4. Never copy the opening words of payload.content into payload.title.
5. Never truncate the note body to form the subject.
6. Avoid complete sentences and punctuation unless necessary.
7. The subject must be shorter than the content and must NOT repeat the content verbatim.

Good subjects: "Lead Teep Progress", "Routing Improvements", "Validation Flow", "Coach Feedback", "Prompt Refinement", "Sparring Observations", "Task Attachment", "Project Attribution", "CBR Handoff", "Audit Deprioritization"

Bad subjects:
- "Improved routing so notes attach to the correct project instead of becoming generic notes"
- "Last night's sparring showed that the lead teep worked better behind the jab but taller opponents still caught naked teeps"
- "Need to improve how Active Notes assign statements to existing projects"
- "ABL Automation has taken a back" (truncated body — use "Audit Deprioritization")
- "Kai Li will take over customer" (truncated body — use "CBR Handoff")
- title and content identical
- "Note" / "Untitled" / empty

Subject + body examples:
- subject: "CBR Handoff" | content: "Kai Li will take over customer business review from Joe"
- subject: "Audit Deprioritization" | content: "ABL Automation has taken a back seat to other audits for Hilco and KPMG"

Create a Note when the segment records what is true, what happened, or current project/task context — and no new to-do is stated.

Prefer attachment.type=task when the note updates a specific open Task; otherwise attachment.type=project.

DECISION:
A committed choice that changes or constrains execution within a Project.
Do not create from speculation, alternatives, or unresolved thinking.

IDEA:
An uncommitted possibility — not a Project and not a Task.

Use Idea when the segment is speculative: "maybe", "could", "what if", "someday", "later", "explore", "consider".
Projects and Tasks are for concrete execution; Ideas are for possibilities the user has not committed to.

Idea payload.title: short label for the possibility (not a Project name).

When catalog projects exist, nest the Idea under the best-matching related Project (parent.projectId) — e.g. an Active Note / Spydr enhancement idea belongs on an Active Note–related project if one exists.
Do not create a new Project to hold a lone speculative Idea.
Do not create a Task from speculative language.

When no catalog projects exist, a standalone Idea is acceptable.

Example:
- "Maybe later Spydr could automatically detect when several Active Notes are pointing toward the same new project and suggest creating it."
  → Idea titled e.g. "Auto-detect converging Active Notes for project suggestion" on the best related catalog project — NOT a new Project, NOT a Task

PERSON:
A specifically identified individual. Does not require a Project.
Do not create from vague references such as "a big guy", "someone", "the customer", or "my manager".`;
