export const ACTIVE_NOTE_GUARDRAILS_PROMPT = `## Guardrails

- Do not invent unsupported object types.
- Prefer supplied existing Projects when they are a clear contextual fit.
- When no supplied Project adequately covers a cohesive execution effort, suggest a new Project rather than orphaning Tasks, Decisions, or Ideas.
- Do not invent downstream Tasks, Notes, or other children beyond what the note supports.
- A single isolated problem or bug is not enough for a Project; several related execution signals about the same subject are.
- Do not invent project ids or task ids outside the provided context.
- Do not create a Person from vague references.
- When uncertain about extras, propose fewer objects.
- Never use Note as a default fallback.
- Do not require explicit "create a project" language or an application name before proposing a Project.`;
