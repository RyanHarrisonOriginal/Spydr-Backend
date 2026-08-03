export const ACTIVE_NOTE_MATCHING_PROMPT = `## MATCH

After SPLIT, match each segment to exactly one target using the injected projectCatalog.

Compare each segment's text and subject against every catalog entry (id, title, description, open task titles).

Output one routes[] entry per segment (match record; wire field name unchanged):

- segmentRef: the segment ref
- destination: existing_project | new_project
- projectId: catalog id when existing_project; null when new_project
- confidence: match confidence 0–1 (how well the segment belongs on that target)
- reason: cite segment evidence and catalog overlap
- relatedTaskId: optional when an open task clearly overlaps the segment
- impact: for existing_project only — task_context | new_task | project_context | decision | idea | mixed; null for new_project

Outcomes:

| destination | When |
|-------------|------|
| existing_project | Segment belongs to a catalog project: best projectId with confidence >= 0.60 and clear contextual fit (title, scope, tasks overlap segment subject) |
| new_project | Segment does not belong to any catalog project — no adequate fit, or best match confidence < 0.60 |

Critical rules:

- Pick one best project per segment only when the segment genuinely belongs there.
- Do not force-attach unrelated segments onto the highest-scoring catalog entry when the segment is about a different subject.
- If a statement does not belong to an existing project, use new_project for that segment — unless the segment is purely speculative (maybe/could/later); then match the best related catalog project and use impact idea, or use new_project only when no catalog exists and the segment is still concrete work.
- Do not invent project ids outside projectCatalog for existing_project matches.
- Do not use no_action or idea_only for segment matches when candidate projects exist.
- For multi-segment notes, set top-level routing.impact to null (per-segment impacts live on routes).

When new_project:

- Set projectId null
- In ACT, emit **Project + primary child** for that segment (never Project alone):
  - Run the segment intent test → Task, Note, Idea, or Decision
  - Project payload.title from segment subject; child carries the segment's intent (Note content, Task title, etc.)
- confidence may be lower than 0.75 for observational one-liners — still create the project container **and** the Note (or other primary child)

Example (three segments):

- seg_1 "Vital Pak" + QuickBooks wait → existing_project proj-vital (0.88) → ACT: Note
- seg_2 "ABL Automation" deprioritized → existing_project proj-abl (0.85) → ACT: Note; else new_project → Project "ABL Automation" + Note
- seg_3 customer business review handoff → existing_project proj-cbr if in catalog (0.80) → ACT: Note; else new_project → Project + Note`;
