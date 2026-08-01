# Active Note analyze

`POST /api/active-notes/analyze`

Routes unstructured Active Note text into Spydr’s execution structure. One model call performs three conceptual stages: **ROUTE → INTERPRET → PLAN**.

## Request

```json
{
  "content": "Last night the taller guy caught every naked teep I threw.",
  "projectId": "proj-muay-thai"
}
```

`projectId` is optional. When omitted, the backend selects up to five candidate projects (token overlap + open-task boost) and hydrates each with open tasks / recent notes / decisions / ideas.

## Response shape

```ts
{
  routing: {
    destination: "existing_project" | "new_project" | "idea_only" | "no_action";
    projectId?: string | null;
    relatedTaskId?: string | null;
    reason: string;
    confidence: number;
  };
  impact?: {
    type: "task_context" | "new_task" | "project_context" | "decision" | "idea" | "mixed";
    reason: string;
  } | null;
  summary: string;
  proposals: Array<{
    ref: string;
    operationType: "create" | "suggest_create" | "attach_context" | "no_action";
    objectType: "project" | "task" | "note" | "decision" | "idea" | "person";
    parent?: { projectId?: string | null; projectRef?: string | null } | null;
    attachment?: { type: "project" | "task"; id?: string | null; ref?: string | null } | null;
    payload: { title?: string; description?: string; content?: string; rationale?: string; name?: string; priority?: "low"|"medium"|"high"; dueDate?: string | null };
    explicitlyStated: boolean;
    confidence: number;
    evidence: string[];
    reason: string;
    requiresProject?: boolean;
    suggestedProjectId?: string | null;
  }>;
  candidateProjects: Array<{ id: string; title: string; relevanceReason?: string }>;
  warnings: string[];
}
```

Normalization converts `attach_context` into a Note `create` while preserving `attachment` (task/project). Notes are not stored against tasks in Prisma today; `attachment.type = "task"` is retained for UI / future linking via `related_to`.

## Example: existing project + task context

```json
{
  "routing": {
    "destination": "existing_project",
    "projectId": "proj-muay-thai",
    "relatedTaskId": "task-teep",
    "reason": "Updates the open teep practice task",
    "confidence": 0.91
  },
  "impact": {
    "type": "task_context",
    "reason": "Observation supports an existing open task"
  },
  "summary": "Sparring observation attached to existing teep practice work.",
  "proposals": [
    {
      "ref": "note_1",
      "operationType": "create",
      "objectType": "note",
      "parent": { "projectId": "proj-muay-thai", "projectRef": null },
      "attachment": { "type": "task", "id": "task-teep", "ref": null },
      "payload": {
        "title": "Naked teeps caught by taller opponent",
        "content": "Last night the taller guy caught every naked teep I threw."
      },
      "explicitlyStated": true,
      "confidence": 0.93,
      "evidence": ["caught every naked teep"],
      "reason": "Progress note for existing task",
      "requiresProject": true,
      "suggestedProjectId": "proj-muay-thai"
    }
  ],
  "candidateProjects": [
    { "id": "proj-muay-thai", "title": "Muay Thai Development", "relevanceReason": "Selected project for this note" }
  ],
  "warnings": []
}
```

## Example: new project package

```json
{
  "routing": {
    "destination": "new_project",
    "projectId": null,
    "relatedTaskId": null,
    "reason": "Distinct multi-step lead-teep program",
    "confidence": 0.9
  },
  "impact": null,
  "summary": "Cohesive new project with directly supported initial tasks.",
  "proposals": [
    {
      "ref": "project_1",
      "operationType": "suggest_create",
      "objectType": "project",
      "parent": null,
      "attachment": null,
      "payload": {
        "title": "Eight-Week Lead Teep Development",
        "description": "Build an eight-week plan to make the lead teep reliable."
      },
      "explicitlyStated": true,
      "confidence": 0.9,
      "evidence": ["eight-week", "lead teep"],
      "reason": "Durable multi-step training outcome",
      "requiresProject": false,
      "suggestedProjectId": null
    },
    {
      "ref": "task_1",
      "operationType": "suggest_create",
      "objectType": "task",
      "parent": { "projectId": null, "projectRef": "project_1" },
      "attachment": null,
      "payload": { "title": "Drill jab-to-teep entries" },
      "explicitlyStated": true,
      "confidence": 0.9,
      "evidence": ["jab-to-teep"],
      "reason": "Directly stated initial task",
      "requiresProject": true,
      "suggestedProjectId": null
    }
  ],
  "candidateProjects": [],
  "warnings": []
}
```

## Prompt modules

Composed from:

- `src/domain/active-notes/prompts/domain.ts`
- `routing.ts`
- `object-definitions.ts`
- `project-cohesion.ts`
- `planning.ts`
- `guardrails.ts`

Prompt version: `active-note-v3`.

## Routing policy (v3)

1. Use `existing_project` only when a supplied candidate **adequately covers** the note’s subject.
2. Otherwise run the **NEW PROJECT COHESION TEST**: if several related execution signals share one central subject, route to `new_project` even when the user never says “create a project” or names the parent app.
3. Under that new Project, add Tasks / Decisions / Ideas / Notes **only when the note needs them**.
4. Nest Ideas inside a Project when the note also shows active implementation; do not send the whole note to `idea_only`.
5. Never use Note as a default fallback.

## Regression: implied cohesive Project

Input (no “Spydr app” label required):

```text
The Active Note analyze endpoint is working now, but the routing still feels too generic.

I want the system to first check whether the note belongs to an existing project, then look for any open task that the note is updating before it creates anything new.

I decided to keep this as one model call with modular prompt sections instead of splitting it into multiple agents.

Next, I need to improve the prompt so notes attach to the correct task or project instead of becoming generic note records.

Maybe later Active Notes could also update project summaries automatically.
```

Expected shape (wording may vary):

```json
{
  "routing": {
    "destination": "new_project",
    "reason": "The note describes an ongoing Active Note improvement effort with completed progress, a current routing problem, an architectural decision, concrete remaining work, and a future enhancement."
  },
  "summary": "Organize the ongoing work to improve Active Note routing and execution-aware content handling.",
  "proposals": [
    {
      "ref": "project_1",
      "operationType": "suggest_create",
      "objectType": "project",
      "payload": {
        "title": "Improve Active Note Routing",
        "description": "Improve how Active Notes identify relevant projects and tasks, attach contextual notes, and organize downstream execution."
      }
    },
    {
      "ref": "task_1",
      "operationType": "create",
      "objectType": "task",
      "parent": { "projectRef": "project_1" },
      "payload": { "title": "Improve project and open-task routing" }
    },
    {
      "ref": "task_2",
      "operationType": "create",
      "objectType": "task",
      "parent": { "projectRef": "project_1" },
      "payload": { "title": "Improve note attachment to the correct project or task" }
    },
    {
      "ref": "decision_1",
      "operationType": "create",
      "objectType": "decision",
      "parent": { "projectRef": "project_1" },
      "payload": { "title": "Use one model call with modular prompt sections" }
    },
    {
      "ref": "idea_1",
      "operationType": "create",
      "objectType": "idea",
      "parent": { "projectRef": "project_1" },
      "payload": { "title": "Automatically update project summaries from Active Notes" }
    }
  ]
}
```

### Contrast cases

| Input | Expected |
| --- | --- |
| `Fix the validation error in the Active Note endpoint.` | Isolated Task; not a broad new Project from that sentence alone |
| `Maybe Active Notes could use voice input someday.` | Idea; no new Project |
| `The endpoint works, but routing is weak. I decided to keep one model call. Next I need to improve project matching and task attachment.` | `new_project` when unmatched + Tasks/Decision |
| Same note when a covering candidate Project is supplied | `existing_project`; no new Project proposal |
