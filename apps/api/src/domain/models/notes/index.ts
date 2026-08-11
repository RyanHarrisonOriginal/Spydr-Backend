import { DomainNode } from "../shared.js";
import type { INoteNodeProps } from "./interfaces.js";

export type { INoteNodeProps } from "./interfaces.js";

export class NoteNode extends DomainNode<"note"> {
  readonly details: null;

  constructor(props: INoteNodeProps) {
    super({ ...props, nodeType: "note" });
    this.details = null;
  }

  linkToProject(projectNode: DomainNode<"project">): void {
    this.addRelationship("related_to", projectNode, "Project note");
  }

  linkToTask(taskNode: DomainNode<"task">): void {
    this.addRelationship("related_to", taskNode, "Task note");
  }

  linkToResource(resourceNode: DomainNode<"resource">): void {
    this.addRelationship("related_to", resourceNode, "Resource note");
  }

  linkToIdea(ideaNode: DomainNode<"idea">): void {
    this.addRelationship("related_to", ideaNode, "Idea note");
  }

}
