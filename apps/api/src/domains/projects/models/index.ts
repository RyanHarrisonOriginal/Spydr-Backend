import {
  DomainNode,
  normalizeSpydrNodeStatus,
  normalizeSpydrPriority,
  type SpydrPriority,
  type SpydrNodeStatus,
  type TaskStatus,
} from "../../shared/models/shared.js";
import type { IProjectDetailsProps, IProjectNodeProps } from "./interfaces.js";
import type { IProjectPersonas } from "./personas.js";
import { emptyProjectPersonas } from "./personas.js";
import type { DecisionNode } from "../../decisions/models/index.js";
import type { IdeaNode } from "../../ideas/models/index.js";
import type { NoteNode } from "../../notes/models/index.js";
import type { ResourceNode } from "../../resources/models/index.js";
import type { TaskNode } from "../../tasks/models/index.js";
import type { ProjectChildKind, IUpdateProjectChildInput } from "./child.js";

export type { IProjectDetailsProps, IProjectNodeProps } from "./interfaces.js";
export type { ProjectChildKind, IUpdateProjectChildInput } from "./child.js";

export interface IProjectUpdateInput {
  title?: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  area?: string | null;
  startDate?: Date | null;
  targetDate?: Date | null;
  riskLevel?: SpydrPriority;
  requesterPersonNodeId?: string | null;
  assigneePersonNodeId?: string | null;
  sponsorPersonNodeId?: string | null;
  reviewerPersonNodeId?: string | null;
}

export class ProjectDetails implements IProjectDetailsProps {
  outcome: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  riskLevel: SpydrPriority;
  requesterPersonNodeId: string | null;
  assigneePersonNodeId: string | null;
  sponsorPersonNodeId: string | null;
  reviewerPersonNodeId: string | null;
  readonly lastActivityAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IProjectDetailsProps) {
    this.outcome = props.outcome;
    this.startDate = props.startDate;
    this.targetDate = props.targetDate;
    this.riskLevel = props.riskLevel;
    this.requesterPersonNodeId = props.requesterPersonNodeId;
    this.assigneePersonNodeId = props.assigneePersonNodeId;
    this.sponsorPersonNodeId = props.sponsorPersonNodeId;
    this.reviewerPersonNodeId = props.reviewerPersonNodeId;
    this.lastActivityAt = props.lastActivityAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setOutcome(outcome: string | null): void {
    this.outcome = outcome;
    this.touch();
  }

  setStartDate(startDate: Date | null): void {
    this.startDate = startDate;
    this.touch();
  }

  setTargetDate(targetDate: Date | null): void {
    this.targetDate = targetDate;
    this.touch();
  }

  setRiskLevel(riskLevel: SpydrPriority): void {
    this.riskLevel = riskLevel;
    this.touch();
  }

  setRequesterPersonNodeId(personNodeId: string | null): void {
    this.requesterPersonNodeId = personNodeId;
    this.touch();
  }

  setAssigneePersonNodeId(personNodeId: string | null): void {
    this.assigneePersonNodeId = personNodeId;
    this.touch();
  }

  setSponsorPersonNodeId(personNodeId: string | null): void {
    this.sponsorPersonNodeId = personNodeId;
    this.touch();
  }

  setReviewerPersonNodeId(personNodeId: string | null): void {
    this.reviewerPersonNodeId = personNodeId;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}

export class ProjectNode extends DomainNode<"project"> {
  details: ProjectDetails | null;
  readonly personas: IProjectPersonas | null;
  readonly tasks: TaskNode[];
  readonly decisions: DecisionNode[];
  readonly ideas: IdeaNode[];
  readonly notes: NoteNode[];
  readonly resources: ResourceNode[];
  readonly deletedTasks: TaskNode[];
  readonly deletedDecisions: DecisionNode[];
  readonly deletedIdeas: IdeaNode[];
  readonly deletedNotes: NoteNode[];
  readonly deletedResources: ResourceNode[];

  constructor(props: IProjectNodeProps) {
    super({ ...props, nodeType: "project" });
    this.details = props.details ? new ProjectDetails(props.details) : null;
    this.personas = props.personas ?? emptyProjectPersonas();
    this.tasks = props.tasks ?? [];
    this.decisions = props.decisions ?? [];
    this.ideas = props.ideas ?? [];
    this.notes = props.notes ?? [];
    this.resources = props.resources ?? [];
    this.deletedTasks = props.deletedTasks ?? [];
    this.deletedDecisions = props.deletedDecisions ?? [];
    this.deletedIdeas = props.deletedIdeas ?? [];
    this.deletedNotes = props.deletedNotes ?? [];
    this.deletedResources = props.deletedResources ?? [];
  }

  addProjectOwner(ownerNode: DomainNode<"person">): void {
    this.addRelationship("related_to", ownerNode, "Project owner");
  }

  addProjectMember(memberNode: DomainNode<"person">): void {
    this.addRelationship("related_to", memberNode, "Project member");
  }

  addProjectAdmin(adminNode: DomainNode<"person">): void {
    this.addRelationship("related_to", adminNode, "Project admin");
  }

  addProjectCreator(creatorNode: DomainNode<"person">): void {
    this.addRelationship("related_to", creatorNode, "Project creator");
  }

  addProjectEditor(editorNode: DomainNode<"person">): void {
    this.addRelationship("related_to", editorNode, "Project editor");
  }

  addNote(noteNode: NoteNode): void {
    this.addRelationship("related_to", noteNode, "Project note");
    this.notes.push(noteNode);
  }

  addNoteLinkedToTask(noteNode: NoteNode, taskId: string): void {
    const task = this.findTask(taskId);
    if (!task) {
      throw new Error("Task not found in project");
    }
    this.addNote(noteNode);
    noteNode.linkToTask(task);
  }

  findTask(taskId: string): TaskNode | undefined {
    return this.tasks.find((entry) => entry.id === taskId);
  }

  addTask(taskNode: TaskNode): void {
    this.addRelationship("related_to", taskNode, "Project task");
    this.tasks.push(taskNode);
  }

  addReference(referenceNode: ResourceNode): void {
    this.addRelationship("related_to", referenceNode, "Project reference");
    this.resources.push(referenceNode);
  }

  addIdea(ideaNode: IdeaNode): void {
    this.addRelationship("related_to", ideaNode, "Project idea");
    this.ideas.push(ideaNode);
  }

  addDecision(decisionNode: DecisionNode): void {
    this.addRelationship("related_to", decisionNode, "Project decision");
    this.decisions.push(decisionNode);
  }

  setOutcome(outcome: string | null): void {
    this.projectDetails().setOutcome(outcome);
  }

  setStartDate(startDate: Date | null): void {
    this.projectDetails().setStartDate(startDate);
  }

  setTargetDate(targetDate: Date | null): void {
    this.projectDetails().setTargetDate(targetDate);
  }

  setRiskLevel(riskLevel: SpydrPriority): void {
    this.projectDetails().setRiskLevel(riskLevel);
  }

  setRequesterPersonNodeId(personNodeId: string | null): void {
    this.projectDetails().setRequesterPersonNodeId(personNodeId);
  }

  setAssigneePersonNodeId(personNodeId: string | null): void {
    this.projectDetails().setAssigneePersonNodeId(personNodeId);
  }

  setSponsorPersonNodeId(personNodeId: string | null): void {
    this.projectDetails().setSponsorPersonNodeId(personNodeId);
  }

  setReviewerPersonNodeId(personNodeId: string | null): void {
    this.projectDetails().setReviewerPersonNodeId(personNodeId);
  }

  applyUpdate(input: IProjectUpdateInput, now = new Date()): void {
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Project title is required");
      }
      this.title = title;
    }
    if (input.body !== undefined) {
      this.body = input.body;
    }
    if (input.status !== undefined) {
      this.status = normalizeSpydrNodeStatus(input.status);
    }
    if (input.priority !== undefined) {
      this.priority = normalizeSpydrPriority(input.priority);
    }
    if (input.area !== undefined) {
      this.area = input.area;
    }

    const details = this.projectDetails();
    if (input.startDate !== undefined) {
      details.setStartDate(input.startDate);
    }
    if (input.targetDate !== undefined) {
      details.setTargetDate(input.targetDate);
    }
    if (input.riskLevel !== undefined) {
      details.setRiskLevel(normalizeSpydrPriority(input.riskLevel));
    }
    if (input.requesterPersonNodeId !== undefined) {
      details.setRequesterPersonNodeId(input.requesterPersonNodeId);
    }
    if (input.assigneePersonNodeId !== undefined) {
      details.setAssigneePersonNodeId(input.assigneePersonNodeId);
    }
    if (input.sponsorPersonNodeId !== undefined) {
      details.setSponsorPersonNodeId(input.sponsorPersonNodeId);
    }
    if (input.reviewerPersonNodeId !== undefined) {
      details.setReviewerPersonNodeId(input.reviewerPersonNodeId);
    }

    this.touch(now);
  }

  updateChild(
    kind: ProjectChildKind,
    childId: string,
    input: IUpdateProjectChildInput,
    now = new Date()
  ): DomainNode {
    const child = this.requireChild(kind, childId, false);

    switch (kind) {
      case "task": {
        const task = child as TaskNode;
        task.applyUpdate(
          {
            title: input.title,
            body: input.body,
            status: input.status as TaskStatus | undefined,
            priority: input.priority as TaskNode["priority"] | undefined,
            dueDate:
              input.dueDate !== undefined
                ? parseOptionalDate(input.dueDate, "Invalid task date")
                : undefined,
            estimatedMinutes: input.estimatedMinutes,
            assigneePersonNodeId: input.assigneePersonNodeId,
          },
          now
        );
        return task;
      }
      case "note": {
        const note = child as NoteNode;
        note.applyUpdate({ title: input.title, body: input.body }, now);
        return note;
      }
      case "decision": {
        const decision = child as DecisionNode;
        decision.applyUpdate(
          {
            title: input.title,
            body: input.body,
            rationale: input.rationale,
            impact: input.impact,
          },
          now
        );
        return decision;
      }
      case "idea": {
        const idea = child as IdeaNode;
        idea.applyUpdate({ title: input.title, body: input.body }, now);
        return idea;
      }
      case "resource": {
        if (input.title !== undefined) {
          const title = input.title.trim();
          if (!title) {
            throw new Error("Title is required");
          }
          child.title = title;
        }
        if (input.body !== undefined) {
          child.body = input.body.trim();
        }
        child.touch(now);
        return child;
      }
    }
  }

  softDeleteChild(kind: ProjectChildKind, childId: string, now = new Date()): DomainNode {
    const child = this.requireChild(kind, childId, false);
    child.softDelete(now);
    this.moveChildToDeleted(kind, child);
    return child;
  }

  restoreChild(kind: ProjectChildKind, childId: string, now = new Date()): DomainNode {
    const child = this.requireChild(kind, childId, true);
    child.restore(now);
    this.moveChildFromDeleted(kind, child);
    return child;
  }

  private requireChild(
    kind: ProjectChildKind,
    childId: string,
    fromDeleted: boolean
  ): DomainNode {
    const list = this.childList(kind, fromDeleted);
    const child = list.find((entry) => entry.id === childId);
    if (!child) {
      throw new Error("Project child not found");
    }
    return child;
  }

  private childList(kind: ProjectChildKind, deleted: boolean): DomainNode[] {
    switch (kind) {
      case "task":
        return deleted ? this.deletedTasks : this.tasks;
      case "note":
        return deleted ? this.deletedNotes : this.notes;
      case "decision":
        return deleted ? this.deletedDecisions : this.decisions;
      case "idea":
        return deleted ? this.deletedIdeas : this.ideas;
      case "resource":
        return deleted ? this.deletedResources : this.resources;
    }
  }

  private moveChildToDeleted(kind: ProjectChildKind, child: DomainNode): void {
    this.removeFromList(this.childList(kind, false), child.id);
    this.childList(kind, true).push(child as never);
  }

  private moveChildFromDeleted(kind: ProjectChildKind, child: DomainNode): void {
    this.removeFromList(this.childList(kind, true), child.id);
    this.childList(kind, false).push(child as never);
  }

  private removeFromList(list: DomainNode[], id: string): void {
    const index = list.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  private projectDetails(): ProjectDetails {
    if (!this.details) {
      throw new Error("Project details are required to update project fields");
    }

    return this.details;
  }
}

function parseOptionalDate(
  value: string | null | undefined,
  errorMessage: string
): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(errorMessage);
  }

  return date;
}
