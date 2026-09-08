export type OrganizationMemberRole = "owner" | "admin" | "member";

export interface IOrganizationProps {
  id: string;
  name: string;
  slug: string;
  role: OrganizationMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export class Organization {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly role: OrganizationMemberRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: IOrganizationProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.role = props.role;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
