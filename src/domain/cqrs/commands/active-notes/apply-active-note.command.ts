import type {
  ActiveNoteApplyObjectType,
  ActiveNoteApplyPayload,
  ActiveNoteApplyRequest,
  ActiveNoteApplyResult,
  AppliedActiveNoteObject,
} from "../../../active-notes/index.js";
import { ActiveNoteApplyError } from "../../../active-notes/index.js";
import type { SpydrPriority } from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";
import type { ICommandBus } from "../command-bus.js";
import {
  AddDecisionToProjectCommand,
  AddIdeaToProjectCommand,
  AddNoteToProjectCommand,
  AddTaskToProjectCommand,
  CreateProjectCommand,
} from "../projects/index.js";
import { CreatePersonCommand } from "../people/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { TaskNode } from "../../../models/tasks/index.js";
import type { NoteNode } from "../../../models/notes/index.js";
import type { DecisionNode } from "../../../models/decisions/index.js";
import type { IdeaNode } from "../../../models/ideas/index.js";
import type { PersonNode } from "../../../models/people/index.js";

const PRIORITIES = new Set(["low", "medium", "high"]);

function asPriority(value: unknown): SpydrPriority | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return PRIORITIES.has(normalized)
    ? (normalized as SpydrPriority)
    : undefined;
}

function objectHref(type: ActiveNoteApplyObjectType, id: string): string {
  switch (type) {
    case "project":
      return `/projects/${id}`;
    case "task":
      return `/tasks/${id}`;
    case "note":
      return `/notes/${id}`;
    case "decision":
      return `/decisions`;
    case "idea":
      return `/ideas`;
    case "person":
      return `/people/${id}`;
    case "goal":
      return `/projects/${id}`;
    case "relationship":
      return `/graph`;
    default:
      return "/notes";
  }
}

function payloadTitle(payload: ActiveNoteApplyPayload): string {
  if (payload.title?.trim()) return payload.title.trim();
  if (payload.name?.trim()) return payload.name.trim();
  if (payload.targetLabel?.trim()) return payload.targetLabel.trim();
  if (payload.kind === "no_action") return "No action";
  return "Untitled";
}

function resolveObjectType(
  payload: ActiveNoteApplyPayload,
  objectType?: ActiveNoteApplyObjectType | null
): ActiveNoteApplyObjectType | null {
  if (objectType) return objectType;
  if (payload.kind === "no_action" || payload.kind === "link") {
    return payload.kind === "link" ? "relationship" : null;
  }
  return payload.kind;
}

function resolveProjectId(
  payload: ActiveNoteApplyPayload,
  selectedProjectId: string | null | undefined,
  fallbackProjectId: string | null | undefined,
  projectRef?: string | null,
  createdProjectByRef?: Map<string, string>
): string | null {
  if (selectedProjectId?.trim()) return selectedProjectId.trim();
  if (payload.projectId?.trim()) return payload.projectId.trim();
  if (projectRef?.trim() && createdProjectByRef?.has(projectRef.trim())) {
    return createdProjectByRef.get(projectRef.trim()) ?? null;
  }
  return fallbackProjectId?.trim() || null;
}

export class ApplyActiveNoteCommand implements ICommand<ActiveNoteApplyResult> {
  static readonly commandType = "active-notes.apply";
  readonly commandType = ApplyActiveNoteCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ActiveNoteApplyRequest
  ) {}
}

export class ApplyActiveNoteCommandHandler
  implements ICommandHandler<ApplyActiveNoteCommand, ActiveNoteApplyResult>
{
  readonly commandType = ApplyActiveNoteCommand.commandType;

  constructor(private readonly commandBus: ICommandBus) {}

  async execute(command: ApplyActiveNoteCommand): Promise<ActiveNoteApplyResult> {
    const selected = command.input.operations.filter(
      (operation) =>
        operation.selected && operation.duplicateResolution !== "ignore"
    );

    if (selected.length === 0) {
      throw new ActiveNoteApplyError(
        "Select at least one proposal to apply",
        400
      );
    }

    const applied: AppliedActiveNoteObject[] = [];
    const failed: ActiveNoteApplyResult["failed"] = [];
    const now = new Date().toISOString();
    const createdProjectByRef = new Map<string, string>();

    // Create projects before dependents that use projectRef.
    const ordered = [...selected].sort((a, b) => {
      const aProject =
        a.objectType === "project" || a.payload.kind === "project" ? 0 : 1;
      const bProject =
        b.objectType === "project" || b.payload.kind === "project" ? 0 : 1;
      return aProject - bProject;
    });

    for (const operation of ordered) {
      try {
        const result = await this.applyOne(
          command,
          operation,
          createdProjectByRef
        );
        if (result) {
          applied.push(result);
          if (
            result.type === "project" &&
            result.action === "created"
          ) {
            createdProjectByRef.set(operation.operationId, result.id);
          }
        }
      } catch (error) {
        failed.push({
          operationId: operation.operationId,
          message:
            error instanceof Error
              ? error.message
              : "Failed to apply proposal",
        });
      }
    }

    const status =
      applied.length === 0 && failed.length > 0 ? "failed" : "completed";

    return {
      activeNote: {
        id: command.input.activeNoteId?.trim() || crypto.randomUUID(),
        content: command.input.content ?? "",
        projectId: command.input.projectId ?? null,
        status,
        createdAt: now,
        updatedAt: now,
      },
      applied,
      failed,
      partial: applied.length > 0 && failed.length > 0,
    };
  }

  private async applyOne(
    command: ApplyActiveNoteCommand,
    operation: ActiveNoteApplyRequest["operations"][number],
    createdProjectByRef: Map<string, string>
  ): Promise<AppliedActiveNoteObject | null> {
    const payload = operation.payload;

    if (payload.kind === "no_action") {
      return null;
    }

    if (operation.duplicateResolution === "attach_existing") {
      const targetId = operation.targetObjectId?.trim();
      const type = resolveObjectType(payload, operation.objectType);
      if (!targetId || !type) {
        throw new Error(
          "Cannot attach to an existing object without a target"
        );
      }
      return {
        id: targetId,
        type,
        title: payloadTitle(payload),
        action: "updated",
        href: objectHref(type, targetId),
      };
    }

    if (payload.kind === "link") {
      throw new Error("Linking suggestions are not available yet");
    }

    if (payload.kind === "goal") {
      throw new Error("Goals are not supported yet");
    }

    const type = resolveObjectType(payload, operation.objectType);
    if (!type) {
      throw new Error("Unsupported proposal type");
    }

    switch (type) {
      case "project":
        return this.createProject(command, payload);
      case "person":
        return this.createPerson(command, payload);
      case "task":
        return this.createTask(command, operation, payload, createdProjectByRef);
      case "note":
        return this.createNote(command, operation, payload, createdProjectByRef);
      case "decision":
        return this.createDecision(
          command,
          operation,
          payload,
          createdProjectByRef
        );
      case "idea":
        return this.createIdea(command, operation, payload, createdProjectByRef);
      default:
        throw new Error(`Unsupported proposal type: ${type}`);
    }
  }

  private async createProject(
    command: ApplyActiveNoteCommand,
    payload: ActiveNoteApplyPayload
  ): Promise<AppliedActiveNoteObject> {
    const title = payload.title?.trim();
    if (!title) throw new Error("Project title is required");

    const project = await this.commandBus.execute<
      CreateProjectCommand,
      ProjectNode
    >(
      new CreateProjectCommand(command.userId, command.orgId, {
        title,
        body: payload.description?.trim() || undefined,
        priority: asPriority(payload.priority),
      })
    );

    return {
      id: project.id,
      type: "project",
      title: project.title,
      action: "created",
      href: objectHref("project", project.id),
    };
  }

  private async createPerson(
    command: ApplyActiveNoteCommand,
    payload: ActiveNoteApplyPayload
  ): Promise<AppliedActiveNoteObject> {
    const fullName = (payload.name ?? payload.title)?.trim();
    if (!fullName) throw new Error("Person name is required");

    const person = await this.commandBus.execute<
      CreatePersonCommand,
      PersonNode
    >(
      new CreatePersonCommand(command.userId, command.orgId, {
        fullName,
        body: payload.description?.trim() || undefined,
      })
    );

    return {
      id: person.id,
      type: "person",
      title: person.details?.fullName ?? person.title,
      action: "created",
      href: objectHref("person", person.id),
    };
  }

  private async createTask(
    command: ApplyActiveNoteCommand,
    operation: ActiveNoteApplyRequest["operations"][number],
    payload: ActiveNoteApplyPayload,
    createdProjectByRef: Map<string, string>
  ): Promise<AppliedActiveNoteObject> {
    const projectId = resolveProjectId(
      payload,
      operation.selectedProjectId,
      command.input.projectId,
      operation.projectRef,
      createdProjectByRef
    );
    if (!projectId) {
      throw new Error("A project is required to create this task");
    }

    const title = payload.title?.trim();
    if (!title) throw new Error("Task title is required");

    const task = await this.commandBus.execute<
      AddTaskToProjectCommand,
      TaskNode | null
    >(
      new AddTaskToProjectCommand(
        command.userId,
        command.orgId,
        projectId,
        {
          title,
          body: payload.description?.trim() || undefined,
          priority: asPriority(payload.priority),
          dueDate: payload.dueDate ?? null,
        }
      )
    );

    if (!task) {
      throw new Error("Project not found");
    }

    return {
      id: task.id,
      type: "task",
      title: task.title,
      action: "created",
      href: objectHref("task", task.id),
    };
  }

  private async createNote(
    command: ApplyActiveNoteCommand,
    operation: ActiveNoteApplyRequest["operations"][number],
    payload: ActiveNoteApplyPayload,
    createdProjectByRef: Map<string, string>
  ): Promise<AppliedActiveNoteObject> {
    const projectId = resolveProjectId(
      payload,
      operation.selectedProjectId,
      command.input.projectId,
      operation.projectRef,
      createdProjectByRef
    );
    if (!projectId) {
      throw new Error("A project is required to create this note");
    }

    const title =
      payload.title?.trim() ||
      payload.content?.trim().split(/\r?\n/)[0]?.trim().slice(0, 80) ||
      "Active note";
    const body =
      payload.content?.trim() ||
      payload.description?.trim() ||
      undefined;

    const note = await this.commandBus.execute<
      AddNoteToProjectCommand,
      NoteNode | null
    >(
      new AddNoteToProjectCommand(
        command.userId,
        command.orgId,
        projectId,
        {
          title,
          body,
        }
      )
    );

    if (!note) {
      throw new Error("Project not found");
    }

    return {
      id: note.id,
      type: "note",
      title: note.title,
      action: "created",
      href: objectHref("note", note.id),
    };
  }

  private async createDecision(
    command: ApplyActiveNoteCommand,
    operation: ActiveNoteApplyRequest["operations"][number],
    payload: ActiveNoteApplyPayload,
    createdProjectByRef: Map<string, string>
  ): Promise<AppliedActiveNoteObject> {
    const projectId = resolveProjectId(
      payload,
      operation.selectedProjectId,
      command.input.projectId,
      operation.projectRef,
      createdProjectByRef
    );
    if (!projectId) {
      throw new Error("A project is required to create this decision");
    }

    const title = payload.title?.trim();
    if (!title) throw new Error("Decision title is required");

    const decision = await this.commandBus.execute<
      AddDecisionToProjectCommand,
      DecisionNode | null
    >(
      new AddDecisionToProjectCommand(
        command.userId,
        command.orgId,
        projectId,
        {
          title,
          body: payload.description?.trim() || undefined,
          rationale: payload.rationale?.trim() || undefined,
        }
      )
    );

    if (!decision) {
      throw new Error("Project not found");
    }

    return {
      id: decision.id,
      type: "decision",
      title: decision.title,
      action: "created",
      href: objectHref("decision", decision.id),
    };
  }

  private async createIdea(
    command: ApplyActiveNoteCommand,
    operation: ActiveNoteApplyRequest["operations"][number],
    payload: ActiveNoteApplyPayload,
    createdProjectByRef: Map<string, string>
  ): Promise<AppliedActiveNoteObject> {
    const projectId = resolveProjectId(
      payload,
      operation.selectedProjectId,
      command.input.projectId,
      operation.projectRef,
      createdProjectByRef
    );
    if (!projectId) {
      throw new Error("A project is required to create this idea");
    }

    const title = payload.title?.trim();
    if (!title) throw new Error("Idea title is required");

    const idea = await this.commandBus.execute<
      AddIdeaToProjectCommand,
      IdeaNode | null
    >(
      new AddIdeaToProjectCommand(
        command.userId,
        command.orgId,
        projectId,
        {
          title,
          body: payload.description?.trim() || undefined,
        }
      )
    );

    if (!idea) {
      throw new Error("Project not found");
    }

    return {
      id: idea.id,
      type: "idea",
      title: idea.title,
      action: "created",
      href: objectHref("idea", idea.id),
    };
  }
}
