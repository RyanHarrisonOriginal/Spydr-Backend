import { DomainNode } from "../../shared/models/shared.js";
import type { IDecisionDetailsProps, IDecisionNodeProps } from "./interfaces.js";

export type { IDecisionDetailsProps, IDecisionNodeProps } from "./interfaces.js";

export class DecisionDetails implements IDecisionDetailsProps {
  rationale: string;
  impact: string;
  readonly decidedAt: Date;
  readonly supersedesDecisionNodeId: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IDecisionDetailsProps) {
    this.rationale = props.rationale;
    this.impact = props.impact;
    this.decidedAt = props.decidedAt;
    this.supersedesDecisionNodeId = props.supersedesDecisionNodeId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setRationale(rationale: string, now = new Date()): void {
    this.rationale = rationale;
    this.updatedAt = now;
  }

  setImpact(impact: string, now = new Date()): void {
    this.impact = impact;
    this.updatedAt = now;
  }
}

export class DecisionNode extends DomainNode<"decision"> {
  details: DecisionDetails | null;

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

  applyUpdate(
    input: {
      title?: string;
      body?: string;
      rationale?: string;
      impact?: string;
    },
    now = new Date()
  ): void {
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Decision title is required");
      }
      this.title = title;
    }
    if (input.body !== undefined) {
      this.body = input.body.trim();
    }

    const details = this.ensureDetails(now);
    if (input.rationale !== undefined) {
      details.setRationale(input.rationale.trim(), now);
    }
    if (input.impact !== undefined) {
      details.setImpact(input.impact.trim(), now);
    }

    this.touch(now);
  }

  private ensureDetails(now = new Date()): DecisionDetails {
    if (!this.details) {
      this.details = new DecisionDetails({
        rationale: this.body,
        impact: "",
        decidedAt: now,
        supersedesDecisionNodeId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    return this.details;
  }
}
