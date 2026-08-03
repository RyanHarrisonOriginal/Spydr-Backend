export const ACTIVE_NOTE_GUARDRAILS_PROMPT = `## Guardrails

- **Every segment must produce work.** Run the segment intent test (Decision → Task → Idea → Note) and emit exactly one primary object per segment.
- Never leave a segment with zero proposals. Never leave ordinary note text as no_action.
- **new_project requires Project + child.** When creating a new Project, always include a nested Task, Note, Idea, or Decision from the intent test. NEVER emit a Project alone.
- When the note has multiple independent subjects, segment them and run the intent test for each segment.
- Distinguish Task from Note from Idea from Decision — test each segment against all four before defaulting to Note.
- Projects and Tasks must be concrete. Do not create a Project or Task from speculative language — use Idea instead.
- Every Project, Task, Note, Idea, and Decision proposal requires a non-empty payload.title from ACT. Every segment requires a non-empty subject from SPLIT.
- Normalize removes proposals missing LLM titles; it never invents titles or child objects.
- New Project titles: segment subject or named entity — 2–6 words, max 40 characters. Not a sentence, not a note headline.
- Note subjects: journal entry headline — 2–6 words, max 50 characters. Never duplicate payload.content.
- Do not add a redundant Note alongside a Task when the Task alone captures an action item.
- Match each segment to the best catalog project (confidence >= 0.60 for existing_project).
- When no catalog project fits, new_project only for concrete work — not speculation.
- Do not invent project ids or task ids outside the provided catalog.`;
