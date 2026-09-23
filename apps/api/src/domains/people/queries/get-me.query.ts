import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IPersonViews } from "../views.js";
import type { PersonNode } from "../models/index.js";
import type { IOrganizationViews } from "../../organizations/views.js";
import type { OrganizationMemberRole } from "../../organizations/models/index.js";

export interface IMeView {
  userId: string;
  orgId: string;
  role: OrganizationMemberRole;
  person: PersonNode;
}

export class GetMeQuery implements IQuery<IMeView | null> {
  static readonly queryType = "people.me";
  readonly queryType = GetMeQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class GetMeQueryHandler implements IQueryHandler<GetMeQuery, IMeView | null> {
  readonly queryType = GetMeQuery.queryType;

  constructor(
    private readonly people: IPersonViews,
    private readonly organizations: IOrganizationViews
  ) {}

  async execute(query: GetMeQuery): Promise<IMeView | null> {
    const member = await this.organizations.getMemberByUserId(
      query.orgId,
      query.userId
    );
    if (!member?.personId) return null;

    const person = await this.people.getById(query.orgId, member.personId);
    if (!person) return null;

    return {
      userId: query.userId,
      orgId: query.orgId,
      role: member.role,
      person,
    };
  }
}
