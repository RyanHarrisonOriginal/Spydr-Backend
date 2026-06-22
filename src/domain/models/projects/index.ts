import { DomainNode, type SpydrPriority } from "../shared.js";
import type { IProjectDetailsProps, IProjectNodeProps } from "./interfaces.js";
import type { DecisionNode } from "../decisions/index.js";
import type { IdeaNode } from "../ideas/index.js";
import type { NoteNode } from "../notes/index.js";
import type { ResourceNode } from "../resources/index.js";
import type { TaskNode } from "../tasks/index.js";

export type { IProjectDetailsProps, IProjectNodeProps } from "./interfaces.js";

export class ProjectDetails implements IProjectDetailsProps {
  outcome: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  riskLevel: SpydrPriority;
  readonly lastActivityAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IProjectDetailsProps) {
    this.outcome = props.outcome;
    this.startDate = props.startDate;
    this.targetDate = props.targetDate;
    this.riskLevel = props.riskLevel;
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

  private touch(): void {
    this.updatedAt = new Date();
  }
}

export class ProjectNode extends DomainNode<"project"> {
  readonly details: ProjectDetails | null;
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

  private projectDetails(): ProjectDetails {
    if (!this.details) {
      throw new Error("Project details are required to update project fields");
    }

    return this.details;
  }
}
