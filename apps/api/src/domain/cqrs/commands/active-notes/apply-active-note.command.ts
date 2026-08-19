import type {
  ActiveNoteApplyObjectType,
  ActiveNoteApplyPayload,
  ActiveNoteApplyRequest,
  ActiveNoteApplyResult,
  AppliedActiveNoteObject,
} from "../../../active-notes/index.js";
import { ActiveNoteApplyError, assertApplyPayloadMatchesKind } from "../../../active-notes/index.js";
import { buildReviewSnapshot } from "../../../active-notes/history/build-review-snapshot.js";
import type { IActiveNoteSessionRepository } from "../../../interfaces/active-note-session-repository.js";
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
  if (payload.subject?.trim()) return payload.subject.trim();
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

function resolveAttachToTaskId(
  operation: ActiveNoteApplyRequest["operations"][number]
): string | null {
  const attachmentId =
    operation.attachment?.type === "task"
      ? operation.attachment.id?.trim() || null
      : null;
  if (attachmentId) return attachmentId;

  const targetId = operation.targetObjectId?.trim() || null;
  if (!targetId) return null;

  if (operation.duplicateResolution !== "attach_existing") return null;

  const type = resolveObjectType(operation.payload, operation.objectType);
  return type === "task" ? targetId : null;
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

  constructor(
    private readonly commandBus: ICommandBus,
    private readonly sessions?: IActiveNoteSessionRepository
  ) {}

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

    const actionableOperations = selected.filter(
      (operation) => operation.payload.kind !== "no_action"
    );

    if (actionableOperations.length === 0) {
      throw new ActiveNoteApplyError(
        "No actionable operations to apply. All selected operations are marked as 'no action'.",
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

    console.log("[active-note.apply] start", {
      activeNoteId: command.input.activeNoteId ?? null,
      projectId: command.input.projectId ?? null,
      selected: ordered.map((operation) => ({
        operationId: operation.operationId,
        objectType: operation.objectType ?? null,
        kind: operation.payload.kind,
        selectedProjectId: operation.selectedProjectId ?? null,
        projectRef: operation.projectRef ?? null,
        hasAttachment: Boolean(operation.attachment?.id),
        duplicateResolution: operation.duplicateResolution ?? null,
      })),
    });

    for (const operation of ordered) {
      const startedAt = Date.now();
      try {
        console.log("[active-note.apply] operation.start", {
          operationId: operation.operationId,
          objectType: operation.objectType ?? null,
          kind: operation.payload.kind,
        });
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
        console.log("[active-note.apply] operation.ok", {
          operationId: operation.operationId,
          applied: result
            ? { id: result.id, type: result.type, action: result.action }
            : null,
          ms: Date.now() - startedAt,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to apply proposal";
        console.error("[active-note.apply] operation.fail", {
          operationId: operation.operationId,
          objectType: operation.objectType ?? null,
          kind: operation.payload.kind,
          message,
          ms: Date.now() - startedAt,
          error,
        });
        failed.push({
          operationId: operation.operationId,
          message,
        });
      }
    }

    console.log("[active-note.apply] done", {
      applied: applied.length,
      failed: failed.length,
      partial: applied.length > 0 && failed.length > 0,
    });

    const status =
      applied.length === 0
        ? failed.length > 0
          ? "failed"
          : "completed"
        : "completed";

    const sessionId = command.input.activeNoteId?.trim() || "";
    const reviewSnapshot = buildReviewSnapshot({
      operations: command.input.operations.map((operation) => ({
        operationId: operation.operationId,
        title: payloadTitle(operation.payload),
        objectType: resolveObjectType(operation.payload, operation.objectType),
        selected: operation.selected,
        ignored: operation.duplicateResolution === "ignore",
      })),
      applied,
      failed,
      appliedAt: now,
    });

    if (sessionId && this.sessions) {
      try {
        await this.sessions.completeApply({
          sessionId,
          organizationId: command.orgId,
          userId: command.userId,
          reviewSnapshot,
          status,
        });
      } catch (error) {
        console.error("[active-note.apply] session persist failed", error);
      }
    }

    return {
      activeNote: {
        id: sessionId || crypto.randomUUID(),
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

    if (payload.kind !== "no_action") {
      assertApplyPayloadMatchesKind(payload);
    }

    if (payload.kind === "no_action") {
      return null;
    }

    const attachToTaskId = resolveAttachToTaskId(operation);
    if (
      operation.duplicateResolution === "attach_existing" ||
      attachToTaskId
    ) {
      if (attachToTaskId) {
        return this.createNote(
          command,
          {
            ...operation,
            attachment: { type: "task", id: attachToTaskId },
          },
          {
            ...payload,
            kind: "note",
            title:
              payload.subject?.trim() ||
              (payload.kind === "note" ? payload.title?.trim() : undefined) ||
              payload.title?.trim() ||
              "Active note",
            content:
              payload.content?.trim() ||
              payload.description?.trim() ||
              command.input.content?.trim() ||
              payload.title?.trim() ||
              "",
          },
          createdProjectByRef
        );
      }

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
      case "goal":
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
      payload.subject?.trim() ||
      payload.content?.trim().split(/\r?\n/)[0]?.trim().slice(0, 80) ||
      "Active note";
    const body =
      payload.content?.trim() ||
      payload.description?.trim() ||
      undefined;
    const linkToTaskId =
      operation.attachment?.type === "task"
        ? operation.attachment.id?.trim() || undefined
        : undefined;

    if (linkToTaskId && !linkToTaskId.length) {
      throw new Error("A task attachment requires a task id");
    }

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
          linkToTaskId,
        }
      )
    ).catch(async (error) => {
      if (
        linkToTaskId &&
        error instanceof Error &&
        error.message === "Task not found in project"
      ) {
        return this.commandBus.execute<AddNoteToProjectCommand, NoteNode | null>(
          new AddNoteToProjectCommand(
            command.userId,
            command.orgId,
            projectId,
            { title, body }
          )
        );
      }
      throw error;
    });

    if (!note) {
      throw new Error("Project not found");
    }

    return {
      id: note.id,
      type: "note",
      title: note.title,
      action: linkToTaskId ? "linked" : "created",
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
