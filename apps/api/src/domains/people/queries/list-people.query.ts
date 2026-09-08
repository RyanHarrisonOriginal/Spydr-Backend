import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IPersonViews } from "../views.js";
import type { PersonNode } from "../models/index.js";

export class ListPeopleQuery implements IQuery<PersonNode[]> {
  static readonly queryType = "people.list";
  readonly queryType = ListPeopleQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListPeopleQueryHandler
  implements IQueryHandler<ListPeopleQuery, PersonNode[]>
{
  readonly queryType = ListPeopleQuery.queryType;

  constructor(private readonly people: IPersonViews) {}

  execute(query: ListPeopleQuery): Promise<PersonNode[]> {
    return this.people.listByOrg(query.orgId);
  }
}
