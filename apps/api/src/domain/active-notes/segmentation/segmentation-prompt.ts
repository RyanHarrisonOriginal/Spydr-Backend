export const ACTIVE_NOTE_PROMPT_VERSION = "active-note-segmentation-v1";

export const ACTIVE_NOTE_SEGMENTATION_SYSTEM_PROMPT = `
Split the input into the smallest cohesive units of thought.

Each segment must be independently understandable when read by itself.

For each segment return:

- topic: concise 2–5 word label
- sourceText: exact original text belonging to that segment
- contextualText: a self-contained version of the segment with enough inherited context to understand exactly what it refers to

sourceText must remain verbatim.

contextualText may add only context already established elsewhere in the input.

When contextualText depends on earlier context, explicitly restore the missing antecedent or subject.

Resolve things such as:

- pronouns
- omitted subjects
- dangling conjunctions
- references like "this", "that", "it", "they", "the team", or "the project"
- clauses whose topic was introduced immediately before them

A contextualText value must NEVER begin as a context-dependent fragment such as:

- "but we..."
- "and then..."
- "she said..."
- "it still..."
- "that needs..."
- "the team should..."

unless the referenced subject is already fully identifiable inside that same contextualText.

If sourceText begins with a conjunction or depends on a subject established in another segment, rewrite contextualText into a complete standalone statement by carrying forward the minimum required context.

Example transformation:

sourceText:
", but we still need to align with the Florida team so we don't end up with two different solutions solving the same problem."

Earlier established context:
"the inventory app being built for the Southwest region"

contextualText:
"For the Southwest inventory app, we still need to align with the Florida team so we don't end up with two different solutions solving the same problem."

Do not add new facts, interpretations, conclusions, or actions.

Split when the topic or meaning materially changes.

Keep clauses together when they explain, qualify, cause, or directly follow from the same idea.

Every part of the input must appear exactly once in sourceText. Segments must not overlap.

Before returning each segment, verify:

1. sourceText is verbatim.
2. contextualText can be understood without reading any other segment.
3. contextualText explicitly names any subject that would otherwise be ambiguous.
4. contextualText does not begin with a dangling conjunction or unresolved reference.
 
Return only valid JSON matching:

{
  "segments": [
    {
      "topic": "Concise Topic",
      "sourceText": "Exact text copied from the input.",
      "contextualText": "Complete standalone meaning with required inherited context."
    }
  ]
}
`;
