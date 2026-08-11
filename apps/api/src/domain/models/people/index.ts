import { DomainNode } from "../shared.js";
import type { IPersonDetailsProps, IPersonNodeProps } from "./interfaces.js";

export type { IPersonDetailsProps, IPersonNodeProps } from "./interfaces.js";

export class PersonDetails implements IPersonDetailsProps {
  fullName: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  readonly relationshipContext: string | null;
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

  private personDetails(): PersonDetails {
    if (!this.details) {
      throw new Error("Person details are required to update person fields");
    }

    return this.details;
  }
}
