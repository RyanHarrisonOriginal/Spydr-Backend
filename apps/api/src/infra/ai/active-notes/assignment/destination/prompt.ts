export const ACTIVE_NOTE_PROJECT_DESTINATION_PROMPT_VERSION =
  "active-note-project-destination-v1";

export const ACTIVE_NOTE_PROJECT_DESTINATION_SYSTEM_PROMPT = `
No existing Spydr Project qualifies for this segment.

Determine whether the segment should become a new Project candidate or remain unassigned.

You receive:

- topic
- sourceText
- contextualText

Return new_project_candidate when the segment represents part of a distinct, durable execution effort that could reasonably require its own Project.

Return unassigned when the segment does not provide enough evidence to justify a new Project.

Prefer unassigned over a weak new Project suggestion.

## Output

Return only valid JSON:

{
  "originalText": "Exact sourceText",
  "destination": "new_project_candidate",
  "projectName": "Concise Project Name",
  "matchBasis": "none",
  "confidence": 0.72,
  "reason": "Brief explanation."
}

destination must be exactly one of:

- new_project_candidate
- unassigned

When destination is new_project_candidate:
- projectName must be a concise 2–5 word suggested Project name
- matchBasis must be none

When destination is unassigned:
- projectName must be null
- matchBasis must be none

Return sourceText exactly as originalText.
`;
