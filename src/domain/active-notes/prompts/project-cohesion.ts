export const ACTIVE_NOTE_PROJECT_COHESION_PROMPT = `## NEW PROJECT COHESION TEST

Before returning disconnected proposals, idea_only, projectless objects, or no_action, evaluate whether the Active Note describes one cohesive execution effort.

Apply this test:

1. Identify the central subject of the Active Note.
2. Group statements that refer to the same feature, outcome, initiative, problem, or body of work.
3. Identify execution signals within that group:
   - progress already made,
   - remaining problems,
   - desired changes,
   - Decisions,
   - explicit or implied Tasks,
   - future enhancements.
4. Ask whether these elements would be more useful when managed together under one execution container.
5. Ask whether the effort will likely require multiple actions or persist beyond a single task.
6. If yes, and no existing Project covers the subject, route to new_project.

### Central-subject inference

Infer the central subject from repeated nouns, feature names, system components, technical concepts, outcomes, and related actions.

The subject does not need to include the parent application name.

For example, repeated references to:

- Active Note analyze endpoint,
- routing,
- project and task matching,
- modular prompt sections,
- note attachment,
- project summaries,

may together describe one Active Note intelligence and routing initiative even when "Spydr" is not explicitly stated.

### Strong new-Project signals

Strong new-Project signals include:

- multiple distinct Tasks serving one outcome,
- completed first steps plus substantial remaining work,
- a system or process with several parts needing coordinated improvement,
- a committed Decision with downstream implementation work,
- a current deficiency requiring more than one change,
- a feature or initiative discussed through progress, architecture, Tasks, and future extensions,
- ongoing work that has not yet been formally organized,
- language indicating implementation, migration, launch, redesign, improvement, rollout, or development.

### Signals that are not enough alone

Do not create a Project solely because the input contains:

- one isolated Task,
- one casual observation,
- one small bug,
- one vague possibility,
- one reminder,
- one question,
- or one problem with no broader execution effort.

### Existing versus new Project

Prefer an existing Project when the Active Note materially fits one supplied in context.

Suggest a new Project only when:

- no existing Project adequately covers the subject,
- the input describes a coherent body of work,
- and multiple execution objects would benefit from being organized together.

Do not create a redundant child Project merely because a note contains several sentences.

### IDEA VERSUS PROJECT

An Idea is an uncommitted possibility.

A Project is a committed or actively developing execution effort.

Possible Idea language:

- maybe,
- could,
- what if,
- someday,
- explore,
- consider.

Possible Project language or evidence:

- work has already started,
- a component is already working,
- the user describes remaining implementation,
- the user has made a Decision,
- the user states the next thing that must be done,
- several related changes are required,
- the effort has a clear outcome.

An Active Note may contain an Idea inside a broader Project.

Do not route the entire note to idea_only when the note also contains evidence of active implementation and committed next work.

### Contrast examples

Single Task (not a Project by itself):
Input: "Fix the validation error in the Active Note endpoint."
Expected: Task that still needs a Project home if unmatched — do not invent a broad initiative Project from this sentence alone when it is only one isolated fix. Prefer attaching to an existing Project if one fits; otherwise a narrow Project only if needed to host that Task is acceptable, but do not expand scope.

Idea only:
Input: "Maybe Active Notes could use voice input someday."
Expected: Idea; no new Project unless there is other execution commitment.

Ongoing cohesive effort (no existing Project):
Input: "The endpoint works, but routing is weak. I decided to keep one model call. Next I need to improve project matching and task attachment."
Expected: new_project with Tasks and Decision under it.

Existing Project supplied:
When a candidate Project already covers the Active Note effort → route existing_project; do not propose a new Project.

### Regression example (implied cohesive Project)

Input (no app name required):
"The Active Note analyze endpoint is working now, but the routing still feels too generic.

I want the system to first check whether the note belongs to an existing project, then look for any open task that the note is updating before it creates anything new.

I decided to keep this as one model call with modular prompt sections instead of splitting it into multiple agents.

Next, I need to improve the prompt so notes attach to the correct task or project instead of becoming generic note records.

Maybe later Active Notes could also update project summaries automatically."

Expected routing: new_project (when no supplied Project covers this subject).
Expected package shape:
- Project title like "Improve Active Note Routing" or "Active Note Intelligence"
- Task: improve project and open-task routing
- Task: improve note attachment to the correct project or task
- Decision: use one model call with modular prompt sections
- Idea: automatically update project summaries from Active Notes
- All children use parent.projectRef to the proposed Project
- Do not require the user to say "Spydr" or "create a project"`;
