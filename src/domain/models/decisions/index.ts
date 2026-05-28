import { DomainNode } from "../shared.js";
import type { IDecisionDetailsProps, IDecisionNodeProps } from "./interfaces.js";

export type { IDecisionDetailsProps, IDecisionNodeProps } from "./interfaces.js";

export class DecisionDetails implements IDecisionDetailsProps {
  readonly rationale: string;
  readonly impact: string;
  readonly decidedAt: Date;
  readonly supersedesDecisionNodeId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: IDecisionDetailsProps) {
    this.rationale = props.rationale;
    this.impact = props.impact;
    this.decidedAt = props.decidedAt;
    this.supersedesDecisionNodeId = props.supersedesDecisionNodeId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export class DecisionNode extends DomainNode<"decision"> {
  readonly details: DecisionDetails | null;

  constructor(props: IDecisionNodeProps) {
    super({ ...props, nodeType: "decision" });
    this.details = props.details ? new DecisionDetails(props.details) : null;
  }

  linkToProject(projectNode: DomainNode<"project">): void {
    this.addRelationship("related_to", projectNode, "Project decision");
  }

  linkToTask(taskNode: DomainNode<"task">): void {
    this.addRelationship("related_to", taskNode, "Task decision");
  }

}
