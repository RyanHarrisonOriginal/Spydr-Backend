export const ACTIVE_NOTE_SEGMENTATION_PROMPT = `## SPLIT

Split the Active Note into independent subject segments when needed.

A segment is one contiguous span of the user note about a single project, organization, workstream, or distinct execution context.

Split when the note contains independent subjects — for example distinct projects, clients, audits, or handoffs that do not elaborate one another.

Do not split:
- elaborations, details, or follow-ons about the same subject,
- mere list formatting within one initiative,
- or short notes with only one central subject.

Use paragraph or sentence boundaries as hints, not as a hard rule.

Rules:
- Always emit at least 1 segment.
- Emit 1 segment when the note has a single subject.
- Emit 2+ segments only when subjects are independently actionable.
- Cap at 5 segments; merge the weakest leftovers into the closest subject if needed.
- Each segment needs:
  - ref: unique string (seg_1, seg_2, …)
  - text: exact contiguous span copied from the user note
  - subject: short label for that context (required, non-empty — e.g. "Vital Pak", "ABL Automation")
- Segment texts should cover the meaningful content of the note without inventing wording.
- Do not assign projects during SPLIT — matching happens in the next stage.

Example (three independent subjects):
Input:
"Currently waiting for QuickBooks data to become available for Vital Pak

ABL Automation has taken a back seat to other audits for Hilco and KPMG

Kai Li will take over customer business review from Joe"

Expected segments:
- seg_1 subject "Vital Pak" — QuickBooks data wait
- seg_2 subject "ABL Automation" — deprioritized for other audits
- seg_3 subject "Customer business review" — Kai Li / Joe handoff`;
