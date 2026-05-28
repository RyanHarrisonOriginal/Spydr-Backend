import { DomainNode, type SpydrPriority } from "../shared.js";
import type { IIdeaDetailsProps, IIdeaNodeProps } from "./interfaces.js";

export type { IIdeaDetailsProps, IIdeaNodeProps } from "./interfaces.js";

export class IdeaDetails implements IIdeaDetailsProps {
  confidence: number | null;
  potentialValue: SpydrPriority;
  promotedToProjectNodeId: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IIdeaDetailsProps) {
    this.confidence = props.confidence;
    this.potentialValue = props.potentialValue;
    this.promotedToProjectNodeId = props.promotedToProjectNodeId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setConfidence(confidence: number | null): void {
    this.confidence = confidence;
    this.touch();
  }

  setPotentialValue(potentialValue: SpydrPriority): void {
    this.potentialValue = potentialValue;
    this.touch();
  }

  setPromotedToProjectNodeId(promotedToProjectNodeId: string | null): void {
    this.promotedToProjectNodeId = promotedToProjectNodeId;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}

export class IdeaNode extends DomainNode<"idea"> {
  readonly details: IdeaDetails | null;

  constructor(props: IIdeaNodeProps) {
    super({ ...props, nodeType: "idea" });
    this.details = props.details ? new IdeaDetails(props.details) : null;
  }

  addIdeaOwner(ownerNode: DomainNode<"person">): void {
    this.addRelationship("related_to", ownerNode, "Idea owner");
  }

  linkToProject(projectNode: DomainNode<"project">): void {
    this.addRelationship("related_to", projectNode, "Project idea");
  }

  linkToTask(taskNode: DomainNode<"task">): void {
    this.addRelationship("related_to", taskNode, "Task idea");
  }

  linkToResource(resourceNode: DomainNode<"resource">): void {
    this.addRelationship("related_to", resourceNode, "Resource idea");
  }

  setConfidence(confidence: number | null): void {
    this.ideaDetails().setConfidence(confidence);
  }

  setPotentialValue(potentialValue: SpydrPriority): void {
    this.ideaDetails().setPotentialValue(potentialValue);
  }

  setPromotedToProjectNodeId(promotedToProjectNodeId: string | null): void {
    this.ideaDetails().setPromotedToProjectNodeId(promotedToProjectNodeId);
  }

  private ideaDetails(): IdeaDetails {
    if (!this.details) {
      throw new Error("Idea details are required to update idea fields");
    }

    return this.details;
  }
}
