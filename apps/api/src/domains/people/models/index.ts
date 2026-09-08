import {
  DomainNode,
  normalizeSpydrNodeStatus,
  normalizeSpydrPriority,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import type { IPersonDetailsProps, IPersonNodeProps } from "./interfaces.js";

export type { IPersonDetailsProps, IPersonNodeProps } from "./interfaces.js";

export interface IPersonUpdateInput {
  fullName?: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class PersonDetails implements IPersonDetailsProps {
  fullName: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  relationshipContext: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IPersonDetailsProps) {
    this.fullName = props.fullName;
    this.email = props.email;
    this.title = props.title;
    this.organization = props.organization;
    this.relationshipContext = props.relationshipContext;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setFullName(fullName: string): void {
    this.fullName = fullName;
    this.touch();
  }

  setEmail(email: string | null): void {
    this.email = email;
    this.touch();
  }

  setTitle(title: string | null): void {
    this.title = title;
    this.touch();
  }

  setOrganization(organization: string | null): void {
    this.organization = organization;
    this.touch();
  }

  setRelationshipContext(relationshipContext: string | null): void {
    this.relationshipContext = relationshipContext;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}

export class PersonNode extends DomainNode<"person"> {
  readonly details: PersonDetails | null;

  constructor(props: IPersonNodeProps) {
    super({ ...props, nodeType: "person" });
    this.details = props.details ? new PersonDetails(props.details) : null;
  }

  addToProject(projectNode: DomainNode<"project">): void {
    this.addRelationship("related_to", projectNode, "Project member");
  }

  addToTask(taskNode: DomainNode<"task">): void {
    this.addRelationship("related_to", taskNode, "Task member");
  }

  setFullName(fullName: string): void {
    this.personDetails().setFullName(fullName);
    this.title = fullName;
    this.touch();
  }

  setEmail(email: string | null): void {
    this.personDetails().setEmail(email);
  }

  setTitle(title: string | null): void {
    this.personDetails().setTitle(title);
  }

  setOrganization(organization: string | null): void {
    this.personDetails().setOrganization(organization);
  }

  applyUpdate(input: IPersonUpdateInput, now = new Date()): void {
    const details = this.personDetails();

    if (input.fullName !== undefined) {
      const fullName = input.fullName.trim();
      if (!fullName) {
        throw new Error("Person full name is required");
      }
      details.setFullName(fullName);
      this.title = fullName;
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
    if (input.email !== undefined) {
      details.setEmail(nullableTrim(input.email));
    }
    if (input.title !== undefined) {
      details.setTitle(nullableTrim(input.title));
    }
    if (input.organization !== undefined) {
      details.setOrganization(nullableTrim(input.organization));
    }
    if (input.relationshipContext !== undefined) {
      details.setRelationshipContext(nullableTrim(input.relationshipContext));
    }

    this.touch(now);
  }

  private personDetails(): PersonDetails {
    if (!this.details) {
      throw new Error("Person details are required to update person fields");
    }

    return this.details;
  }
}

function nullableTrim(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
